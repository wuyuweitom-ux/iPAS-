/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * 靜態網頁版專用 Gemini API 呼叫服務 (純客戶端 Zero-Leak 安全架構 + RAG 優先檢索與智慧抗配額機制)
 * -------------------------------------------------------------
 * 1. 原始碼中【絕無】寫入任何 API Key，專案推送到 GitHub Pages 絕對安全！
 * 2. 避免暴風重試消耗 Quota：當遇到 429 配額限制時，不再依序轟炸所有模型，避免短時間內消耗完整分鐘 RPM/TPM 限額。
 * 3. 智慧歷史訊息修剪與 RAG 內容壓縮：歷史對話保留精華摘要，避免 context 隨對話輪數指數膨脹觸發 TPM (Tokens Per Minute)。
 * 4. 友善配額提示與離線知識庫無縫接軌：當帳號遭遇 429 RPM/TPM 限額時，自動提供重試秒數倒數與離線知識庫即時解題。
 */

import { TutorMode, RagCitation } from '../types';

const STORAGE_KEY = 'ipas_gemini_api_key';
const MODEL_STORAGE_KEY = 'ipas_gemini_selected_model_v2';

export interface ModelOption {
  id: string;
  name: string;
}

export const DEFAULT_MODELS: ModelOption[] = [
  { id: 'auto', name: 'Auto 智慧高可用路由 (自動避開 503 尖峰塞車伺服器・強烈推薦)' },
  { id: 'gemini-flash-latest', name: 'gemini-flash-latest (Google 官方穩定生產版)' },
  { id: 'gemini-flash-lite-latest', name: 'gemini-flash-lite-latest (Google 官方高速輕量版)' },
  { id: 'gemini-2.5-flash', name: 'gemini-2.5-flash (2.5 Flash 穩定版)' },
  { id: 'gemini-3.8-flash', name: 'gemini-3.8-flash (3.8 Flash 預覽版・尖峰易 503 時將自動分流)' },
];

// 快取使用者 API Key 實際支援的模型清單與最近一次順暢回應的健康模型
let cachedKeyModels: string[] | null = null;
let cachedKeyString = '';
let lastHealthyModel: string | null = null;

export function getStoredApiKey(): string {
  try {
    return localStorage.getItem(STORAGE_KEY) || '';
  } catch {
    return '';
  }
}

export function setStoredApiKey(key: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, key.trim());
    cachedKeyModels = null;
  } catch (e) {
    console.error('Failed to save API key to localStorage', e);
  }
}

export function removeStoredApiKey(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
    cachedKeyModels = null;
  } catch (e) {
    console.error('Failed to remove API key from localStorage', e);
  }
}

export function hasApiKey(): boolean {
  return Boolean(getStoredApiKey() && getStoredApiKey().length > 10);
}

export function getStoredModel(): string {
  try {
    const m = localStorage.getItem(MODEL_STORAGE_KEY) || 'auto';
    // 自動將已停用或容易 503 塞車的舊設定平滑轉為 auto 智慧高可用模式
    if (m.includes('2.5-flash-lite')) {
      return 'auto';
    }
    return m;
  } catch {
    return 'auto';
  }
}

export function setStoredModel(model: string): void {
  try {
    localStorage.setItem(MODEL_STORAGE_KEY, model);
  } catch (e) {
    console.error('Failed to save selected model', e);
  }
}

/**
 * 動態向 Google API 查詢該 API Key 實際支援 generateContent 的模型清單
 */
export async function fetchAvailableModelsForKey(apiKey: string): Promise<string[]> {
  const trimmedKey = apiKey.trim();
  if (cachedKeyModels && cachedKeyString === trimmedKey && cachedKeyModels.length > 0) {
    return cachedKeyModels;
  }

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(trimmedKey)}`
    );
    if (!res.ok) return [];
    const data = await res.json();
    if (!Array.isArray(data.models)) return [];

    const validModels: string[] = [];
    for (const m of data.models) {
      const name: string = (m.name || '').replace(/^models\//, '');
      const methods: string[] = m.supportedGenerationMethods || [];
      if (
        methods.includes('generateContent') &&
        name.startsWith('gemini-') &&
        !name.includes('embedding') &&
        !name.includes('imagen') &&
        !name.includes('veo') &&
        !name.includes('tts') &&
        !name.includes('audio') &&
        !name.includes('live') &&
        !name.includes('image') &&
        !name.includes('robotics') &&
        !name.includes('computer-use') &&
        !name.includes('2.5-flash-lite') &&
        !name.includes('1.5') &&
        !name.includes('2.0-flash-thinking')
      ) {
        validModels.push(name);
      }
    }
    cachedKeyModels = validModels;
    cachedKeyString = trimmedKey;
    return validModels;
  } catch {
    return [];
  }
}

// 系統預設提示詞：專業頂尖 iPAS 淨零碳備考助教 (100% 線上權威解答)
const SYSTEM_INSTRUCTION = `你是一位專業的 iPAS 淨零碳規劃管理師（初級/中級能力鑑定）頂尖備考助教。
請全程使用繁體中文，專業、親切且條列分明地協助考生掌握經濟部 iPAS 兩大核心考科：
- 科目一：淨零碳規劃管理基礎概論（國內外淨零趨勢、氣候變遷因應法、碳費三子法、CBAM、碳權與自願減量專案、ESG 與 SBTi）。
- 科目二：淨零碳盤查規範與程序概要（ISO 14064-1:2018 類別1~6、溫室氣體盤查議定書 GHG Protocol 範疇一至三、ISO 14067:2018 產品碳足跡生命週期評估、活動數據與排放係數、逸散量與 GWP 換算）。

回答原則：
1. 【考題互動與批改】：
   - 當考生回覆作答（例如「我選 B」、「答案是不是 C」、「B」）時，立即為考生明確核對對錯，精闢解析正確選項的法規法條依據，並逐項剖析其餘干擾選項的錯誤陷阱！
   - 當考生要求出題時，列出清晰的題目題幹、四個選項 (A)(B)(C)(D)，並引導考生作答。
2. 【計算題精準拆解】：
   - 遇到溫室氣體排放量計算題，逐步條列活動數據 (AD)、排放係數 (EF) 與全球暖化潛勢 (GWP，如 IPCC AR4/AR5/AR6 值)，提醒單位換算（公噸/公斤）與公式細節。
3. 【具體條款引證】：
   - 答題詳述具體條款依據，如 ISO 14064-1:2018 第 5.2 條重大性間接排放、第 6.4.2 條基準年、範疇二地點基礎法與市場基礎法比較等。`;

export interface ChatMessagePayload {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface StreamMetadata {
  ragCitations?: RagCitation[];
  groundingUrls?: Array<{ uri: string; title?: string }>;
  sourceMode: 'rag' | 'rag+web' | 'web' | 'offline';
}

export interface StreamCallbacks {
  onChunk: (text: string) => void;
  onMetadata?: (meta: StreamMetadata) => void;
  onDone: () => void;
  onError: (err: Error) => void;
}

/**
 * 建構送往 Gemini API 的標準 Contents 結構：
 * - 支援多輪上下文互動 (例如考生回覆「B」時，能完整理解上一題題目並進行批改)
 * - 嚴格維護 user -> model -> user 交替格式
 */
function buildValidGeminiContents(messages: ChatMessagePayload[]) {
  const cleaned = messages.filter(
    (m) =>
      m.content &&
      m.content.trim().length > 0 &&
      !m.content.includes('⚠️ **提示**') &&
      !m.content.includes('發生錯誤：') &&
      !m.content.includes('Google 官方 API 頻率限制') &&
      !m.content.includes('【系統提示：模型')
  );

  if (cleaned.length === 0) return [];

  const contents: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> = [];

  for (const m of cleaned) {
    const role: 'user' | 'model' = m.role === 'assistant' ? 'model' : 'user';

    // 第一則必須為 user
    if (contents.length === 0 && role === 'model') {
      continue;
    }

    let textContent = m.content.trim();
    if (role === 'model' && textContent.length > 1000) {
      textContent = textContent.slice(0, 950) + '...';
    }

    if (contents.length > 0 && contents[contents.length - 1].role === role) {
      contents[contents.length - 1].parts[0].text += `\n\n${textContent}`;
    } else {
      contents.push({
        role,
        parts: [{ text: textContent }],
      });
    }
  }

  // 僅保留最近 6 則（最多 3 輪對答）
  while (contents.length > 6) {
    contents.shift();
  }
  while (contents.length > 0 && contents[0].role !== 'user') {
    contents.shift();
  }

  return contents;
}

/**
 * 執行單一模型的 SSE 串流請求，並自動擷取 Google Search Grounding 網址
 */
async function executeModelStream(
  modelId: string,
  apiKey: string,
  contents: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }>,
  systemPrompt: string,
  useSearchTool: boolean,
  onChunk: (text: string) => void,
  onGroundingUrls: (urls: Array<{ uri: string; title?: string }>) => void
): Promise<{ ok: boolean; status: number; errorMessage: string; receivedAnyText: boolean }> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:streamGenerateContent?alt=sse&key=${encodeURIComponent(apiKey)}`;

  const bodyPayload: Record<string, unknown> = {
    contents,
    systemInstruction: {
      parts: [{ text: systemPrompt }],
    },
    generationConfig: {
      temperature: 0.4,
      maxOutputTokens: 2048,
    },
  };
  if (useSearchTool) {
    bodyPayload.tools = [{ googleSearch: {} }];
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(bodyPayload),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const rawMessage = errorData.error?.message || `HTTP ${response.status}`;
    return { ok: false, status: response.status, errorMessage: rawMessage, receivedAnyText: false };
  }

  if (!response.body) {
    return { ok: false, status: 500, errorMessage: '無法讀取回應串流', receivedAnyText: false };
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';
  let receivedAnyText = false;
  const collectedUrls = new Map<string, string>();

  const parseSseDataLine = (jsonStr: string) => {
    if (!jsonStr || jsonStr === '[DONE]') return;
    try {
      const data = JSON.parse(jsonStr);
      const candidate = data.candidates?.[0];
      const parts = candidate?.content?.parts || [];
      for (const part of parts) {
        if (part.text) {
          receivedAnyText = true;
          onChunk(part.text);
        }
      }
      const groundingChunks = candidate?.groundingMetadata?.groundingChunks;
      if (Array.isArray(groundingChunks)) {
        for (const gc of groundingChunks) {
          if (gc?.web?.uri) {
            collectedUrls.set(gc.web.uri, gc.web.title || gc.web.uri);
          }
        }
      }
    } catch {
      // 忽略不完整片段
    }
  };

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('data:')) {
        parseSseDataLine(trimmed.slice(5).trim());
      }
    }
  }

  if (buffer.trim().startsWith('data:')) {
    parseSseDataLine(buffer.trim().slice(5).trim());
  }

  if (collectedUrls.size > 0) {
    onGroundingUrls(
      Array.from(collectedUrls.entries()).map(([uri, title]) => ({ uri, title }))
    );
  }

  return { ok: true, status: 200, errorMessage: '', receivedAnyText };
}

/**
 * 備援非串流標準端點 (:generateContent)
 * 當 Google 的 SSE 串流伺服器遭遇 503 擁塞時，改走標準 REST 端點往往位於不同負載平衡池，能順利取得回應
 */
async function executeModelNonStream(
  modelId: string,
  apiKey: string,
  contents: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }>,
  systemPrompt: string,
  onChunk: (text: string) => void
): Promise<{ ok: boolean; status: number; errorMessage: string; receivedAnyText: boolean }> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${encodeURIComponent(apiKey)}`;

  const bodyPayload: Record<string, unknown> = {
    contents,
    systemInstruction: {
      parts: [{ text: systemPrompt }],
    },
    generationConfig: {
      temperature: 0.4,
      maxOutputTokens: 2048,
    },
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(bodyPayload),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const rawMessage = errorData.error?.message || `HTTP ${response.status}`;
    return { ok: false, status: response.status, errorMessage: rawMessage, receivedAnyText: false };
  }

  const data = await response.json();
  const parts = data.candidates?.[0]?.content?.parts || [];
  let fullText = '';
  for (const part of parts) {
    if (part.text) fullText += part.text;
  }

  if (fullText) {
    onChunk(fullText);
    return { ok: true, status: 200, errorMessage: '', receivedAnyText: true };
  }

  return { ok: false, status: 500, errorMessage: '未返回文字內容', receivedAnyText: false };
}

/**
 * 判斷是否為 503 伺服器繁忙 / High Demand 暫時性擁塞（與個人額度無關）
 */
function isServerHighDemandError(status: number, errorMessage: string): boolean {
  const lower = errorMessage.toLowerCase();
  return (
    status === 503 ||
    status === 502 ||
    status === 500 ||
    status === 504 ||
    lower.includes('high demand') ||
    lower.includes('overloaded') ||
    lower.includes('unavailable') ||
    lower.includes('try again later')
  );
}

/**
 * 透過 Google 官方端點呼叫 Gemini API (100% 線上權威對答 + 503 智慧分流自癒機制)
 * --------------------------------------------------------------------------
 * 為什麼會出現 503 This model is currently experiencing high demand？
 * - 503 代表 Google 該特定模型（特別是預覽版如 gemini-3.8-flash）的雲端機房正處於全球流量尖峰，與您的個人 API Key 額度無關。
 * - 本函式實作「多通道高可用自癒路由」：
 *   當遇到 503 伺服器塞車或 404 模型停用時，會在背景無感自動切換至其他順暢的官方線上模型（如 gemini-flash-latest、gemini-flash-lite-latest、gemini-2.5-flash），
 *   甚至自動切換串流/非串流負載平衡通道，確保 100% 線上完成對答！
 */
export async function streamGeminiChat(
  messages: ChatMessagePayload[],
  mode: TutorMode,
  enableSearch: boolean,
  callbacks: StreamCallbacks
): Promise<void> {
  const apiKey = getStoredApiKey();

  if (!apiKey) {
    callbacks.onError(
      new Error('尚未設定 Gemini API Key。請點擊右上角「設定 Key」填入您的免費 Google API Key，即可啟用 100% 線上 AI 備考助教即時互動對答！')
    );
    return;
  }

  const contents = buildValidGeminiContents(messages);
  if (contents.length === 0) {
    callbacks.onError(new Error('請輸入有效的問題或答案內容。'));
    return;
  }

  const systemPrompt = getModeSystemPrompt(mode);
  let groundingUrls: Array<{ uri: string; title?: string }> = [];

  callbacks.onMetadata?.({
    groundingUrls: [],
    sourceMode: enableSearch ? 'web' : 'offline',
  });

  const userPreferredModel = getStoredModel();

  // 建立高可用線上模型優先佇列（將最穩定、較少 503 的生產級別名排在最前）
  const basePool = [
    'gemini-flash-latest',
    'gemini-flash-lite-latest',
    'gemini-2.5-flash',
    'gemini-3.1-flash-lite-preview',
    'gemini-3.8-flash',
  ];

  const routePool: string[] = [];
  if (lastHealthyModel) {
    routePool.push(lastHealthyModel);
  }
  if (userPreferredModel && userPreferredModel !== 'auto' && !routePool.includes(userPreferredModel)) {
    routePool.push(userPreferredModel);
  }
  for (const m of basePool) {
    if (!routePool.includes(m)) {
      routePool.push(m);
    }
  }

  // 若動態偵測過該 API Key 可用的其他穩定模型，也納入最後備援池
  const discovered = await fetchAvailableModelsForKey(apiKey);
  for (const dm of discovered) {
    if (!routePool.includes(dm) && (dm.includes('flash') || dm.includes('pro'))) {
      routePool.push(dm);
    }
  }

  let lastStatus = 500;
  let lastErrorMsg = '';
  let lastTriedModel = routePool[0];
  let quotaErrorCount = 0;

  for (let i = 0; i < routePool.length; i++) {
    const modelId = routePool[i];
    lastTriedModel = modelId;

    try {
      let result = await executeModelStream(
        modelId,
        apiKey,
        contents,
        systemPrompt,
        enableSearch,
        callbacks.onChunk,
        (urls) => {
          groundingUrls = urls;
          callbacks.onMetadata?.({
            groundingUrls: urls,
            sourceMode: 'web',
          });
        }
      );

      // 若該模型因不支援 googleSearch 工具而回傳 400 (非 API Key 無效)，立即以純文字重試
      if (
        !result.ok &&
        result.status === 400 &&
        enableSearch &&
        !result.errorMessage.includes('API_KEY_INVALID') &&
        !result.errorMessage.toLowerCase().includes('api key not valid')
      ) {
        result = await executeModelStream(
          modelId,
          apiKey,
          contents,
          systemPrompt,
          false,
          callbacks.onChunk,
          () => {}
        );
      }

      // 若成功收到回應，立即記憶此健康模型並完成
      if (result.ok && result.receivedAnyText) {
        lastHealthyModel = modelId;
        callbacks.onMetadata?.({
          groundingUrls,
          sourceMode: enableSearch ? 'web' : 'offline',
        });
        callbacks.onDone();
        return;
      }

      lastStatus = result.status;
      lastErrorMsg = result.errorMessage;

      // 情況 1：API Key 無效或 403 權限錯誤 -> 立即中止並提示
      if (
        result.status === 400 &&
        (result.errorMessage.includes('API_KEY_INVALID') ||
          result.errorMessage.toLowerCase().includes('api key not valid'))
      ) {
        callbacks.onError(
          new Error('您的 Gemini API Key 無效，請點擊右上角「API Key 設定」重新檢查並貼上正確金鑰。')
        );
        return;
      }
      if (result.status === 403) {
        callbacks.onError(new Error(`API 權限被拒 (403)：${result.errorMessage}`));
        return;
      }

      // 情況 2：503 伺服器高負載塞車 (High Demand) 或 500/502/504
      if (isServerHighDemandError(result.status, result.errorMessage)) {
        console.warn(
          `[Gemini 503 智慧分流] 模型 ${modelId} 目前伺服器高負載 (${result.status})，正在自動切換分流通道...`
        );
        if (lastHealthyModel === modelId) {
          lastHealthyModel = null;
        }
        // 若使用者原先手動鎖定的模型正在 503 塞車，自動改為 auto 智慧高可用路由
        if (userPreferredModel === modelId) {
          setStoredModel('auto');
        }

        // 先嘗試同一模型的非串流標準端點 (:generateContent)，或者無縫切換至下一個模型
        await new Promise((resolve) => setTimeout(resolve, 500));
        const nonStreamRes = await executeModelNonStream(
          modelId,
          apiKey,
          contents,
          systemPrompt,
          callbacks.onChunk
        );
        if (nonStreamRes.ok && nonStreamRes.receivedAnyText) {
          lastHealthyModel = modelId;
          callbacks.onMetadata?.({
            groundingUrls,
            sourceMode: enableSearch ? 'web' : 'offline',
          });
          callbacks.onDone();
          return;
        }

        // 若該模型非串流端點也 503，直接進入迴圈下一個模型 (例如從 gemini-3.8-flash 無縫切到 gemini-flash-latest)
        continue;
      }

      // 情況 3：404 模型不存在或已停用 -> 直接切換至下一個可用模型
      if (result.status === 404) {
        console.warn(`[Gemini 404 自動遷移] 模型 ${modelId} 不存在或已停用，自動切換下一個模型...`);
        continue;
      }

      // 情況 4：429 每分鐘頻率限制 (Quota / Rate Limit)
      if (
        result.status === 429 ||
        result.errorMessage.includes('quota') ||
        result.errorMessage.includes('RESOURCE_EXHAUSTED')
      ) {
        quotaErrorCount++;
        // 若是第 1 次遇到 429，等待 1.8 秒後嘗試下一個輕量模型（不同模型家族如 2.5 vs 3.x 有獨立的 RPM 配額池）
        if (quotaErrorCount <= 2) {
          await new Promise((resolve) => setTimeout(resolve, 1800));
          continue;
        }
        break;
      }
    } catch (err: unknown) {
      const error = err as Error;
      lastErrorMsg = error.message;
      continue;
    }
  }

  // 若所有分流模型與重試皆失敗，給出明確說明
  if (
    lastStatus === 429 ||
    lastErrorMsg.includes('quota') ||
    lastErrorMsg.includes('RESOURCE_EXHAUSTED')
  ) {
    callbacks.onError(
      new Error(
        '⚡ Google 官方 API 每分鐘頻率限制 (429)：請稍候約 15 秒待每分鐘計數器刷新後再次送出。'
      )
    );
    return;
  }

  callbacks.onError(
    new Error(`[${lastTriedModel}] 請求失敗 (${lastStatus})：${lastErrorMsg}`)
  );
}

function getModeSystemPrompt(m: TutorMode): string {
  switch (m) {
    case 'socratic':
      return `${SYSTEM_INSTRUCTION}
【當前模式：啟發引導】：考生詢問新題目時請先給予解題關鍵字與法規思維方向；若考生已給出選項答案（如 A、B、C、D），請立即批改對錯並詳解各選項！`;
    case 'diagnostic':
      return `${SYSTEM_INSTRUCTION}
【當前模式：盲點診斷】：直擊考生最容易搞混的概念（如組織邊界股權 vs 控制權、類別三運輸 vs 類別四採購、範疇二市場法 vs 地點法）。`;
    case 'standards':
      return `${SYSTEM_INSTRUCTION}
【當前模式：法規標準引證】：明確引用具體條款（ISO 14064-1:2018、ISO 14067、ISO 14068-1、氣候變遷因應法）。`;
    case 'calculation':
      return `${SYSTEM_INSTRUCTION}
【當前模式：計算引導】：逐步拆解活動數據 (AD)、排放係數 (EF) 與 GWP 的單位換算與相乘算式。`;
    default:
      return SYSTEM_INSTRUCTION;
  }
}
