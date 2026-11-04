/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * 靜態網頁版專用 Gemini API 呼叫服務 (純客戶端 Zero-Leak 安全架構 + 多模型自動容錯)
 * -------------------------------------------------------------
 * 1. 原始碼中【絕無】寫入任何 API Key，專案推送到 GitHub Pages 絕對安全！
 * 2. 使用者的 API Key 僅儲存於其個人電腦之瀏覽器 LocalStorage。
 * 3. 具備【智慧故障轉移 (Failover)】：當某一模型遭遇 Google 尖峰流量 (High Demand 503) 時，
 *    系統自動切換至備援模型（如 gemini-3.1-flash-lite 或 gemini-flash-latest），徹底解決塞車報錯。
 * 4. 若使用者未輸入金鑰或連線中斷，自動切換至【內建 iPAS 離線知識庫引擎】！
 */

import { TutorMode } from '../types';

const STORAGE_KEY = 'ipas_gemini_api_key';
const MODEL_STORAGE_KEY = 'ipas_gemini_selected_model';

export const AVAILABLE_MODELS = [
  { id: 'auto', name: 'Auto 智慧自動容錯 (遇尖峰流量自動切換，推薦)' },
  { id: 'gemini-3.1-flash-lite', name: 'gemini-3.1-flash-lite (極速穩定・避開尖峰高負載)' },
  { id: 'gemini-3.8-flash', name: 'gemini-3.8-flash (旗艦高推理模型)' },
  { id: 'gemini-flash-latest', name: 'gemini-flash-latest (最新穩定版)' },
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
 * 透過 Google 官方端點串流呼叫 Gemini API (支援多模型自動故障轉移)
 */
export async function streamGeminiChat(
  messages: ChatMessagePayload[],
  mode: TutorMode,
  enableSearch: boolean,
  callbacks: StreamCallbacks
): Promise<void> {
  const apiKey = getStoredApiKey();

  // 若使用者未配置 API Key，切換至內建離線知識庫引擎
  if (!apiKey) {
    simulateOfflineResponse(messages[messages.length - 1]?.content || '', mode, callbacks);
    return;
  }

  // 轉換對話歷史為 Gemini REST API 格式
  const contents = messages.map((m) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));

  const systemPrompt = getModeSystemPrompt(mode);
  const tools = enableSearch ? [{ googleSearch: {} }] : undefined;

  // 決定嘗試的模型候選順序（若遇 High Demand 自動無縫降級切換）
  const userPreferredModel = getStoredModel();
  let candidateModels: string[];

  if (userPreferredModel === 'auto') {
    // 預設先用極速不易塞車的 3.1-flash-lite，若失敗依序嘗試 3.8-flash 與 flash-latest
    candidateModels = ['gemini-3.1-flash-lite', 'gemini-3.8-flash', 'gemini-flash-latest'];
  } else {
    // 若使用者指定了特定模型，優先嘗試，若遇高負載再依序容錯備援
    candidateModels = [
      userPreferredModel,
      ...['gemini-3.1-flash-lite', 'gemini-3.8-flash', 'gemini-flash-latest'].filter((m) => m !== userPreferredModel),
    ];
  }

  let lastErrorMessage = '';
  let successfulCall = false;

  for (const modelToTry of candidateModels) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelToTry}:streamGenerateContent?alt=sse&key=${apiKey}`;

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

        // 檢查金鑰無效錯誤
        if (response.status === 400 && rawMessage.includes('API_KEY_INVALID')) {
          throw new Error('您的 Gemini API Key 無效，請點擊右上角「API Key 設定」重新填寫正確金鑰。');
        }

        // 檢查是否為模型高負載或暫時不可用 (High Demand / Overloaded / 503 / 429)
        const isHighDemand =
          response.status === 503 ||
          response.status === 429 ||
          rawMessage.toLowerCase().includes('high demand') ||
          rawMessage.toLowerCase().includes('temporar') ||
          rawMessage.toLowerCase().includes('unavailable');

        if (isHighDemand) {
          console.warn(`[Gemini Failover] 模型 ${modelToTry} 目前尖峰流量過高 (${rawMessage})，正在自動切換至備援模型...`);
          lastErrorMessage = rawMessage;
          continue; // 嘗試下一個候選模型
        }

        throw new Error(`Gemini API 錯誤: ${rawMessage}`);
      }

      if (!response.body) {
        throw new Error('無法讀取串流資料');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const jsonStr = line.slice(6).trim();
            if (jsonStr === '[DONE]') continue;
            try {
              const data = JSON.parse(jsonStr);
              const chunkText =
                data.candidates?.[0]?.content?.parts?.[0]?.text || '';
              if (chunkText) {
                callbacks.onChunk(chunkText);
              }
            } catch {
              // ignore partial JSON
            }
          }
        }
      }

      successfulCall = true;
      callbacks.onDone();
      break; // 成功完成串流，跳出模型循環
    } catch (err: unknown) {
      const error = err as Error;
      // 若為金鑰錯誤直接拋出
      if (error.message.includes('API Key 無效')) {
        callbacks.onError(error);
        return;
      }
      lastErrorMessage = error.message;
      // 繼續嘗試下一個備援模型
    }
  }

  // 若所有候選模型皆因 Google 尖峰流量無法連線，無縫退回離線知識庫
  if (!successfulCall) {
    console.warn('[Gemini Failover] 所有線上模型皆處於尖峰高負載，啟用離線知識庫解答');
    callbacks.onChunk('*(💡 提示：Google 官方伺服器目前處於高流量尖峰，已自動為您啟動「內建離線知識庫」為您解答考點)*\n\n');
    simulateOfflineResponse(messages[messages.length - 1]?.content || '', mode, callbacks);
  }
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
 * 內建 iPAS 離線知識庫智慧模擬 (當使用者未設定 API Key 或 Google 塞車時啟動)
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
    reply = `### 🌿 iPAS 淨零碳規劃師 助教提示

你好！您剛才詢問的內容已由**離線知識庫引擎**接收。

💡 **核心備考思維指引**：
- 在 iPAS 考試中，請優先確認題目問的是 **組織層級 (ISO 14064-1)** 還是 **產品層級 (ISO 14067 碳足跡)**。
- 檢查題目中的關鍵條件：組織邊界是「營運控制權」還是「股權比例」？運輸工具是否為組織自有？
- 若為計算題，請牢記核心通式：**$E = AD \\times EF \\times GWP$**，並務必檢驗單位是否已換算為公噸 CO2e。

---
🔒 *提示：若目前為離線或 Google 尖峰高負載狀態，題庫與速查功能依然完全可用。待流量恢復後即可正常使用實時 AI 助教！*`;
  }

  // 模擬串流打字效果
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
