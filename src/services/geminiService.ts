/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * 靜態網頁版專用 Gemini API 呼叫服務 (純客戶端 Zero-Leak 安全架構 + RAG 優先檢索與自動聯網備援)
 * -------------------------------------------------------------
 * 1. 原始碼中【絕無】寫入任何 API Key，專案推送到 GitHub Pages 絕對安全！
 * 2. 對答優先檢索本地 RAG 知識庫（歷年考古題、公版教材）；若 RAG 無直接匹配或使用者開啟聯網，自動接續啟動 Google Search 聯網查證。
 * 3. 自動過濾對話歷史，確保符合 Gemini API「首則必須為 user 且角色嚴格交替」之規範。
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
  { id: 'auto', name: 'Auto 智慧自動選擇 (自動偵測可用與低負載模型，推薦)' },
  { id: 'gemini-flash-lite-latest', name: 'gemini-flash-lite-latest (官方 Lite 最新穩定別名・極速低負載)' },
  { id: 'gemini-flash-latest', name: 'gemini-flash-latest (官方 Flash 最新穩定別名)' },
  { id: 'gemini-3.1-flash-lite-preview', name: 'gemini-3.1-flash-lite-preview (3.1 Flash Lite)' },
  { id: 'gemini-3-flash-preview', name: 'gemini-3-flash-preview (3.0 Flash)' },
  { id: 'gemini-3.8-flash', name: 'gemini-3.8-flash (3.8 Flash)' },
  { id: 'gemini-2.5-flash-lite', name: 'gemini-2.5-flash-lite (2.5 Flash Lite)' },
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
        !name.includes('computer-use') &&
        !name.includes('2.5-flash')
      ) {
        validModels.push(name);
      }
    }
    return validModels;
  } catch {
    return [];
  }
}

// 系統預設提示詞
const SYSTEM_INSTRUCTION = `你是一位專業且權威的 iPAS 淨零碳規劃師備考助教（具備 ISO 14064-1/2/3 主導稽核員與碳審計專家背景）。
請協助考生準備經濟部 iPAS 淨零碳規劃師能力鑑定（科目一：淨零碳規劃基礎與法規；科目二：企業溫室氣體盤查與碳足跡實務）。

教學與回答守則：
1. 【優先引用 RAG 教材與考古題，若無則聯網查證】：
   - 系統會先檢索本地「RAG 知識庫（歷年考古題、公版教材、法規標準）」。
   - 若系統提供了【本地 RAG 知識庫檢索結果】，請務必**優先且明確引用**該教材或考古題內容作答，並在內文中標註出處，例如：\`📖 [引用自：文件名稱 - 頁碼/段落]\`。
   - 若本地 RAG 知識庫中沒有直接匹配的內容（或不足以完整回答），請接著使用 Google Search 網路搜尋或權威國際標準補充，並在回答開頭或結尾說明哪部分來自 RAG 教材、哪部分來自網路搜尋補充。
2. 【引導思考，不直接暴雷】：當學生詢問考古題、選擇題或計算題時，請勿第一時間直接說出答案選項（如「答案是 B」）。請先提供關鍵觀念指引、法規思維方向或解題核心關鍵字，引導學生自行判斷。
3. 【盲點診斷】：當學生回答錯誤或觀念模糊時，請直擊其盲點，解釋為何容易混淆（例如：組織邊界股權比例法 vs 控制權法、類別三運輸間接排放與類別四使用產品之間的分界、範疇二市場基礎法與地點基礎法的差異等）。
4. 【精準標準引證】：每一次解釋與論證，必須明確引用具體國際標準或國內法規條款（ISO 14064-1:2018、ISO 14067:2018、GHG Protocol、台灣《氣候變遷因應法》、CBAM、SBTi）。
5. 【語言與語氣】：使用繁體中文（台灣慣用專業詞彙），語氣專業、清晰、富有激勵性，善用 Markdown 格式化、條列與重點加粗。`;

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
 * 清理並正規化對話歷史：
 * 1. 移除開頭的 assistant 歡迎詞（Gemini API 規定第一則訊息必須是 role: 'user'）
 * 2. 移除空白或系統錯誤訊息
 * 3. 確保 user 與 model 角色嚴格交替，避免觸發 400 INVALID_ARGUMENT
 */
function buildValidGeminiContents(messages: ChatMessagePayload[]) {
  const cleaned = messages.filter(
    (m) =>
      m.content &&
      m.content.trim().length > 0 &&
      !m.content.includes('⚠️ **提示**') &&
      !m.content.includes('發生錯誤：')
  );

  const contents: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> = [];

  for (const m of cleaned) {
    const role: 'user' | 'model' = m.role === 'assistant' ? 'model' : 'user';

    if (contents.length === 0 && role === 'model') {
      continue;
    }

    if (contents.length > 0 && contents[contents.length - 1].role === role) {
      contents[contents.length - 1].parts[0].text += `\n\n${m.content.trim()}`;
    } else {
      contents.push({
        role,
        parts: [{ text: m.content.trim() }],
      });
    }
  }

  while (contents.length > 10) {
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
      // 擷取 Google Search Grounding 來源網址
      const groundingChunks = candidate?.groundingMetadata?.groundingChunks;
      if (Array.isArray(groundingChunks)) {
        for (const gc of groundingChunks) {
          if (gc?.web?.uri) {
            collectedUrls.set(gc.web.uri, gc.web.title || gc.web.uri);
          }
        }
      }
    } catch {
      // 忽略不完整的 JSON 片段
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
 * 支援「優先檢索本地 RAG 教材與考古題 -> 若無匹配則自動啟動 Google Search 聯網搜尋」雙階段管線
 */
export async function streamGeminiChat(
  messages: ChatMessagePayload[],
  mode: TutorMode,
  enableSearch: boolean,
  callbacks: StreamCallbacks
): Promise<void> {
  const latestUserQuery = messages[messages.length - 1]?.content || '';

  // 第一階段：優先檢索本地 RAG 知識庫（歷年考古題、公版教材、法規標準）
  const ragData = await retrieveRagContext(latestUserQuery, 4);

  const apiKey = getStoredApiKey();

  // 若尚未設定 API Key，使用內建離線知識庫引擎並附上 RAG 檢索結果
  if (!apiKey) {
    simulateOfflineResponse(latestUserQuery, mode, ragData.citations, callbacks);
    return;
  }

  const contents = buildValidGeminiContents(messages);
  if (contents.length === 0) {
    callbacks.onError(new Error('請輸入有效的問題內容。'));
    return;
  }

  // 第二階段：決定是否引用 RAG 或是自動切換聯網搜尋
  // 若 RAG 有匹配：優先引用 RAG；若使用者同時勾選「聯網查證」則為 rag+web
  // 若 RAG 無匹配：自動啟用 Google Search 聯網搜尋 (sourceMode = 'web')，實踐「優先引用 RAG，如果沒有接著才上網找」
  const hasRag = ragData.hasRagMatch;
  const shouldUseWebSearch = enableSearch || !hasRag;
  const sourceMode: 'rag' | 'rag+web' | 'web' = hasRag
    ? enableSearch
      ? 'rag+web'
      : 'rag'
    : 'web';

  // 將 RAG 檢索背景知識注入系統提示詞與最新一輪提問中
  let systemPrompt = getModeSystemPrompt(mode);
  if (hasRag) {
    systemPrompt += `\n\n${ragData.formattedPromptContext}\n請務必優先根據上述【本地 RAG 知識庫檢索結果】之公版教材與考古題內容回答，並在相關段落標註出處（如 📖 [引用自：文件名稱 - 頁碼/段落]）。`;
  } else {
    systemPrompt += `\n\n【檢索狀態通知】：使用者的問題在本地 RAG 知識庫（歷年考古題與公版教材）中未找到直接匹配的段落。系統已自動為您開啟 Google Search 聯網查證功能，請上網檢索最新官方公告、環境部法規或國際標準來回答，並在回覆開頭簡短註明「🌐 *(本地 RAG 知識庫無直接匹配段落，已自動為您聯網查證最新法規與標準)*」。`;
  }

  let groundingUrls: Array<{ uri: string; title?: string }> = [];

  // 先通知 UI 目前採用的檢索來源與命中的 RAG 段落
  callbacks.onMetadata?.({
    ragCitations: ragData.citations,
    groundingUrls: [],
    sourceMode,
  });

  const userPreferredModel = getStoredModel();
  const defaultFallbacks = [
    'gemini-flash-lite-latest',
    'gemini-flash-latest',
    'gemini-3.1-flash-lite-preview',
    'gemini-3-flash-preview',
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

  const errorsByModel: string[] = [];

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

        console.warn(`[Gemini Failover] 模型 ${modelToTry} 回應 ${result.status}: ${result.errorMessage}`);
        errorsByModel.push(`[${modelToTry}] ${result.errorMessage}`);
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
      } else {
        errorsByModel.push(`[${modelToTry}] 模型未回傳文字內容`);
        continue;
      }
    } catch (networkErr: unknown) {
      const err = networkErr as Error;
      errorsByModel.push(`[${modelToTry}] 網路連線異常: ${err.message}`);
      continue;
    }
  }

  // 若候選清單皆失敗，動態查詢帳號支援的模型
  const dynamicModels = await fetchAvailableModelsForKey(apiKey);
  const untriedDynamic = dynamicModels.filter((m) => !candidateModels.includes(m));

  for (const dynModel of untriedDynamic.slice(0, 3)) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${dynModel}:streamGenerateContent?alt=sse&key=${encodeURIComponent(apiKey)}`;
      const result = await executeModelStream(
        url,
        contents,
        systemPrompt,
        false,
        callbacks.onChunk,
        () => {}
      );
      if (result.ok && result.receivedAnyText) {
        callbacks.onDone();
        return;
      }
    } catch {
      // ignore and continue
    }
  }

  callbacks.onError(
    new Error(`無法完成 Gemini API 請求。詳細原因：\n${errorsByModel.join('\n')}`)
  );
}

function getModeSystemPrompt(m: TutorMode): string {
  switch (m) {
    case 'socratic':
      return `${SYSTEM_INSTRUCTION}
【當前模式：蘇格拉底啟發引導】：切記！絕對不可直接公布答案選項（如「答案是 A」），請先給予解題思考提示、觀念盲點線索與排除法的核心關鍵。`;
    case 'diagnostic':
      return `${SYSTEM_INSTRUCTION}
【當前模式：盲點深入診斷】：針對考生容易混淆的觀念做正反對比，點出出題陷阱與易錯概念。`;
    case 'standards':
      return `${SYSTEM_INSTRUCTION}
【當前模式：國際法規引證】：所有回答必須嚴格標明 ISO 14064-1:2018、ISO 14067、GHG Protocol 或台灣氣候變遷因應法精確條款章節。`;
    case 'calculation':
      return `${SYSTEM_INSTRUCTION}
【當前模式：排放計算引導】：逐步引導活動數據 (AD)、排放係數 (EF) 與 GWP 的單位換算與相乘算式，確保算式清晰。`;
    default:
      return SYSTEM_INSTRUCTION;
  }
}

/**
 * 內建 iPAS 離線知識庫 + RAG 本地檢索回應 (當使用者未設定 API Key 時啟動)
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

    reply = `### 📚 本地 RAG 知識庫檢索結果（離線模式）

系統已優先從您的 **RAG 教材與歷年考古題庫** 中檢索出與您問題最相關的 **${ragCitations.length} 處段落**：

${topItems}

---
💡 **助教解題提示**：請先根據上方教材與考古題條款判斷關鍵邊界與公式（如 $E = AD \\times EF \\times GWP$）。
🔑 *若要啟用 Gemini AI 針對您上傳的教材進行蘇格拉底互動式追問與聯網查證，請點擊右上角「設定 API Key」。*`;
  } else {
    reply = `### 🌿 本地 RAG 知識庫未找到直接匹配段落（離線模式）

目前本地 RAG 知識庫中尚未包含與「**${query.slice(0, 35)}**」直接匹配的教材或考古題段落，且您尚未設定個人 Gemini API Key，因此無法自動啟動 Google Search 聯網搜尋。

💡 **您可以採取以下兩種方式**：
1. 點擊上方導覽列的 **「📚 RAG 教材與題庫庫」**，上傳您的 **iPAS 公版教材 PDF** 或 **歷年考古題檔案**，系統將立即建立本地檢索索引！
2. 點擊右上角 **「設定 API Key」** 填入您的 Gemini API Key，當 RAG 無匹配時系統就會自動為您聯網搜尋最新法規與標準。`;
  }

  let index = 0;
  const timer = setInterval(() => {
    if (index < reply.length) {
      const step = Math.min(12, reply.length - index);
      callbacks.onChunk(reply.substring(index, index + step));
      index += step;
    } else {
      clearInterval(timer);
      callbacks.onDone();
    }
  }, 25);
}
