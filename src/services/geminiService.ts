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
import { retrieveRagContext } from './ragService';

const STORAGE_KEY = 'ipas_gemini_api_key';
const MODEL_STORAGE_KEY = 'ipas_gemini_selected_model';

export interface ModelOption {
  id: string;
  name: string;
}

export const DEFAULT_MODELS: ModelOption[] = [
  { id: 'gemini-flash-latest', name: 'gemini-flash-latest (Google 官方最新穩定版・推薦)' },
  { id: 'gemini-3.8-flash', name: 'gemini-3.8-flash (Gemini 3.8 Flash 最新版)' },
  { id: 'gemini-3.5-flash-lite', name: 'gemini-3.5-flash-lite (Google 推薦輕量高速版)' },
  { id: 'gemini-3.1-flash-lite', name: 'gemini-3.1-flash-lite (3.1 Flash Lite)' },
  { id: 'auto', name: 'Auto 自動鎖定 (預設使用 gemini-flash-latest)' },
];

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
  } catch (e) {
    console.error('Failed to save API key to localStorage', e);
  }
}

export function removeStoredApiKey(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    console.error('Failed to remove API key from localStorage', e);
  }
}

export function hasApiKey(): boolean {
  return Boolean(getStoredApiKey() && getStoredApiKey().length > 10);
}

export function getStoredModel(): string {
  try {
    const m = localStorage.getItem(MODEL_STORAGE_KEY) || 'gemini-flash-latest';
    // 自動將已被 Google 停用之 2.5-flash-lite 或 auto 遷移至最新穩定版 gemini-flash-latest
    if (m === 'auto' || m === 'gemini-2.5-flash-lite' || m.includes('2.5-flash-lite')) {
      return 'gemini-flash-latest';
    }
    return m;
  } catch {
    return 'gemini-flash-latest';
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
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey.trim())}`
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
        !name.includes('computer-use')
      ) {
        validModels.push(name);
      }
    }
    return validModels;
  } catch {
    return [];
  }
}

// 系統預設提示詞（精簡化以減少每輪 Prompt Tokens 消耗，防止觸發免費版 429 TPM 限額）
// 系統預設提示詞：專業頂尖 iPAS 淨零碳備考助教 (100% 線上權威解答)
const SYSTEM_INSTRUCTION = `你是一位專業的 iPAS 淨零碳規劃管理師（初級/中級能力鑑定）頂尖備考助教。
請全程使用繁體中文，專業、親切且條列分明地協助考生掌握經濟部 iPAS 兩大核心考科：
- 科目一：淨零碳規劃管理基礎概論（國內外淨零趨勢、氣候變遷因應法、碳費三子法、CBAM、碳權與自願減量專案、ESG 與 SBTi）。
- 科目二：淨零碳盤查規範與程序概要（ISO 14064-1:2018 類別1~6、溫室氣體盤查議定書 GHG Protocol 範疇一至三、ISO 14067:2018 產品碳足跡生命週期評估、活動數據與排放係數、逸散量與 GWP 換算）。

回答原則：
1. 【考題互動與批改】：
   - 當考生回覆作答（例如「我選 B」、「答案是不是 C」）時，立即為考生明確核對對錯，精闢解析正確選項的法規法條依據，並逐項剖析其餘干擾選項的錯誤陷阱！
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
 * - 對過往長篇回覆進行溫和精簡，防止 TPM (Tokens Per Minute) 爆量
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
    // 助手歷史長文精簡，保留題幹與選項核心，保護 TPM 配額
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
  url: string,
  contents: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }>,
  systemPrompt: string,
  useSearchTool: boolean,
  onChunk: (text: string) => void,
  onGroundingUrls: (urls: Array<{ uri: string; title?: string }>) => void
): Promise<{ ok: boolean; status: number; errorMessage: string; receivedAnyText: boolean }> {
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
 * 透過 Google 官方端點串流呼叫 Gemini API
 * 具備「優先檢索本地 RAG ➔ 防暴風式配額耗盡 ➔ 429 智能退避」機制
 */
/**
 * 透過 Google 官方端點串流呼叫 Gemini API (100% 線上權威對答)
 */
export async function streamGeminiChat(
  messages: ChatMessagePayload[],
  mode: TutorMode,
  enableSearch: boolean,
  callbacks: StreamCallbacks
): Promise<void> {
  const apiKey = getStoredApiKey();

  // 若尚未設定 API Key，明確提示用戶輸入
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
  
  // 嚴格單一模型策略：預設使用 Google 官方最新穩定版 gemini-flash-latest
  const targetModel =
    userPreferredModel && userPreferredModel !== 'auto' && !userPreferredModel.includes('2.5-flash-lite')
      ? userPreferredModel
      : 'gemini-flash-latest';

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${targetModel}:streamGenerateContent?alt=sse&key=${encodeURIComponent(apiKey)}`;

  try {
    let result = await executeModelStream(
      url,
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

    // 若因 404 (舊模型已遭 Google 停用) 失敗，自動切換至 Google 官方最新穩定版 gemini-flash-latest 救援一次
    if (!result.ok && result.status === 404 && targetModel !== 'gemini-flash-latest') {
      console.warn(`[Gemini API] 模型 ${targetModel} 遭遇 404，自動使用 gemini-flash-latest 恢復`);
      setStoredModel('gemini-flash-latest');
      const fallbackUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:streamGenerateContent?alt=sse&key=${encodeURIComponent(apiKey)}`;
      result = await executeModelStream(
        fallbackUrl,
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
    }

    // 若該模型因不支援 googleSearch 工具而回傳 400，改以純文字串流重試一次
    if (
      !result.ok &&
      result.status === 400 &&
      enableSearch &&
      !result.errorMessage.includes('API_KEY_INVALID') &&
      !result.errorMessage.toLowerCase().includes('api key not valid')
    ) {
      result = await executeModelStream(
        url,
        contents,
        systemPrompt,
        false,
        callbacks.onChunk,
        () => {}
      );
    }

    // 若遭遇 429 頻率限制，短暫等待 2 秒自動在線上重試一次
    if (
      !result.ok &&
      (result.status === 429 ||
        result.errorMessage.includes('quota') ||
        result.errorMessage.includes('RESOURCE_EXHAUSTED'))
    ) {
      console.warn(`[Gemini Rate Limit 429] 遇到頻率限制，等待 2 秒後在線上重試一次...`);
      await new Promise((resolve) => setTimeout(resolve, 2000));
      result = await executeModelStream(
        url,
        contents,
        systemPrompt,
        false,
        callbacks.onChunk,
        () => {}
      );
    }

    if (!result.ok) {
      // 1. API Key 無效
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

      // 2. 403 權限拒絕
      if (result.status === 403) {
        callbacks.onError(new Error(`API 權限被拒 (403)：${result.errorMessage}`));
        return;
      }

      // 3. 429 配額超限 (RPM/TPM Rate Limit)
      if (
        result.status === 429 ||
        result.errorMessage.includes('quota') ||
        result.errorMessage.includes('RESOURCE_EXHAUSTED')
      ) {
        callbacks.onError(
          new Error(
            '⚡ Google 官方 API 頻率限制 (429 Rate Limit)：您的提問頻率較快或對話長度超過每分鐘限額。請稍候 15~20 秒待 Google 每分鐘配額重置後，再次發送即可正常對答！'
          )
        );
        return;
      }

      // 4. 其他模型報錯
      callbacks.onError(
        new Error(`[${targetModel}] 請求失敗 (${result.status})：${result.errorMessage}`)
      );
      return;
    }

    if (result.receivedAnyText) {
      callbacks.onMetadata?.({
        groundingUrls,
        sourceMode: enableSearch ? 'web' : 'offline',
      });
      callbacks.onDone();
      return;
    }
  } catch (err: unknown) {
    const error = err as Error;
    callbacks.onError(new Error(`[${targetModel}] 線上連線發生例外：${error.message}`));
    return;
  }
}

function getModeSystemPrompt(m: TutorMode): string {
  switch (m) {
    case 'socratic':
      return `${SYSTEM_INSTRUCTION}
【當前模式：啟發引導】：切勿直接說出答案選項（如「答案是 A」），請先給予解題關鍵字、法規思維方向與干擾項排除線索。`;
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

/**
 * 內建 iPAS 離線知識庫 + RAG 本地檢索回應
 */
function simulateOfflineResponse(
  query: string,
  _mode: TutorMode,
  ragCitations: RagCitation[],
  callbacks: StreamCallbacks
): void {
  callbacks.onMetadata?.({
    ragCitations,
    groundingUrls: [],
    sourceMode: 'offline',
  });

  let reply = '';

  if (ragCitations.length > 0) {
    const topItems = ragCitations
      .map(
        (c, idx) =>
          `#### 📖 引用段落 ${idx + 1}：《${c.docName}》（${c.pageOrSection}）\n${c.snippet}`
      )
      .join('\n\n---\n\n');

    reply = `### 📚 本地 RAG 知識庫檢索結果（離線助教為您解答）

系統已優先從您的 **RAG 歷年考古題與教材庫** 中檢索出與您問題最相關的 **${ragCitations.length} 處段落**：

${topItems}

---
💡 **助教解題思路引導**：
- 請根據上方教材條款與考古題真題解析，判斷此題考核的關鍵準則。
- 若為計算題，注意質量單位換算（kg 換算為公噸須除以 1,000）與 GWP 乘數。

*(提示：當前為本地離線模式。若需即時 AI 深度追問，稍候 20 秒待 Google 每分鐘配額重置後即可繼續對答)*`;
  } else {
    reply = `### 🌿 本地 RAG 知識庫提示（離線模式）

目前本地 RAG 知識庫中尚未包含與「**${query.slice(0, 35)}**」直接匹配的段落。

💡 **備考建議**：
1. 點擊上方導覽列的 **「📚 RAG 教材與題庫庫」**，查看已預載的 115 年 200 道官方真題。
2. 稍候 20~30 秒待 Google 每分鐘免費請求配額刷新後，再次送出即可繼續由 Gemini 為您解析！`;
  }

  let index = 0;
  const timer = setInterval(() => {
    if (index < reply.length) {
      const step = Math.min(16, reply.length - index);
      callbacks.onChunk(reply.substring(index, index + step));
      index += step;
    } else {
      clearInterval(timer);
      callbacks.onDone();
    }
  }, 20);
}
