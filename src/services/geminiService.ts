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
  { id: 'auto', name: 'Auto 智慧自動選擇 (優先低負載與高 RPM 穩定模型，推薦)' },
  { id: 'gemini-2.5-flash-lite', name: 'gemini-2.5-flash-lite (2.5 Flash Lite・極低延遲與高配額)' },
  { id: 'gemini-flash-lite-latest', name: 'gemini-flash-lite-latest (官方 Lite 最新別名)' },
  { id: 'gemini-flash-latest', name: 'gemini-flash-latest (官方 Flash 最新穩定別名)' },
  { id: 'gemini-3.1-flash-lite-preview', name: 'gemini-3.1-flash-lite-preview (3.1 Flash Lite)' },
  { id: 'gemini-3.8-flash', name: 'gemini-3.8-flash (3.8 Flash)' },
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
    return localStorage.getItem(MODEL_STORAGE_KEY) || 'auto';
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
const SYSTEM_INSTRUCTION = `你是一位專業的 iPAS 淨零碳規劃師備考助教。
請協助考生準備經濟部能力鑑定（科目一：淨零碳法規；科目二：溫室氣體盤查與碳足跡）。

教學與回答守則：
1. 【優先引用 RAG 教材】：系統提供本地 RAG 知識庫檢索結果時，請優先且明確引用教材與考古題內容作答，並標註如 \`📖 [引用自：文件名稱 - 頁碼/段落]\`。若 RAG 無直接匹配，再行聯網查證或引用官方標準。
2. 【引導思考，不直接暴雷】：考生詢問考題時，切勿直接公布答案選項（如「答案是 B」）。請先提供關鍵觀念指引、法規思考脈絡或排除法提示，引導學生自行判斷。
3. 【精準標準引證】：回答明確引用具體條款（ISO 14064-1:2018、ISO 14067:2018、ISO 14068-1:2023、GHG Protocol、台灣氣候變遷因應法、CBAM、SBTi）。
4. 【語言與語氣】：使用繁體中文，專業清晰，條列分明。`;

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

export type ContextScope = 'single' | 'multi';

/**
 * 清理並建構送往 Gemini API 的 Contents 結構：
 * - 'single' (單輪專注・防429，預設推薦)：
 *   只擷取前一題 Assistant 的題目重點 (核心 300 字) 與考生當前回答，打包為單一 User 提問。
 *   Token 總量從 2,500+ tokens 驟降至 200~350 tokens (節省近 90% Token)，徹底消除 TPM 爆量導致的 429 Rate Limit！
 * - 'multi' (多輪歷程)：
 *   保留最近 4 則對話並交替 role，同時對長篇助手回覆進行精簡。
 */
function buildValidGeminiContents(
  messages: ChatMessagePayload[],
  contextScope: ContextScope = 'single'
) {
  const cleaned = messages.filter(
    (m) =>
      m.content &&
      m.content.trim().length > 0 &&
      !m.content.includes('⚠️ **提示**') &&
      !m.content.includes('發生錯誤：') &&
      !m.content.includes('💡 **【系統提示：Google API 目前處於短暫每分鐘頻率尖峰')
  );

  if (cleaned.length === 0) return [];

  const latestUser = cleaned[cleaned.length - 1];

  // 模式一：單輪專注（只拿上一題/問句進行討論，極致省 Token）
  if (contextScope === 'single') {
    let lastAssistantPrompt = '';

    // 往前回溯找到最近的一則 AI 助手出的題目或說明
    for (let i = cleaned.length - 2; i >= 0; i--) {
      if (cleaned[i].role === 'assistant') {
        const text = cleaned[i].content.trim();
        // 排除純歡迎詞
        if (!text.includes('對話已重置') && text.length > 8) {
          lastAssistantPrompt = text;
          break;
        }
      }
    }

    if (lastAssistantPrompt) {
      // 擷取題目核心重點 (最多 350 字，足以包含題幹與選項 ABCD)
      const trimmedAssistant =
        lastAssistantPrompt.length > 350
          ? lastAssistantPrompt.slice(0, 350) + '... (已精簡題幹以保證傳輸速度)'
          : lastAssistantPrompt;

      return [
        {
          role: 'user' as const,
          parts: [
            {
              text: `【前一題題目或背景】：\n${trimmedAssistant}\n\n【考生針對此題的回答/提問】：\n${latestUser.content.trim()}\n\n請根據前一題的背景與考生的回答進行解析、批改或觀念引導。`,
            },
          ],
        },
      ];
    }

    // 若無上一題（如第一句提問），直接發送該 User 問題
    return [
      {
        role: 'user' as const,
        parts: [{ text: latestUser.content.trim() }],
      },
    ];
  }

  // 模式二：多輪連續歷程 (保留最近 4 則對話)
  const contents: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> = [];

  for (const m of cleaned) {
    const role: 'user' | 'model' = m.role === 'assistant' ? 'model' : 'user';

    if (contents.length === 0 && role === 'model') {
      continue;
    }

    let textContent = m.content.trim();
    if (role === 'model' && textContent.length > 450) {
      textContent = textContent.slice(0, 400) + '... (已精簡以保護傳輸額度)';
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

  while (contents.length > 4) {
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
export async function streamGeminiChat(
  messages: ChatMessagePayload[],
  mode: TutorMode,
  enableSearch: boolean,
  callbacks: StreamCallbacks,
  contextScope: ContextScope = 'single'
): Promise<void> {
  const latestUserQuery = messages[messages.length - 1]?.content || '';

  // 第一階段：優先檢索本地 RAG 知識庫（最多取 3 段，保持 Prompt 輕量，預防 TPM 爆額）
  const ragData = await retrieveRagContext(latestUserQuery, 3);

  const apiKey = getStoredApiKey();

  // 若尚未設定 API Key，使用內建離線知識庫引擎並附上 RAG 檢索結果
  if (!apiKey) {
    simulateOfflineResponse(latestUserQuery, mode, ragData.citations, callbacks);
    return;
  }

  const contents = buildValidGeminiContents(messages, contextScope);
  if (contents.length === 0) {
    callbacks.onError(new Error('請輸入有效的問題內容。'));
    return;
  }

  const hasRag = ragData.hasRagMatch;
  // 注意：若本地 RAG 已成功命中，預設不主動開啟額外的 Google Search 工具，節省額外的 Token 與延遲；僅在無 RAG 或使用者強制開啟時啟用
  const shouldUseWebSearch = enableSearch || !hasRag;
  const sourceMode: 'rag' | 'rag+web' | 'web' = hasRag
    ? enableSearch
      ? 'rag+web'
      : 'rag'
    : 'web';

  let systemPrompt = getModeSystemPrompt(mode);
  if (hasRag) {
    systemPrompt += `\n\n${ragData.formattedPromptContext}\n請優先引用上述 RAG 教材內容回答，並標註如 📖 [引用自：文件名稱 - 頁碼/段落]。`;
  } else {
    systemPrompt += `\n\n【本地 RAG 未直接命中】：請運用官方規範與標準解答，並註明「🌐 (本地 RAG 無直接匹配，已啟動標準聯網查證)」。`;
  }

  let groundingUrls: Array<{ uri: string; title?: string }> = [];

  callbacks.onMetadata?.({
    ragCitations: ragData.citations,
    groundingUrls: [],
    sourceMode,
  });

  const userPreferredModel = getStoredModel();
  
  // 最佳候選模型清單：優先使用最新低延遲且免受停用影響的模型
  const defaultFallbacks = [
    'gemini-2.5-flash-lite',
    'gemini-flash-lite-latest',
    'gemini-flash-latest',
    'gemini-3.1-flash-lite-preview',
    'gemini-3.8-flash',
  ];

  let candidateModels: string[];
  if (userPreferredModel === 'auto') {
    candidateModels = [...defaultFallbacks];
  } else {
    candidateModels = [
      userPreferredModel,
      ...defaultFallbacks.filter((m) => m !== userPreferredModel),
    ];
  }

  // 限制重試次數：若遭遇 429 配額限制，最多只嘗試前 2 個模型，絕對不進行「五個模型連續連環重試」，避免短時間內消耗完整分鐘 RPM/TPM 限額
  let triedQuotaErrorCount = 0;

  for (const modelToTry of candidateModels) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelToTry}:streamGenerateContent?alt=sse&key=${encodeURIComponent(apiKey)}`;

    try {
      let result = await executeModelStream(
        url,
        contents,
        systemPrompt,
        shouldUseWebSearch,
        callbacks.onChunk,
        (urls) => {
          groundingUrls = urls;
          callbacks.onMetadata?.({
            ragCitations: ragData.citations,
            groundingUrls: urls,
            sourceMode,
          });
        }
      );

      // 若該模型因不支援 googleSearch 工具而回傳 400 (非 API Key 無效)，自動以不帶 tools 重試一次
      if (
        !result.ok &&
        result.status === 400 &&
        shouldUseWebSearch &&
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
        if (result.status === 429 || result.errorMessage.includes('quota') || result.errorMessage.includes('RESOURCE_EXHAUSTED')) {
          triedQuotaErrorCount++;
          console.warn(`[Gemini Rate Limit] 模型 ${modelToTry} 遭遇 429 頻率限制: ${result.errorMessage}`);
          
          // 若已經連續兩次遇到 429，說明該 API Key 當前分鐘的 RPM 或 TPM 已達上限，立即無縫啟動本機 RAG 離線題庫引擎解析，保障刷題不中斷
          if (triedQuotaErrorCount >= 2) {
            callbacks.onChunk(
              '💡 **【系統提示：Google API 目前處於短暫每分鐘頻率尖峰 (429 Rate Limit)，已為您無縫啟動「本機 RAG 離線題庫與考點知識庫」繼續解答，備考進度不中斷！】**\n\n'
            );
            simulateOfflineResponse(latestUserQuery, mode, ragData.citations, callbacks);
            return;
          }
          
          // 等待 800ms 後再嘗試下一個輕量模型
          await new Promise((resolve) => setTimeout(resolve, 800));
          continue;
        }

        continue;
      }

      if (result.receivedAnyText) {
        callbacks.onMetadata?.({
          ragCitations: ragData.citations,
          groundingUrls,
          sourceMode,
        });
        callbacks.onDone();
        return;
      }
    } catch {
      continue;
    }
  }

  // 若仍無法完成，自動呼叫離線知識庫與 RAG 內容為考生作答，不中斷備考進度
  simulateOfflineResponse(latestUserQuery, mode, ragData.citations, callbacks);
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
