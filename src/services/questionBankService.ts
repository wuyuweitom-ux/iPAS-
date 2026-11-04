import { ExamQuestion } from '../types';
import { PRELOADED_RAG_CHUNKS } from '../data/preloadedRagDocs';
import { MOCK_QUESTIONS } from '../data/mockQuestions';

/**
 * 從 RAG 知識庫字串中精準解析考題
 */
function parseRagChunkToQuestions(content: string, docName: string, pageOrSection: string): ExamQuestion[] {
  const isSubjectOne = docName.includes('第一科') || docName.includes('L11');
  const subject: '科目一' | '科目二' = isSubjectOne ? '科目一' : '科目二';
  const subjectTitle = isSubjectOne ? '淨零碳規劃管理基礎概論' : '淨零碳盤查規範與程序概要';

  // 擷取大綱年份與科次標籤
  const examTag = docName.includes('第一次') ? '115年第一次' : docName.includes('第二次') ? '115年第二次' : '官方精選';

  const results: ExamQuestion[] = [];
  const qRegex = /第(\d+)題\s*\((?:答案[：:])?\s*([A-D])\)[：:]\s*([\s\S]*?)(?=(?:第\d+題|$))/g;
  let match;

  while ((match = qRegex.exec(content)) !== null) {
    const qNum = match[1];
    const answer = match[2] as 'A' | 'B' | 'C' | 'D';
    const body = match[3].trim();

    // 切出題目本文與選項 (A) ... (B) ... (C) ... (D) ...
    const optSplitRegex = /\(([A-D])\)/g;
    const parts = body.split(optSplitRegex);
    const questionText = (parts[0] || '').replace(/[\r\n]+/g, ' ').trim();

    const options: { key: 'A' | 'B' | 'C' | 'D'; text: string }[] = [];
    for (let i = 1; i < parts.length; i += 2) {
      const key = parts[i] as 'A' | 'B' | 'C' | 'D';
      let optText = (parts[i + 1] || '').trim();
      // 清除選項結尾的分號或句號
      optText = optText.replace(/[；;。]\s*$/, '').trim();
      options.push({ key, text: optText });
    }

    if (options.length === 4) {
      // 依題目內容動態判定考核主題與難度
      const topic = deriveTopic(questionText, isSubjectOne);
      const difficulty = deriveDifficulty(questionText);
      const hint = deriveHint(questionText, options, answer);
      const standardCitation = deriveCitation(questionText, isSubjectOne);
      const explanation = deriveExplanation(questionText, options, answer, standardCitation);

      results.push({
        id: `rag-q-${examTag}-${subject}-${qNum}`,
        subject,
        subjectTitle,
        topic: `${examTag} • ${topic}`,
        question: `【${examTag} ${subject} 第 ${qNum} 題】\n${questionText}`,
        options,
        answer,
        explanation,
        standardCitation,
        hint,
        difficulty,
      });
    }
  }

  return results;
}

function deriveTopic(qText: string, isSubjectOne: boolean): string {
  const lower = qText.toLowerCase();
  if (lower.includes('cbam') || lower.includes('碳邊境')) return '歐盟 CBAM 碳邊境調整機制';
  if (lower.includes('sbti') || lower.includes('科學基礎')) return 'SBTi 科學基礎減量目標';
  if (lower.includes('14068') || lower.includes('碳中和')) return 'ISO 14068-1:2023 碳中和管理';
  if (lower.includes('14067') || lower.includes('碳足跡') || lower.includes('pcr')) return 'ISO 14067 產品碳足跡與 LCA';
  if (lower.includes('14064') || lower.includes('類別') || lower.includes('範疇')) return 'ISO 14064-1 六大排放類別';
  if (lower.includes('氣候變遷因應法') || lower.includes('碳費') || lower.includes('自主減量')) return '台灣氣候法與碳費機制';
  if (lower.includes('re100') || lower.includes('再生能源')) return 'RE100 與再生能源憑證';
  if (lower.includes('tcfd') || lower.includes('ifrs') || lower.includes('sasb') || lower.includes('gri')) return '永續揭露與氣候財務框架';
  if (lower.includes('活動數據') || lower.includes('排放係數') || lower.includes('計算') || lower.includes('gwp')) return '排放係數法與溫盤量化計算';
  if (lower.includes('組織邊界') || lower.includes('控制權') || lower.includes('股權')) return '組織邊界與彙總方法學';
  if (lower.includes('生質') || lower.includes('biogenic')) return '生質碳 (Biogenic Carbon) 報告原則';
  return isSubjectOne ? '淨零法規與國際減碳趨勢' : '溫室氣體盤查程序與查證實務';
}

function deriveDifficulty(qText: string): '基礎' | '中等' | '進階' {
  if (qText.includes('計算') || qText.includes('公噸') || qText.includes('公式') || qText.includes('多少')) return '進階';
  if (qText.includes('下列何者不正確') || qText.includes('排除') || qText.includes('優先順序')) return '中等';
  return '基礎';
}

function deriveHint(qText: string, options: { key: string; text: string }[], answer: string): string {
  if (qText.includes('生質') || qText.includes('生物')) {
    return '生質材料燃燒釋放之 CO2 屬短週期碳循環，核心原則為「單獨揭露，不得併入類別一總和」；而其伴隨之 CH4 與 N2O 仍須計入。';
  }
  if (qText.includes('cbam') || qText.includes('碳邊境')) {
    return '注意歐盟 CBAM 2026年正式實施新規：年度進口豁免門檻改為按重量「≤50噸」，申報截止日延至「9月30日」，且不允許應用碳抵換。';
  }
  if (qText.includes('14068') || qText.includes('碳中和')) {
    return 'ISO 14068-1 減量優先順序階層：溫室氣體減量 (減碳) ➔ 溫室氣體移除 (碳移除) ➔ 最後才是碳抵換 (抵換剩餘殘餘排放)；嚴禁直接以買碳權宣稱碳中和。';
  }
  if (qText.includes('分配') || qText.includes('14067')) {
    return 'ISO 14067 與 LCA 分配階層：第一優先「避免分配」(細分或擴展邊界)，第二優先「物理分配」(質量/能量)，第三順位「經濟價值分配」。';
  }
  if (qText.includes('計算') || qText.includes('gwp')) {
    return '排放量量化通式：E = 活動數據 (AD) × 排放係數 (EF) × GWP。注意質量單位轉換（kg 換算為公噸須除以 1,000）。';
  }
  if (qText.includes('控制權') || qText.includes('邊界')) {
    return '控制權法（營運/財務）關鍵在於「是否具實質決策指導權」，具控制權認列 100%，無控制權認列 0%；環境部列管申報採「營運控制權法」。';
  }
  const correctOpt = options.find((o) => o.key === answer);
  return `核心關鍵線索圍繞「${correctOpt?.text.slice(0, 25) || '標準法規精確條文'}」，請先排除概念過於極端或責任顛倒的干擾選項。`;
}

function deriveCitation(qText: string, isSubjectOne: boolean): string {
  if (qText.includes('cbam') || qText.includes('碳邊境')) return '歐盟 Regulation (EU) 2023/956 CBAM 碳邊境調整法規。';
  if (qText.includes('14068')) return 'ISO 14068-1:2023 氣候變遷管理－過渡至淨零－第1部：碳中和。';
  if (qText.includes('14067') || qText.includes('碳足跡')) return 'ISO 14067:2018 溫室氣體－產品碳足跡－量化之要求事項與指引。';
  if (qText.includes('氣候變遷因應法') || qText.includes('碳費')) return '台灣《氣候變遷因應法》及環境部碳費徵收三子法。';
  if (qText.includes('14064') || !isSubjectOne) return 'ISO 14064-1:2018 組織層級溫室氣體排放與移除之量化與報告規範。';
  return '經濟部 iPAS 淨零碳規劃管理師考試大綱與官方規範手冊。';
}

function deriveExplanation(qText: string, options: { key: string; text: string }[], answer: string, citation: string): string {
  const correctOpt = options.find((o) => o.key === answer);
  return `【官方正確解答】：(${answer}) ${correctOpt?.text || ''}\n\n【核心考點解析】：\n依據 ${citation}，本題正確答案為 (${answer})。在備考 iPAS 鑑定時，考生需特別掌握精確標準名詞與法規邊界規範，避免混淆干擾選項之敘述盲點。`;
}

/**
 * 載入所有官方真題與精選題庫 (預載 200 題 115 官方真題 + 原有 10 題精選 = 共 210 題)
 */
export function getAllExamQuestions(): ExamQuestion[] {
  const ragQuestions: ExamQuestion[] = [];

  for (const chunk of PRELOADED_RAG_CHUNKS) {
    if (chunk.category === '歷年考古題' && chunk.docName.includes('115年')) {
      const parsed = parseRagChunkToQuestions(chunk.content, chunk.docName, chunk.pageOrSection);
      ragQuestions.push(...parsed);
    }
  }

  // 若成功解析真題，合併 MOCK_QUESTIONS，去重以防重複 ID
  const map = new Map<string, ExamQuestion>();
  for (const q of ragQuestions) {
    map.set(q.id, q);
  }
  for (const q of MOCK_QUESTIONS) {
    if (!map.has(q.id)) {
      map.set(q.id, q);
    }
  }

  return Array.from(map.values());
}
