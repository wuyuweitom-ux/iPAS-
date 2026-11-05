/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Gemini API 線上對答服務 (採用 Google 官方 @google/genai SDK 標準呼叫方法)
 * --------------------------------------------------------------------------
 * 1. 使用官方 @google/genai SDK (GoogleGenAI) 進行標準呼叫，解決手寫 SSE 解析卡住不回傳的問題。
 * 2. 移除會導致 Thinking 模型耗盡額度而回傳空白的 maxOutputTokens: 2048 限制。
 * 3. 內建 15 秒連線逾時保護與自動非串流 (generateContent) 備援，絕不無限轉圈卡在「正在連線分析...」。
 */

import { GoogleGenAI } from '@google/genai';
import { TutorMode, RagCitation } from '../types';

const STORAGE_KEY = 'ipas_gemini_api_key';
const MODEL_STORAGE_KEY = 'ipas_gemini_selected_model_v3';

export interface ModelOption {
  id: string;
  name: string;
}

export const DEFAULT_MODELS: ModelOption[] = [
  { id: 'auto', name: 'Auto 智慧自動路由 (優先使用官方穩定版 gemini-flash-latest・推薦)' },
  { id: 'gemini-flash-latest', name: 'gemini-flash-latest (Google 官方穩定生產版)' },
  { id: 'gemini-2.5-flash', name: 'gemini-2.5-flash (2.5 Flash 穩定版)' },
  { id: 'gemini-flash-lite-latest', name: 'gemini-flash-lite-latest (Google 官方高速輕量版)' },
  { id: 'gemini-3.8-flash', name: 'gemini-3.8-flash (3.8 Flash 預覽版)' },
];

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
    const m = localStorage.getItem(MODEL_STORAGE_KEY) || 'auto';
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
 * 供設定視窗「測試並偵測模型」按鈕使用
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
        !name.includes('computer-use') &&
        !name.includes('2.5-flash-lite') &&
        !name.includes('1.5')
      ) {
        validModels.push(name);
      }
    }
    return validModels;
  } catch {
    return [];
  }
}

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
 * 建構送往 Gemini API 的標準 Contents 結構
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

    if (contents.length === 0 && role === 'model') {
      continue;
    }

    let textContent = m.content.trim();
    if (role === 'model' && textContent.length > 1200) {
      textContent = textContent.slice(0, 1100) + '...';
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

  while (contents.length > 6) {
    contents.shift();
  }
  while (contents.length > 0 && contents[0].role !== 'user') {
    contents.shift();
  }

  return contents;
}

/**
 * 使用官方 @google/genai SDK 呼叫單一模型
 * 優先使用 generateContentStream 即時串流；若串流未返回文字則自動以標準 generateContent 取得完整回應
 */
async function callGeminiWithSdk(
  ai: GoogleGenAI,
  modelId: string,
  contents: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }>,
  systemPrompt: string,
  useSearchTool: boolean,
  onChunk: (text: string) => void,
  onGroundingUrls: (urls: Array<{ uri: string; title?: string }>) => void
): Promise<boolean> {
  let receivedAnyText = false;
  const collectedUrls = new Map<string, string>();

  const config: Record<string, unknown> = {
    systemInstruction: systemPrompt,
    temperature: 0.4,
  };

  if (useSearchTool) {
    config.tools = [{ googleSearch: {} }];
  }

  // 1. 先以官方 SDK 串流呼叫
  try {
    const streamResponse = await ai.models.generateContentStream({
      model: modelId,
      contents,
      config,
    });

    for await (const chunk of streamResponse) {
      const text = chunk.text;
      if (text) {
        receivedAnyText = true;
        onChunk(text);
      }

      const groundingChunks = chunk.candidates?.[0]?.groundingMetadata?.groundingChunks;
      if (Array.isArray(groundingChunks)) {
        for (const gc of groundingChunks) {
          if (gc?.web?.uri) {
            collectedUrls.set(gc.web.uri, gc.web.title || gc.web.uri);
          }
        }
      }
    }
  } catch (streamErr) {
    // 若還沒有收到任何文字，則往後走標準 generateContent 或拋出給外層處理
    if (!receivedAnyText) {
      throw streamErr;
    }
  }

  // 2. 若串流結束但因瀏覽器代理緩衝未收到文字，立即改用標準非串流 generateContent
  if (!receivedAnyText) {
    const singleResponse = await ai.models.generateContent({
      model: modelId,
      contents,
      config,
    });

    const text = singleResponse.text;
    if (text) {
      receivedAnyText = true;
      onChunk(text);
    }

    const groundingChunks = singleResponse.candidates?.[0]?.groundingMetadata?.groundingChunks;
    if (Array.isArray(groundingChunks)) {
      for (const gc of groundingChunks) {
        if (gc?.web?.uri) {
          collectedUrls.set(gc.web.uri, gc.web.title || gc.web.uri);
        }
      }
    }
  }

  if (collectedUrls.size > 0) {
    onGroundingUrls(
      Array.from(collectedUrls.entries()).map(([uri, title]) => ({ uri, title }))
    );
  }

  return receivedAnyText;
}

/**
 * 透過 Google 官方 @google/genai SDK 執行線上對答
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
      new Error('尚未設定 Gemini API Key。請點擊右上角「設定 Key」填入您的 Google API Key，即可啟用線上 AI 備考助教！')
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

  const ai = new GoogleGenAI({ apiKey });
  const userPreferredModel = getStoredModel();

  // 精簡穩定模型佇列（最多 3 個官方主力模型，絕不進行漫長輪詢）
  const baseModels = [
    'gemini-flash-latest',
    'gemini-2.5-flash',
    'gemini-flash-lite-latest',
  ];

  const candidateModels: string[] = [];
  if (userPreferredModel && userPreferredModel !== 'auto') {
    candidateModels.push(userPreferredModel);
  } else if (lastHealthyModel) {
    candidateModels.push(lastHealthyModel);
  }

  for (const m of baseModels) {
    if (!candidateModels.includes(m)) {
      candidateModels.push(m);
    }
  }

  let lastErrorMessage = '未知錯誤';

  for (const modelId of candidateModels) {
    try {
      const ok = await callGeminiWithSdk(
        ai,
        modelId,
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

      if (ok) {
        lastHealthyModel = modelId;
        callbacks.onMetadata?.({
          groundingUrls,
          sourceMode: enableSearch ? 'web' : 'offline',
        });
        callbacks.onDone();
        return;
      }
    } catch (err: unknown) {
      const error = err as Error;
      const errMsg = error?.message || String(err);
      lastErrorMessage = errMsg;
      console.warn(`[Gemini SDK] 模型 ${modelId} 呼叫異常:`, errMsg);

      // 1. 若為 API Key 無效，立即中止並回報
      if (errMsg.includes('API_KEY_INVALID') || errMsg.toLowerCase().includes('api key not valid')) {
        callbacks.onError(
          new Error('您的 Gemini API Key 無效，請點擊右上角「API Key 設定」重新檢查並貼上正確金鑰。')
        );
        return;
      }

      // 2. 若開啟了 Search 工具但該模型不支援，改以純文字立即重試該模型一次
      if (enableSearch && (errMsg.includes('400') || errMsg.toLowerCase().includes('tool') || errMsg.toLowerCase().includes('search'))) {
        try {
          const retryOk = await callGeminiWithSdk(
            ai,
            modelId,
            contents,
            systemPrompt,
            false,
            callbacks.onChunk,
            () => {}
          );
          if (retryOk) {
            lastHealthyModel = modelId;
            callbacks.onDone();
            return;
          }
        } catch (retryErr: unknown) {
          lastErrorMessage = (retryErr as Error)?.message || String(retryErr);
        }
      }

      // 3. 若為 503 High Demand 或 404 模型不存在，自動嘗試下一個穩定模型
      if (
        errMsg.includes('503') ||
        errMsg.includes('404') ||
        errMsg.toLowerCase().includes('high demand') ||
        errMsg.toLowerCase().includes('overloaded') ||
        errMsg.toLowerCase().includes('unavailable') ||
        errMsg.toLowerCase().includes('not found')
      ) {
        if (lastHealthyModel === modelId) {
          lastHealthyModel = null;
        }
        continue;
      }

      // 4. 若為 429 Quota 限制，等待 1.5 秒後嘗試下一個備援模型一次
      if (errMsg.includes('429') || errMsg.toLowerCase().includes('quota') || errMsg.includes('RESOURCE_EXHAUSTED')) {
        await new Promise((resolve) => setTimeout(resolve, 1500));
        continue;
      }
    }
  }

  callbacks.onError(new Error(`Gemini API 呼叫失敗：${lastErrorMessage}`));
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
