/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * 靜態網頁版專用 Gemini API 呼叫服務 (純客戶端 Zero-Leak 安全架構)
 * -------------------------------------------------------------
 * 1. 原始碼中【絕無】寫入任何 API Key，專案推送到 GitHub Pages 絕對安全！
 * 2. 自動過濾對話歷史，確保符合 Gemini API「首則必須為 user 且角色嚴格交替」之規範。
 * 3. 支援動態查詢帳號可用模型 (v1beta/models)，並具備智慧故障轉移與真實錯誤回報。
 */

import { TutorMode } from '../types';

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
        !name.includes('2.5-flash') // 避開對新帳號停用的 2.5-flash
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
1. 【引導思考，不直接暴雷】：當學生詢問考古題、選擇題或計算題時，請勿第一時間直接說出答案選項（如「答案是 B」）。請先提供關鍵觀念指引、法規思維方向或解題核心關鍵字，引導學生自行判斷。
2. 【盲點診斷】：當學生回答錯誤或觀念模糊時，請直擊其盲點，解釋為何容易混淆（例如：組織邊界股權比例法 vs 控制權法、類別三運輸間接排放與類別四使用產品之間的分界、範疇二市場基礎法與地點基礎法的差異等）。
3. 【精準標準引證】：每一次解釋與論證，必須明確引用具體國際標準或國內法規條款，例如：
   - ISO 14064-1:2018（組織層級溫室氣體盤查與報告）之原則、類別 1 ~ 類別 6 分類、顯著性間接排放評估準則、基準年重新計算門檻。
   - ISO 14067:2018（產品碳足跡量化與溝通規範）之系統邊界、功能單位 (Functional Unit)、分配規則 (Allocation)。
   - GHG Protocol（企業溫室氣體盤查議定書）Scope 1 / Scope 2 / Scope 3。
   - 台灣《氣候變遷因應法》及環境部碳費徵收辦法（如碳費收費辦法、自主減量計畫等）。
   - 歐盟碳邊境調整機制 (CBAM) 及 SBTi 科學基礎減碳目標。
4. 【語言與語氣】：使用繁體中文（台灣慣用專業詞彙），語氣專業、清晰、富有激勵性，繁簡得宜，善用 Markdown 格式化、條列與重點加粗。`;

export interface ChatMessagePayload {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface StreamCallbacks {
  onChunk: (text: string) => void;
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

    // 第一則訊息必須是 user，跳過開頭的預設 assistant 歡迎訊息
    if (contents.length === 0 && role === 'model') {
      continue;
    }

    // 若與上一則訊息同角色，合併文字，確保嚴格交替
    if (contents.length > 0 && contents[contents.length - 1].role === role) {
      contents[contents.length - 1].parts[0].text += `\n\n${m.content.trim()}`;
    } else {
      contents.push({
        role,
        parts: [{ text: m.content.trim() }],
      });
    }
  }

  // 只保留最近 10 輪對話（且確保第一則是 user）
  while (contents.length > 10) {
    contents.shift();
  }
  while (contents.length > 0 && contents[0].role !== 'user') {
    contents.shift();
  }

  return contents;
}

/**
 * 透過 Google 官方端點串流呼叫 Gemini API
 */
export async function streamGeminiChat(
  messages: ChatMessagePayload[],
  mode: TutorMode,
  enableSearch: boolean,
  callbacks: StreamCallbacks
): Promise<void> {
  const apiKey = getStoredApiKey();

  // 僅在「完全未設定 API Key」時，才使用內建離線知識庫引擎
  if (!apiKey) {
    simulateOfflineResponse(messages[messages.length - 1]?.content || '', mode, callbacks);
    return;
  }

  const contents = buildValidGeminiContents(messages);
  if (contents.length === 0) {
    callbacks.onError(new Error('請輸入有效的問題內容。'));
    return;
  }

  const systemPrompt = getModeSystemPrompt(mode);
  const tools = enableSearch ? [{ googleSearch: {} }] : undefined;

  const userPreferredModel = getStoredModel();

  // 預設優先候選順序：優先使用官方支援度最廣、負載最低的 Flash Lite / Flash 最新別名
  const defaultFallbacks = [
    'gemini-flash-lite-latest',
    'gemini-3.1-flash-lite-preview',
    'gemini-flash-latest',
    'gemini-3-flash-preview',
    'gemini-3.8-flash',
  ];

  let candidateModels: string[];
  if (userPreferredModel === 'auto') {
    candidateModels = [...defaultFallbacks];
  } else {
    // 若使用者手動指定了某個模型，優先嘗試該模型，若遇 503/404 再自動退回備援清單
    candidateModels = [
      userPreferredModel,
      ...defaultFallbacks.filter((m) => m !== userPreferredModel),
    ];
  }

  const errorsByModel: string[] = [];

  for (const modelToTry of candidateModels) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelToTry}:streamGenerateContent?alt=sse&key=${encodeURIComponent(apiKey)}`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents,
          systemInstruction: {
            parts: [{ text: systemPrompt }],
          },
          tools,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const rawMessage = errorData.error?.message || `HTTP ${response.status}`;

        // 1. 若為 API Key 無效或權限錯誤，立即中止並回報給使用者，不需重試其他模型
        if (
          response.status === 400 &&
          (rawMessage.includes('API_KEY_INVALID') || rawMessage.toLowerCase().includes('api key not valid'))
        ) {
          callbacks.onError(
            new Error('您的 Gemini API Key 無效，請點擊右上角「API Key 設定」重新檢查並貼上正確金鑰。')
          );
          return;
        }

        if (response.status === 403) {
          callbacks.onError(
            new Error(`API 權限被拒 (403)：${rawMessage}`)
          );
          return;
        }

        // 2. 紀錄該模型失敗原因，並繼續嘗試下一個備援模型
        console.warn(`[Gemini Failover] 模型 ${modelToTry} 回應 ${response.status}: ${rawMessage}`);
        errorsByModel.push(`[${modelToTry}] ${rawMessage}`);
        continue;
      }

      if (!response.body) {
        errorsByModel.push(`[${modelToTry}] 無法讀取回應串流`);
        continue;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';
      let receivedAnyText = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith('data:')) {
            const jsonStr = trimmed.slice(5).trim();
            if (!jsonStr || jsonStr === '[DONE]') continue;
            try {
              const data = JSON.parse(jsonStr);
              const parts = data.candidates?.[0]?.content?.parts || [];
              for (const part of parts) {
                if (part.text) {
                  receivedAnyText = true;
                  callbacks.onChunk(part.text);
                }
              }
            } catch {
              // 忽略不完整的 JSON 片段
            }
          }
        }
      }

      // 處理殘留於 buffer 的最後一行
      if (buffer.trim().startsWith('data:')) {
        const jsonStr = buffer.trim().slice(5).trim();
        if (jsonStr && jsonStr !== '[DONE]') {
          try {
            const data = JSON.parse(jsonStr);
            const parts = data.candidates?.[0]?.content?.parts || [];
            for (const part of parts) {
              if (part.text) {
                receivedAnyText = true;
                callbacks.onChunk(part.text);
              }
            }
          } catch {
            // ignore
          }
        }
      }

      if (receivedAnyText) {
        callbacks.onDone();
        return; // 成功完成串流！
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

  // 若候選清單皆失敗，嘗試動態向 Google 查詢該 Key 支援的模型並呼叫第一個可用模型
  const dynamicModels = await fetchAvailableModelsForKey(apiKey);
  const untriedDynamic = dynamicModels.filter((m) => !candidateModels.includes(m));

  for (const dynModel of untriedDynamic.slice(0, 3)) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${dynModel}:streamGenerateContent?alt=sse&key=${encodeURIComponent(apiKey)}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents,
          systemInstruction: { parts: [{ text: systemPrompt }] },
          tools,
        }),
      });

      if (response.ok && response.body) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder('utf-8');
        let buffer = '';
        let receivedAnyText = false;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';
          for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.startsWith('data:')) {
              const jsonStr = trimmed.slice(5).trim();
              if (!jsonStr || jsonStr === '[DONE]') continue;
              try {
                const data = JSON.parse(jsonStr);
                const parts = data.candidates?.[0]?.content?.parts || [];
                for (const part of parts) {
                  if (part.text) {
                    receivedAnyText = true;
                    callbacks.onChunk(part.text);
                  }
                }
              } catch {
                // ignore
              }
            }
          }
        }

        if (receivedAnyText) {
          callbacks.onDone();
          return;
        }
      }
    } catch {
      // ignore and continue
    }
  }

  // 若全部嘗試皆失敗，明確回報真實 API 錯誤訊息，不再誤導為高流量尖峰
  callbacks.onError(
    new Error(
      `無法完成 Gemini API 請求。詳細原因：\n${errorsByModel.join('\n')}`
    )
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
 * 內建 iPAS 離線知識庫智慧模擬 (僅當使用者未設定 API Key 時啟動)
 */
function simulateOfflineResponse(
  query: string,
  mode: TutorMode,
  callbacks: StreamCallbacks
): void {
  const q = query.toLowerCase();
  let reply = '';

  if (q.includes('生質') || q.includes('biogenic')) {
    reply = `### 🌿 離線助教觀念指引：生質能 (Biogenic Carbon) 報告原則

依據 **ISO 14064-1:2018 第 5.2.2 條** 與 **GHG Protocol** 規定：
1. **單獨量化報告**：生物質（如木屑、生質柴油、生質能發電）燃燒所釋放之 **CO2**，屬於短週期碳循環，**必須在清冊中單獨列出報告**，嚴禁直接併入組織類別 1（直接排放）的總和中！
2. **甲烷與氧化亞氮**：燃燒生質材料所附帶產生之 **CH4** 與 **N2O**，依然屬於溫室效應氣體，仍需計入類別 1 直接排放中。

💡 **解題關鍵提示**：看到生質燃料燃燒 CO2 考題，請牢記「單獨揭露，不得加總進類別一總和」之原則！`;
  } else if (q.includes('類別') || q.includes('scope') || q.includes('iso 14064-1') || q.includes('範疇')) {
    reply = `### 📘 離線助教觀念指引：ISO 14064-1 六大類別 vs 範疇三

依據 **ISO 14064-1:2018 第 5.2 節**：
- **類別 1 (Scope 1)**：直接排放（自有鍋爐、製程、公務車、冷媒逸散）。
- **類別 2 (Scope 2)**：輸入能源之能源間接排放（外購電力、蒸氣、冷卻水）。
- **類別 3 ~ 6 (對應 Scope 3)**：
  - 類別 3：**運輸間接**（委外物流車隊、員工差旅高鐵/飛機、員工通勤）。
  - 類別 4：**組織使用之產品**（採購的原物料、機械設備資本財、委託外包廢棄物處理）。
  - 類別 5：**使用組織產品**（售出產品之消費者使用耗電/耗油、售出產品生命終期處置）。
  - 類別 6：**其他來源**。

💡 **常考陷阱題**：向外部貨運公司叫車送貨是「類別 3 (運輸)」；向供應商買入鋼板原物料則是「類別 4 (採購產品)」。兩者不可混淆！`;
  } else if (q.includes('地點') || q.includes('市場') || q.includes('範疇二') || q.includes('scope 2')) {
    reply = `### ⚡ 離線助教觀念指引：範疇二 地點基礎法 vs 市場基礎法

依據 **GHG Protocol Scope 2 Guidance**：
1. **地點基礎法 (Location-based)**：
   - 反映組織所在區域電網的平均排放密集度。
   - 計算依據：**能源署每年公告之電力排碳係數**（如 0.495 kg CO2e/度）。
2. **市場基礎法 (Market-based)**：
   - 反映組織透過合約特定採購或綠電協議的排放量。
   - 計算依據：**綠電採購合約 (PPA)**、**再生能源憑證 (T-REC)**，其排放係數通常為 0。
3. **iPAS 考點提示**：若雙重報告 (Dual Reporting) 時，組織應同時計算並揭露這兩種數值，以維持透明性。`;
  } else if (q.includes('基準年') || q.includes('base year')) {
    reply = `### 🎯 離線助教觀念指引：基準年 (Base Year) 重新計算門檻

依據 **ISO 14064-1:2018 第 6.4 節**，只有在符合下列「顯著變更」時才得重算基準年：
1. **組織邊界發生結構性改變**：如企業合併、分割、收購或外包。
2. **量化方法學重大變更**：如排放係數計算公式或數據來源有重大精進。
3. **發現重大錯誤**：累積誤差超過設定之實質性門檻 (Materiality)。

⚠️ **絕對不可重算的情形**：工廠因為市場景氣好轉、訂單增加所導致的產量或營業額「自然成長 (Organic Growth)」，**嚴禁**重算基準年！`;
  } else if (q.includes('碳費') || q.includes('氣候法') || q.includes('自主減量')) {
    reply = `### 📜 離線助教觀念指引：台灣《氣候變遷因應法》與碳費制度

依據環境部公告之碳費收費辦法：
1. **開徵門檻**：年排放量達 **2.5 萬公噸 CO2e** 之電力業及大型製造業（約 500 廠場）。
2. **費率架構**：
   - 一般費率：預定每公噸新台幣 **300 元**。
   - 優惠費率：提出自主減量計畫並經核定者，達指定行業基準可享優惠費率 **100 元**；達 SBTi 積極標準可享優惠費率 **50 元**。
3. **碳洩漏風險產業**：可申請排放量調整係數（分三期漸進退場：0.2 -> 0.4 -> 0.6），以利產業轉型。`;
  } else {
    reply = `### 🌿 iPAS 淨零碳規劃師 離線知識庫提示

你好！目前尚未設定個人 Gemini API Key，系統正以**內建離線知識庫**為您服務。

💡 **核心備考思維指引**：
- 在 iPAS 考試中，請優先確認題目問的是 **組織層級 (ISO 14064-1)** 還是 **產品層級 (ISO 14067 碳足跡)**。
- 檢查題目中的關鍵條件：組織邊界是「營運控制權」還是「股權比例」？運輸工具是否為組織自有？
- 若為計算題，請牢記核心通式：**$E = AD \\times EF \\times GWP$**，並務必檢驗單位是否已換算為公噸 CO2e。

---
🔑 *若要啟用即時 AI 動態解題，請點擊右上角「設定 API Key」填入您的 Google Gemini API Key。*`;
  }

  let index = 0;
  const timer = setInterval(() => {
    if (index < reply.length) {
      const step = Math.min(8, reply.length - index);
      callbacks.onChunk(reply.substring(index, index + step));
      index += step;
    } else {
      clearInterval(timer);
      callbacks.onDone();
    }
  }, 30);
}
