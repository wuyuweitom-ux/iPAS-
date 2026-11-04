import { ExamQuestion } from '../types';

export const MOCK_QUESTIONS: ExamQuestion[] = [
  {
    id: 'ipas-q01',
    subject: '科目二',
    subjectTitle: '企業溫室氣體盤查與碳足跡實務',
    topic: 'ISO 14064-1 類別分類',
    question: '某製造工廠委託外部物流車隊，將其生產完成的產品運送至各大經銷商門市。依據 ISO 14064-1:2018 標準，該物流運送過程中所產生的溫室氣體排放，應歸類於下列何者？',
    options: [
      { key: 'A', text: '類別 1：直接溫室氣體排放與移除' },
      { key: 'B', text: '類別 2：輸入能源之能源間接溫室氣體排放' },
      { key: 'C', text: '類別 3：運輸產生的間接溫室氣體排放' },
      { key: 'D', text: '類別 4：組織使用之產品所產生的間接溫室氣體排放' }
    ],
    answer: 'C',
    explanation: '依據 ISO 14064-1:2018，類別 3 為「運輸產生的間接溫室氣體排放」，涵蓋上游原物料採購運輸、下游產品銷售運送、員工差旅及通勤等由非組織擁有或控制之運具所產生的排放。因該物流車隊為外部委託，非組織自有資產，故屬類別 3。',
    standardCitation: 'ISO 14064-1:2018 第 5.2.4 節「類別 3：運輸產生的間接溫室氣體排放」。',
    hint: '請注意運輸工具的「所有權與控制權」：非自有外部車輛且屬於運送情境時，應歸類於間接運輸分類。',
    difficulty: '基礎'
  },
  {
    id: 'ipas-q02',
    subject: '科目二',
    subjectTitle: '企業溫室氣體盤查與碳足跡實務',
    topic: '生質能排放 (Biogenic Carbon)',
    question: '某生質發電廠在廠內鍋爐燃燒木質顆粒燃料產生蒸氣。依據 ISO 14064-1:2018 及 GHG Protocol 規定，關於生質材料燃燒所釋放之二氧化碳 (CO2) 應如何報告？',
    options: [
      { key: 'A', text: '直接計入類別 1 (Scope 1) 組織直接排放總量之中' },
      { key: 'B', text: '單獨量化並獨立於組織排放總量之外進行報告' },
      { key: 'C', text: '視為碳中和零排放，毋須在盤查報告書中作任何揭露' },
      { key: 'D', text: '直接併入類別 4 產品使用階段進行扣抵' }
    ],
    answer: 'B',
    explanation: '依 ISO 14064-1:2018 第 5.2.2 條及 GHG Protocol 規定，生物質 (Biomass) 燃燒直接釋放之生質二氧化碳 (Biogenic CO2) 必須單獨量化並在盤查清冊中單獨報告，不得與人為化石燃料排放直接加總為組織排放總量。但燃燒生質燃料所產生的 CH4 與 N2O 仍須計入類別 1 化石排放中。',
    standardCitation: 'ISO 14064-1:2018 第 5.2.2 節「直接溫室氣體排放與移除」及第 9.3.2 節報告要求。',
    hint: '碳循環中，生物質短期碳循環釋放的 CO2 與地底深埋的化石燃料性質不同，標準要求「單獨揭露，不得混淆加總」。',
    difficulty: '中等'
  },
  {
    id: 'ipas-q03',
    subject: '科目二',
    subjectTitle: '企業溫室氣體盤查與碳足跡實務',
    topic: '組織邊界 (Organizational Boundary)',
    question: '某跨國企業擁有子公司 A 之 60% 股權，但合約明定由少數股東負責全部日常營運及財務決策。若該母公司採用「營運控制權法 (Operational Control Approach)」設定組織邊界，則該母公司應如何認列子公司 A 的排放量？',
    options: [
      { key: 'A', text: '按 60% 股權比例認列' },
      { key: 'B', text: '全額 100% 認列' },
      { key: 'C', text: '不予認列（0% 認列為直接排放）' },
      { key: 'D', text: '按 50% 均分認列' }
    ],
    answer: 'C',
    explanation: '依 ISO 14064-1 與 GHG Protocol 定義，採用「營運控制權法」時，組織僅就擁有全權引導其營運政策或程序的設施認列 100% 排放量；若組織對該設施無營運控制權（即使擁有股權），則不將其認列為直接排放 (Scope 1/類別 1)，而可能視為 Scope 3 投資相關排放。',
    standardCitation: 'ISO 14064-1:2018 第 5.1 節「組織邊界」控制權判定原則。',
    hint: '區分「股權比例法」與「控制權法」的核心差異：控制權法看的是「是否有權下達營運決策」，而不是持股比率。',
    difficulty: '進階'
  },
  {
    id: 'ipas-q04',
    subject: '科目一',
    subjectTitle: '淨零碳規劃基礎與法規',
    topic: '台灣氣候變遷因應法與碳費',
    question: '依據台灣《氣候變遷因應法》及環境部公告之碳費收費相關辦法，下列何者「非」碳費徵收對象提出自主減量計畫可申請之優惠措施或誘因？',
    options: [
      { key: 'A', text: '適用優惠費率（如每公噸新台幣 100 元或 50 元）' },
      { key: 'B', text: '達成指定減量目標後，免除未來 10 年全部盤查登錄義務' },
      { key: 'C', text: '可使用國內取得之自願減量專案減量額度扣抵碳費' },
      { key: 'D', text: '碳洩漏風險行業得申請排放量調整係數以過渡轉型' }
    ],
    answer: 'B',
    explanation: '依《氣候變遷因應法》第 28 條至第 30 條，溫室氣體盤查登錄為法定義務，即使提出自主減量計畫並享受優惠費率，依然必須每年按期辦理盤查並取得查驗機構第三方保證，絕不可免除盤查登錄義務。',
    standardCitation: '《氣候變遷因應法》第 21 條（盤查登錄）、第 29 條（自主減量計畫及優惠費率）。',
    hint: '溫室氣體盤查是國家監管的基石，任何碳費優惠政策都不得免除實質透明的「申報與盤查」基本義務。',
    difficulty: '基礎'
  },
  {
    id: 'ipas-q05',
    subject: '科目二',
    subjectTitle: '企業溫室氣體盤查與碳足跡實務',
    topic: '基準年重新計算門檻 (Base Year Recalculation)',
    question: '企業在設定溫室氣體排放基準年 (Base Year) 後，下列何種情況「必須」觸發基準年排放量之追溯重新計算？',
    options: [
      { key: 'A', text: '企業年度營業額因市場景氣自然成長 25%' },
      { key: 'B', text: '工廠廠房因訂單增加，全面實施 24 小時輪班生產' },
      { key: 'C', text: '企業併購另一家同業工廠，造成組織邊界結構性重大改變且超過顯著性門檻' },
      { key: 'D', text: '國際石油價格下跌導致能源使用量微幅上升' }
    ],
    answer: 'C',
    explanation: '依 ISO 14064-1:2018 第 6.4.1 節，只有當組織邊界發生「結構性改變」（如企業併購、分割、外包或收回自營）、計算方法學出現重大修正、或發現歷史重大錯誤時，才需追溯重算基準年。營業額或產量隨經濟週期的自然增減（Organic Growth/Decline）絕不可重算基準年！',
    standardCitation: 'ISO 14064-1:2018 第 6.4 節「基準年溫室氣體清冊」。',
    hint: '重算基準年的關鍵在於「結構性改變」而非「產能或營業額的自然消長」。',
    difficulty: '中等'
  },
  {
    id: 'ipas-q06',
    subject: '科目二',
    subjectTitle: '企業溫室氣體盤查與碳足跡實務',
    topic: 'ISO 14067 產品碳足跡分配原則 (Allocation)',
    question: '在進行產品碳足跡 (ISO 14067:2018) 生命週期評估時，當共同產出多種聯產品（Co-products）而無法直接拆分其排放量時，依標準所規定的處理原則順序，應優先採取何種方式？',
    options: [
      { key: 'A', text: '直接依各產品的市價經濟價值比例進行分配' },
      { key: 'B', text: '透過細分製程或擴大系統邊界來避免分配 (Avoid Allocation)' },
      { key: 'C', text: '直接依產品的物理質量 (Mass) 比例進行分配' },
      { key: 'D', text: '將所有排放全數認列於主產品，副產品視為零負擔' }
    ],
    answer: 'B',
    explanation: '依 ISO 14044 及 ISO 14067:2018 第 6.4.6 節，分配階層順序為：第一步「避免分配（細分單元製程或擴展系統邊界）」；若無法避免，第二步為「依反映物理關係的特性進行分配（如質量、能量、莫耳數）」；若物理關係仍無法反映，最後第三步才是「依經濟價值比例分配」。',
    standardCitation: 'ISO 14067:2018 第 6.4.6 節「分配程序與階層架構」。',
    hint: 'ISO 標準的核心階梯：能避免分配就優先避免，其次尋找客觀物理因果關係，最後才考慮主觀浮動的市場經濟價值。',
    difficulty: '進階'
  },
  {
    id: 'ipas-q07',
    subject: '科目一',
    subjectTitle: '淨零碳規劃基礎與法規',
    topic: '歐盟碳邊境調整機制 (CBAM)',
    question: '歐盟 CBAM 於 2026 年正式啟動財務繳費前，其列管之六大高碳洩漏風險產業項目，下列何者「不屬於」初期列管清單？',
    options: [
      { key: 'A', text: '水泥 (Cement) 與肥料 (Fertilizers)' },
      { key: 'B', text: '鋼鐵 (Iron and Steel) 與鋁 (Aluminium)' },
      { key: 'C', text: '電力 (Electricity) 與氫氣 (Hydrogen)' },
      { key: 'D', text: '紡織成衣 (Textiles) 與塑膠原料 (Polymers)' }
    ],
    answer: 'D',
    explanation: '歐盟 CBAM 初始過渡期與第一階段正式實施的六大產業為：水泥、電力、肥料、鋼鐵、鋁、氫氣。紡織與塑膠有機化學品屬於未來擴大評估納入的範圍，目前並非首波初期列管商品。',
    standardCitation: 'Regulation (EU) 2023/956 歐盟 CBAM 法案 Annex I。',
    hint: '首波六大產業記憶口訣：「水電肥鋼鋁氫」。紡織與塑膠目前暫未納入第一階段。',
    difficulty: '基礎'
  },
  {
    id: 'ipas-q08',
    subject: '科目二',
    subjectTitle: '企業溫室氣體盤查與碳足跡實務',
    topic: '溫室氣體排放計算實務',
    question: '某企業空調冷媒使用 R-134a（冷媒填充量為 100 kg）。若盤查年度依檢修紀錄發現冷媒填充漏失率為 10%，且 IPCC AR5 報告中 R-134a 的 GWP (100年期) 數值為 1,300。試問該空調設備所造成的逸散性溫室氣體排放量為多少公噸 CO2e？',
    options: [
      { key: 'A', text: '13 公噸 CO2e' },
      { key: 'B', text: '130 公噸 CO2e' },
      { key: 'C', text: '1,300 公噸 CO2e' },
      { key: 'D', text: '1.3 公噸 CO2e' }
    ],
    answer: 'A',
    explanation: '計算步驟如下：\n1. 冷媒逸散量 (活動數據) = 100 kg × 10% = 10 kg。\n2. 換算為公噸 = 10 kg ÷ 1,000 = 0.01 公噸。\n3. 排放量 (tCO2e) = 活動數據 (公噸) × GWP = 0.01 × 1,300 = 13 公噸 CO2e。',
    standardCitation: '環境部《溫室氣體排放量盤查作業指引》逸散排放計算方法學。',
    hint: '計算關鍵：注意質量單位轉換（kg 轉公噸需除以 1,000），公式為 逸散量(公噸) × GWP。',
    difficulty: '中等'
  },
  {
    id: 'ipas-q09',
    subject: '科目一',
    subjectTitle: '淨零碳規劃基礎與法規',
    topic: 'SBTi 科學基礎減量目標',
    question: '企業依據 SBTi (Science Based Targets initiative) 制定符合 1.5°C 路徑的長期淨零目標 (Net-Zero Standard) 時，標準規範企業最晚需在 2050 年達成多少比例的價值鏈直接實質減量 (Abatement)？',
    options: [
      { key: 'A', text: '至少達成 30% 減量，其餘 70% 可透過購買碳權抵銷' },
      { key: 'B', text: '至少達成 50% 減量，其餘 50% 可透過碳捕捉利用達成' },
      { key: 'C', text: '至少達成 90%~95% 的深度實質減量，僅限 5%~10% 殘餘排放可透過永久移除性碳權中和' },
      { key: 'D', text: '完全 100% 歸零，不允許任何殘餘排放或碳權中和存在' }
    ],
    answer: 'C',
    explanation: '依 SBTi 企業淨零標準 (Corporate Net-Zero Standard)，企業必須透過自身減碳行動在 2050 年前實現至少 90%（多數行業）或 95%（高碳行業）的深層脫碳減量，剩下的 5%~10% 無法避免之殘餘排放 (Residual Emissions)，方可使用高品質、永久碳移除 (Neutralization) 予以中和，嚴禁提早大額仰賴迴避型碳權充數。',
    standardCitation: 'SBTi Corporate Net-Zero Standard V1.2。',
    hint: 'SBTi 對「碳權抵換」的要求極端嚴格：90%以上必須是真實「實質減量」，不能靠買碳權漂綠。',
    difficulty: '進階'
  },
  {
    id: 'ipas-q10',
    subject: '科目二',
    subjectTitle: '企業溫室氣體盤查與碳足跡實務',
    topic: '盤查品質五大原則',
    question: '在 ISO 14064-1:2018 的盤查原則中，要求「溫室氣體資訊的彙整與報告不得有偏頗或刻意隱瞞，且在合理可行的範圍內盡量降低不確定性」，此描述符合下列哪一項原則？',
    options: [
      { key: 'A', text: '相關性 (Relevance)' },
      { key: 'B', text: '完整性 (Completeness)' },
      { key: 'C', text: '準確性 (Accuracy)' },
      { key: 'D', text: '一致性 (Consistency)' }
    ],
    answer: 'C',
    explanation: '「準確性 (Accuracy)」原則強調溫室氣體數據與計算過程應力求客觀精確、無系統性偏差，盡可能降低不確定性，以確保報告使用者能對其結果抱持合理信心。',
    standardCitation: 'ISO 14064-1:2018 第 4.5 節「準確性原則」。',
    hint: '降低計算不確定性、杜絕系統性偏頗誤差，屬於盤查原則中的「精確與真實」。',
    difficulty: '基礎'
  }
];
