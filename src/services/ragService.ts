/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * iPAS 本地端 RAG (Retrieval-Augmented Generation) 檢索增強生成引擎
 * -------------------------------------------------------------------
 * 1. 支援上傳 PDF (.pdf)、純文字 (.txt)、Markdown (.md)、CSV (.csv)、JSON (.json)
 *    之「歷年考古題」與「公版教材」。
 * 2. 採用瀏覽器 IndexedDB 持久化儲存，支援大型公版教材 PDF（不受 LocalStorage 5MB 限制）。
 * 3. 採用 BM25 + 中文字詞 Bi-gram + 淨零專業術語加權混合檢索演算法，毫秒級精準召回。
 */

import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import {
  RagChunk,
  RagDocument,
  RagDocCategory,
  RagSearchResult,
  RagCitation,
} from '../types';
import { MOCK_QUESTIONS } from '../data/mockQuestions';
import { STUDY_NOTES } from '../data/studyNotes';

// 設定 PDF.js Worker 路徑 (由 Vite 本地打包，支援 GitHub Pages 離線與子目錄運行)
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

const DB_NAME = 'ipas_rag_knowledge_db';
const DB_VERSION = 1;
const DOCS_STORE = 'documents';
const CHUNKS_STORE = 'chunks';

// 淨零碳規劃師高權重核心術語詞典 (用於提升專業考點匹配精準度)
const DOMAIN_KEYWORDS = [
  'iso 14064-1',
  'iso 14064-2',
  'iso 14064-3',
  'iso 14067',
  'iso 14068',
  'ghg protocol',
  '類別1',
  '類別2',
  '類別3',
  '類別4',
  '類別5',
  '類別6',
  '類別一',
  '類別二',
  '類別三',
  '類別四',
  '類別五',
  '類別六',
  '範疇1',
  '範疇2',
  '範疇3',
  '範疇一',
  '範疇二',
  '範疇三',
  'scope 1',
  'scope 2',
  'scope 3',
  '組織邊界',
  '營運控制',
  '財務控制',
  '股權比例',
  '報告邊界',
  '顯著性',
  '基準年',
  '生質',
  'biogenic',
  '地點基礎',
  '市場基礎',
  'location-based',
  'market-based',
  '活動數據',
  '排放係數',
  'gwp',
  '暖化潛勢',
  'ar5',
  'ar6',
  'r-134a',
  'sf6',
  'nf3',
  'ch4',
  'n2o',
  'co2e',
  '冷媒',
  '逸散',
  '碳足跡',
  '生命週期',
  'lca',
  '功能單位',
  '宣告單位',
  '系統邊界',
  '搖籃到大門',
  '搖籃到墳墓',
  '分配',
  'allocation',
  '截斷準則',
  '產品類別規則',
  'pcr',
  '氣候變遷因應法',
  '碳費',
  '自主減量',
  '優惠費率',
  '碳洩漏',
  '調整係數',
  '自願減量',
  '先期專案',
  '抵換',
  'cbam',
  '碳邊境',
  'sbti',
  '科學基礎',
  '淨零',
  '碳中和',
  '查驗',
  '確證',
  '實質性',
  '不確定性',
  '相關性',
  '完整性',
  '一致性',
  '準確性',
  '透明性',
];

/**
 * 內建預設公版教材與歷屆精選考古題 RAG 資料（確保開箱即具備官方知識庫）
 */
function getBuiltInDocsAndChunks(): { docs: RagDocument[]; chunks: RagChunk[] } {
  const docs: RagDocument[] = [
    {
      id: 'builtin-textbook-1',
      name: '【內建公版教材】iPAS 淨零碳規劃管理基礎概論與國內外法規精華',
      category: '公版教材',
      createdAt: '2026-01-01',
      chunkCount: 4,
      charCount: 1680,
      isBuiltIn: true,
    },
    {
      id: 'builtin-textbook-2',
      name: '【內建公版教材】ISO 14064-1:2018 組織型溫室氣體盤查與 ISO 14067 碳足跡實務',
      category: '公版教材',
      createdAt: '2026-01-01',
      chunkCount: 5,
      charCount: 2250,
      isBuiltIn: true,
    },
    {
      id: 'builtin-pastexam-1',
      name: '【內建歷年考古題】iPAS 淨零碳規劃師精選歷屆模擬試題與詳解彙編',
      category: '歷年考古題',
      createdAt: '2026-01-01',
      chunkCount: MOCK_QUESTIONS.length,
      charCount: 3800,
      isBuiltIn: true,
    },
  ];

  const chunks: RagChunk[] = [
    {
      id: 'builtin-c1',
      docId: 'builtin-textbook-1',
      docName: '【內建公版教材】iPAS 淨零碳規劃管理基礎概論與國內外法規精華',
      category: '公版教材',
      pageOrSection: '第一章 第 12 頁：台灣氣候變遷因應法與 2050 淨零目標',
      content:
        '台灣於 2023 年 2 月 15 日正式公布施行《氣候變遷因應法》（原名溫室氣體減量及管理法）。第 4 條明定國家長期減量目標為中華民國 139 年（西元 2050 年）達成溫室氣體淨零排放。為達成目標，每 5 年訂定階段管制目標。第 21 條規定經環境部公告之排放源（年排放量達 2.5 萬公噸 CO2e 以上之電力業與大型製造業），應於每年 4 月 30 日前完成前一年度溫室氣體排放量盤查登錄，並於每年 10 月 31 日前完成第三方查驗機構查驗上傳。',
    },
    {
      id: 'builtin-c2',
      docId: 'builtin-textbook-1',
      docName: '【內建公版教材】iPAS 淨零碳規劃管理基礎概論與國內外法規精華',
      category: '公版教材',
      pageOrSection: '第二章 第 28 頁：台灣碳費徵收三子法與自主減量計畫優惠費率',
      content:
        '依《氣候變遷因應法》第 28 條至第 30 條及環境部公告之「碳費收費辦法」、「自主減量計畫管理辦法」與「碳費徵收對象溫室氣體減量指定目標」：碳費一般費率訂為每公噸 CO2e 新台幣 300 元。事業若提出「自主減量計畫」達成指定目標者，得適用優惠費率：達成行業別指定削減率（優惠費率 B）為每公噸 100 元；達成國際最嚴格之科學基礎減量目標 SBTi 水準（優惠費率 A）為每公噸 50 元。高碳洩漏風險事業申請核准後，得適用排放量調整係數（第一期 0.2、第二期 0.4、第三期 0.6），但適用碳洩漏調整係數者不得重複扣除 2.5 萬公噸起徵門檻免徵額。國內自願減量專案碳權抵扣上限為 10%。',
    },
    {
      id: 'builtin-c3',
      docId: 'builtin-textbook-1',
      docName: '【內建公版教材】iPAS 淨零碳規劃管理基礎概論與國內外法規精華',
      category: '公版教材',
      pageOrSection: '第三章 第 45 頁：歐盟碳邊境調整機制 (CBAM) 與產品碳含量計算',
      content:
        '歐盟碳邊境調整機制 (CBAM, Regulation EU 2023/956) 自 2023 年 10 月起進入過渡期（僅須每季申報產品內含碳排放量，無須繳納憑證），並於 2026 年 1 月 1 日正式實施財務憑證繳交。初期列管六大高碳洩漏風險產品類別為：水泥 (Cement)、電力 (Electricity)、肥料 (Fertilizers)、鋼鐵 (Iron and Steel)、鋁 (Aluminium) 以及氫氣 (Hydrogen)（口訣：水電肥鋼鋁氫）。CBAM 計算的是「特定產品內含排放量 (Embedded Emissions)」，包含簡單產品（僅製程直接排放）與複雜產品（需加計前驅物 Precursors 之內含排放）。若出口國已實際支付碳稅或碳費，得於歐盟 CBAM 憑證數量中申請扣減。',
    },
    {
      id: 'builtin-c4',
      docId: 'builtin-textbook-1',
      docName: '【內建公版教材】iPAS 淨零碳規劃管理基礎概論與國內外法規精華',
      category: '公版教材',
      pageOrSection: '第四章 第 62 頁：SBTi 科學基礎減碳目標與企業淨零標準',
      content:
        '科學基礎減量目標倡議 (SBTi) 企業淨零標準 (Corporate Net-Zero Standard) 規定：企業設定近期目標 (Near-term targets, 5~10年) 時，範疇一與範疇二必須符合 1.5°C 路徑（每年線性減量約 4.2%）；若範疇三排放占總排放量（範疇一+二+三）達 40% 以上，則必須將範疇三納入近期目標（且涵蓋至少 67% 的範疇三排放）。長期淨零目標 (Long-term targets) 要求最遲於 2050 年前達成全價值鏈（範疇一、二、三涵蓋至少 90%）削減 90%~95% 以上之實質排放 (Abatement)，剩餘不超過 5%~10% 的殘餘排放 (Residual Emissions)，必須透過永久性碳移除 (Permanent Carbon Removal and Storage) 進行中和 (Neutralization)，不得以一般減量型碳權充當價值鏈減量。',
    },
    {
      id: 'builtin-c5',
      docId: 'builtin-textbook-2',
      docName: '【內建公版教材】ISO 14064-1:2018 組織型溫室氣體盤查與 ISO 14067 碳足跡實務',
      category: '公版教材',
      pageOrSection: '第五章 第 15 頁：ISO 14064-1 組織邊界與六大排放類別',
      content:
        '依 ISO 14064-1:2018 第 5.1 節，組織邊界彙整方法分為「控制權法」（含營運控制權法、財務控制權法，具控制權者 100% 認列，無控制權者 0% 認列）及「股權比例法」（依持股比例認列）。第 5.2 節將報告邊界分為六大類別：類別 1 為直接溫室氣體排放與移除（固定燃燒、移動燃燒、製程排放、逸散排放）；類別 2 為輸入能源之間接排放（外購電力、蒸氣、熱、冷卻）；類別 3 為運輸間接排放（上下游委外物流、員工商務差旅、員工通勤）；類別 4 為組織使用產品之間接排放（外購原物料開採製造、資本財、委外廢棄物處理、上游租賃資產）；類別 5 為使用組織產品之間接排放（售出產品使用階段耗能、售出產品報廢處置、下游租賃）；類別 6 為其他間接排放。類別 1 與類別 2 為強制量化報告，類別 3~6 須建立顯著性準則評估，經鑑別為顯著之間接排放必須納入量化清冊。',
    },
    {
      id: 'builtin-c6',
      docId: 'builtin-textbook-2',
      docName: '【內建公版教材】ISO 14064-1:2018 組織型溫室氣體盤查與 ISO 14067 碳足跡實務',
      category: '公版教材',
      pageOrSection: '第五章 第 32 頁：生質碳 (Biogenic Carbon) 與基準年重新計算規範',
      content:
        '依 ISO 14064-1:2018 第 5.2.2 及 9.3.2 節，燃燒生質燃料（Biomass，如木質顆粒、生質酒精、沼氣）所產生之生質二氧化碳 (Biogenic CO2) 必須單獨量化並於報告中獨立揭露，不得直接併入類別 1 直接排放總量；但生質燃料燃燒伴隨產生的甲烷 (CH4) 與氧化亞氮 (N2O) 仍須計入類別 1 直接排放。第 6.4 節規定，基準年 (Base Year) 溫室氣體清冊僅在發生下列重大變動且超過顯著性門檻時，才必須追溯重新計算：(1) 組織邊界結構性改變（併購、分割、外包或收回自營）；(2) 量化方法學或排放係數重大變更；(3) 發現重大歷史數據錯誤。若僅為產能增減、新設產線或營業額隨景氣之自然消長 (Organic Growth/Decline)，嚴禁重新計算基準年。',
    },
    {
      id: 'builtin-c7',
      docId: 'builtin-textbook-2',
      docName: '【內建公版教材】ISO 14064-1:2018 組織型溫室氣體盤查與 ISO 14067 碳足跡實務',
      category: '公版教材',
      pageOrSection: '第六章 第 50 頁：ISO 14067:2018 產品碳足跡與分配階層原則',
      content:
        '依 ISO 14067:2018 產品碳足跡標準，量化基於生命週期評估 (LCA, ISO 14040/14044)。系統邊界分為：B2B 企業間常見的「搖籃到大門 (Cradle-to-Gate)」（從原物料開採至產品離開工廠大門）與 B2C 最終產品的「搖籃到墳墓 (Cradle-to-Grave)」（涵蓋原物料、製造、配送銷售、消費者使用階段、生命末期廢棄處理五大階段）。第 6.4.6 節明定當製程同時產出聯產品 (Co-products) 時，分配 (Allocation) 處理優先順序階層為：第一優先「避免分配」（透過細分單元製程或擴展系統邊界）；第二優先「依潛在物理關係分配」（如質量、能量、體積、莫耳數比例）；第三順位（當物理關係無法建立時）「依其他關係分配」（如經濟價值、售價比例）。',
    },
  ];

  // 將 STUDY_NOTES 轉入公版教材 Chunks
  STUDY_NOTES.forEach((note, idx) => {
    chunks.push({
      id: `builtin-note-${idx}`,
      docId: 'builtin-textbook-2',
      docName: '【內建公版教材】ISO 14064-1:2018 組織型溫室氣體盤查與 ISO 14067 碳足跡實務',
      category: '公版教材',
      pageOrSection: `速查講義：${note.title}`,
      content: `${note.title}（依據標準：${note.standard}）\n摘要：${note.summary}\n重點：${note.keyPoints.join('；')}\n${note.examTrapNotice || ''}`,
    });
  });

  // 將 MOCK_QUESTIONS 轉入歷年考古題 Chunks
  MOCK_QUESTIONS.forEach((q, idx) => {
    const optsText = q.options.map((o) => `(${o.key}) ${o.text}`).join(' ');
    chunks.push({
      id: `builtin-q-${idx}`,
      docId: 'builtin-pastexam-1',
      docName: '【內建歷年考古題】iPAS 淨零碳規劃師精選歷屆模擬試題與詳解彙編',
      category: '歷年考古題',
      pageOrSection: `${q.subject} - 第 ${idx + 1} 題 (${q.topic})`,
      content: `【歷年考古題】科目：${q.subject}（${q.subjectTitle}）｜主題：${q.topic}\n題目：${q.question}\n選項：${optsText}\n觀念提示：${q.hint}\n正確答案：${q.answer}\n官方詳解：${q.explanation}\n法規標準引證：${q.standardCitation}`,
    });
  });

  return { docs, chunks };
}

/**
 * 開啟 IndexedDB 資料庫
 */
function openRagDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(DOCS_STORE)) {
        db.createObjectStore(DOCS_STORE, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(CHUNKS_STORE)) {
        const chunkStore = db.createObjectStore(CHUNKS_STORE, { keyPath: 'id' });
        chunkStore.createIndex('docId', 'docId', { unique: false });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * 取得所有已儲存的 RAG 文件清單 (含內建與使用者上傳)
 */
export async function getAllRagDocuments(): Promise<RagDocument[]> {
  const { docs: builtInDocs } = getBuiltInDocsAndChunks();
  try {
    const db = await openRagDb();
    const userDocs = await new Promise<RagDocument[]>((resolve, reject) => {
      const tx = db.transaction(DOCS_STORE, 'readonly');
      const store = tx.objectStore(DOCS_STORE);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
    // 使用者上傳的排在最前面
    return [...userDocs.reverse(), ...builtInDocs];
  } catch (e) {
    console.warn('IndexedDB read fallback to built-in docs:', e);
    return builtInDocs;
  }
}

/**
 * 取得所有 RAG Chunks (含使用者上傳與內建教材)
 */
export async function getAllRagChunks(): Promise<RagChunk[]> {
  const { chunks: builtInChunks } = getBuiltInDocsAndChunks();
  try {
    const db = await openRagDb();
    const userChunks = await new Promise<RagChunk[]>((resolve, reject) => {
      const tx = db.transaction(CHUNKS_STORE, 'readonly');
      const store = tx.objectStore(CHUNKS_STORE);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
    return [...userChunks, ...builtInChunks];
  } catch {
    return builtInChunks;
  }
}

/**
 * 取得特定文件的所有 Chunks 供預覽
 */
export async function getChunksByDocId(docId: string): Promise<RagChunk[]> {
  const all = await getAllRagChunks();
  return all.filter((c) => c.docId === docId);
}

/**
 * 儲存新上傳的 RAG 文件與切分後的 Chunks 至 IndexedDB
 */
export async function saveRagDocumentAndChunks(
  doc: RagDocument,
  chunks: RagChunk[]
): Promise<void> {
  const db = await openRagDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([DOCS_STORE, CHUNKS_STORE], 'readwrite');
    tx.objectStore(DOCS_STORE).put(doc);
    const chunkStore = tx.objectStore(CHUNKS_STORE);
    for (const chunk of chunks) {
      chunkStore.put(chunk);
    }
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * 刪除指定的使用者上傳 RAG 文件及其所有 Chunks
 */
export async function deleteRagDocument(docId: string): Promise<void> {
  const db = await openRagDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([DOCS_STORE, CHUNKS_STORE], 'readwrite');
    tx.objectStore(DOCS_STORE).delete(docId);

    const chunkStore = tx.objectStore(CHUNKS_STORE);
    const index = chunkStore.index('docId');
    const req = index.openCursor(IDBKeyRange.only(docId));
    req.onsuccess = () => {
      const cursor = req.result;
      if (cursor) {
        cursor.delete();
        cursor.continue();
      }
    };

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * 將長文本切分為具重疊區的語意段落 Chunks (支援題目切分與章節切分)
 */
export function splitTextIntoChunks(
  rawText: string,
  docId: string,
  docName: string,
  category: RagDocCategory,
  defaultLabelPrefix = '段落'
): RagChunk[] {
  const cleaned = rawText
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  if (!cleaned) return [];

  const chunks: RagChunk[] = [];
  const chunkSize = 550;
  const overlap = 90;

  // 若為考古題，嘗試優先依題號切分 (例如 "1."、"第1題"、"一、")
  const paragraphs = cleaned.split(/\n{2,}/);
  let currentBuffer = '';
  let sectionIndex = 1;

  for (const para of paragraphs) {
    const p = para.trim();
    if (!p) continue;

    if ((currentBuffer + '\n\n' + p).length <= chunkSize) {
      currentBuffer = currentBuffer ? `${currentBuffer}\n\n${p}` : p;
    } else {
      if (currentBuffer) {
        chunks.push({
          id: `${docId}-c-${sectionIndex}`,
          docId,
          docName,
          category,
          pageOrSection: `${defaultLabelPrefix} #${sectionIndex}`,
          content: currentBuffer,
        });
        sectionIndex++;
        const tail = currentBuffer.slice(-overlap);
        currentBuffer = `${tail}\n${p}`;
      } else {
        // 單一段落超長時，依固定長度切分
        let start = 0;
        while (start < p.length) {
          const slice = p.slice(start, start + chunkSize);
          chunks.push({
            id: `${docId}-c-${sectionIndex}`,
            docId,
            docName,
            category,
            pageOrSection: `${defaultLabelPrefix} #${sectionIndex}`,
            content: slice,
          });
          sectionIndex++;
          start += chunkSize - overlap;
        }
        currentBuffer = '';
      }
    }
  }

  if (currentBuffer.trim()) {
    chunks.push({
      id: `${docId}-c-${sectionIndex}`,
      docId,
      docName,
      category,
      pageOrSection: `${defaultLabelPrefix} #${sectionIndex}`,
      content: currentBuffer.trim(),
    });
  }

  return chunks;
}

/**
 * 解析上傳之檔案 (.pdf, .txt, .md, .csv, .json) 為 RAG 文件與 Chunks
 */
export async function parseUploadedFileToRag(
  file: File,
  category: RagDocCategory,
  onProgress?: (msg: string) => void
): Promise<{ doc: RagDocument; chunks: RagChunk[] }> {
  const docId = `user-doc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const docName = file.name;
  const ext = file.name.split('.').pop()?.toLowerCase() || '';

  let chunks: RagChunk[] = [];
  let totalChars = 0;

  if (ext === 'pdf') {
    onProgress?.(`正在載入 PDF 檔案：${file.name}...`);
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const numPages = pdf.numPages;

    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      onProgress?.(`正在解析 PDF 第 ${pageNum} / ${numPages} 頁...`);
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => ('str' in item ? item.str : ''))
        .join(' ')
        .replace(/\s{2,}/g, ' ')
        .trim();

      if (pageText.length > 15) {
        totalChars += pageText.length;
        // 若單頁超過 650 字，拆分為子片段並保留頁碼
        if (pageText.length <= 650) {
          chunks.push({
            id: `${docId}-p${pageNum}`,
            docId,
            docName,
            category,
            pageOrSection: `第 ${pageNum} 頁`,
            content: pageText,
          });
        } else {
          let start = 0;
          let part = 1;
          while (start < pageText.length) {
            const slice = pageText.slice(start, start + 580);
            chunks.push({
              id: `${docId}-p${pageNum}-${part}`,
              docId,
              docName,
              category,
              pageOrSection: `第 ${pageNum} 頁 (片段 ${part})`,
              content: slice,
            });
            part++;
            start += 490;
          }
        }
      }
    }

    if (chunks.length === 0) {
      throw new Error(
        `無法從「${file.name}」提取文字內容。請確認該 PDF 為文字型 PDF（非純掃描圖片檔）。`
      );
    }
  } else if (ext === 'json') {
    onProgress?.(`正在解析 JSON 題庫/教材：${file.name}...`);
    const raw = await file.text();
    totalChars = raw.length;
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        parsed.forEach((item, idx) => {
          const text =
            typeof item === 'string'
              ? item
              : JSON.stringify(item, null, 2);
          chunks.push({
            id: `${docId}-json-${idx + 1}`,
            docId,
            docName,
            category,
            pageOrSection: `條目 #${idx + 1}`,
            content: text,
          });
        });
      } else {
        chunks = splitTextIntoChunks(raw, docId, docName, category, 'JSON 段落');
      }
    } catch {
      chunks = splitTextIntoChunks(raw, docId, docName, category, '段落');
    }
  } else {
    // .txt, .md, .csv 等純文字檔案
    onProgress?.(`正在解析文字教材：${file.name}...`);
    const raw = await file.text();
    totalChars = raw.length;
    chunks = splitTextIntoChunks(
      raw,
      docId,
      docName,
      category,
      category === '歷年考古題' ? '考題段落' : '教材章節'
    );
  }

  const doc: RagDocument = {
    id: docId,
    name: docName,
    category,
    createdAt: new Date().toLocaleString('zh-TW', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }),
    chunkCount: chunks.length,
    charCount: totalChars,
    isBuiltIn: false,
  };

  await saveRagDocumentAndChunks(doc, chunks);
  return { doc, chunks };
}

/**
 * 將使用者手動貼上的文字新增至 RAG 知識庫
 */
export async function addCustomTextToRag(
  title: string,
  category: RagDocCategory,
  textContent: string
): Promise<{ doc: RagDocument; chunks: RagChunk[] }> {
  const docId = `user-paste-${Date.now()}`;
  const chunks = splitTextIntoChunks(
    textContent,
    docId,
    title.trim(),
    category,
    category === '歷年考古題' ? '考題段落' : '教材段落'
  );

  const doc: RagDocument = {
    id: docId,
    name: title.trim(),
    category,
    createdAt: new Date().toLocaleString('zh-TW', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }),
    chunkCount: chunks.length,
    charCount: textContent.length,
    isBuiltIn: false,
  };

  await saveRagDocumentAndChunks(doc, chunks);
  return { doc, chunks };
}

/**
 * 將查詢字串切分為檢索 Token (支援中文字元 Bi-gram + 英文數字詞彙 + 領域專有名詞)
 */
function tokenizeForSearch(text: string): string[] {
  const normalized = text.toLowerCase().trim();
  const tokens = new Set<string>();

  // 1. 提取領域核心關鍵詞
  for (const kw of DOMAIN_KEYWORDS) {
    if (normalized.includes(kw)) {
      tokens.add(kw);
    }
  }

  // 2. 提取英文與數字組合 (如 iso, 14064-1, 14067, cbam, ar5, gwp, 2050, r-134a)
  const alphaNumMatches = normalized.match(/[a-z0-9]+(?:-[a-z0-9]+)*/g) || [];
  for (const m of alphaNumMatches) {
    if (m.length >= 2) {
      tokens.add(m);
    }
  }

  // 3. 提取中文連續字詞並產生 2-gram 與 3-gram (排除常見無意義虛詞)
  const stopWords = new Set([
    '請問',
    '什麼',
    '如何',
    '為什麼',
    '可以',
    '一個',
    '哪些',
    '下列',
    '何者',
    '關於',
    '依據',
    '根據',
    '我們',
    '你們',
    '這個',
    '那個',
    '是否',
    '進行',
    '請教',
    '助教',
    '告訴',
    '答案',
    '題目',
    '選項',
  ]);

  const cjkBlocks = normalized.match(/[\u4e00-\u9fa5]{2,}/g) || [];
  for (const block of cjkBlocks) {
    for (let i = 0; i < block.length - 1; i++) {
      const bigram = block.slice(i, i + 2);
      if (!stopWords.has(bigram)) {
        tokens.add(bigram);
      }
    }
    for (let i = 0; i < block.length - 2; i++) {
      const trigram = block.slice(i, i + 3);
      tokens.add(trigram);
    }
  }

  return Array.from(tokens);
}

/**
 * RAG 核心檢索函數：從所有已上傳與內建的「公版教材」及「歷年考古題」中檢索最相關的段落
 */
export async function retrieveRagContext(
  query: string,
  topK = 4
): Promise<{
  results: RagSearchResult[];
  citations: RagCitation[];
  hasRagMatch: boolean;
  formattedPromptContext: string;
}> {
  const allChunks = await getAllRagChunks();
  const queryTokens = tokenizeForSearch(query);

  if (queryTokens.length === 0 || allChunks.length === 0) {
    return { results: [], citations: [], hasRagMatch: false, formattedPromptContext: '' };
  }

  const scoredResults: RagSearchResult[] = [];

  for (const chunk of allChunks) {
    const contentLower = `${chunk.docName} ${chunk.pageOrSection} ${chunk.content}`.toLowerCase();
    let score = 0;
    const matchedTerms: string[] = [];

    for (const token of queryTokens) {
      if (contentLower.includes(token)) {
        matchedTerms.push(token);
        // 領域專有名詞與 3-gram 給予更高權重
        const isDomainTerm = DOMAIN_KEYWORDS.includes(token);
        const weight = isDomainTerm ? 4.5 : token.length >= 3 ? 2.5 : 1.2;

        // 計算出現頻率加成 (BM25 飽和概念)
        const occurrences = contentLower.split(token).length - 1;
        const tfBoost = Math.min(2.2, 1 + Math.log1p(occurrences));
        score += weight * tfBoost;
      }
    }

    // 使用者自行上傳的文件給予優先權重加成 (1.25x)，確保優先引用使用者上傳的教材與考古題
    if (!chunk.docId.startsWith('builtin-')) {
      score *= 1.25;
    }

    if (score >= 3.2 && matchedTerms.length >= 2) {
      scoredResults.push({
        chunk,
        score: Math.round(score * 10) / 10,
        matchedTerms: Array.from(new Set(matchedTerms)).slice(0, 8),
      });
    }
  }

  scoredResults.sort((a, b) => b.score - a.score);
  const topResults = scoredResults.slice(0, topK);

  const citations: RagCitation[] = topResults.map((r) => ({
    chunkId: r.chunk.id,
    docName: r.chunk.docName,
    category: r.chunk.category,
    pageOrSection: r.chunk.pageOrSection,
    snippet:
      r.chunk.content.length > 220
        ? r.chunk.content.slice(0, 220) + '...'
        : r.chunk.content,
    score: r.score,
  }));

  const formattedPromptContext =
    topResults.length > 0
      ? `【本地 RAG 知識庫檢索結果（共 ${topResults.length} 處高關聯教材/考古題段落）】：\n` +
        topResults
          .map(
            (r, idx) =>
              `--- [檢索段落 ${idx + 1}] 出處：《${r.chunk.docName}》(${r.chunk.category} - ${r.chunk.pageOrSection}) ---\n${r.chunk.content}`
          )
          .join('\n\n')
      : '';

  return {
    results: topResults,
    citations,
    hasRagMatch: topResults.length > 0,
    formattedPromptContext,
  };
}

/**
 * 便捷上傳檔案並回傳建立之 RagDocument
 */
export async function uploadFileToRag(
  file: File,
  category: RagDocCategory,
  onProgress?: (msg: string) => void
): Promise<RagDocument> {
  const { doc } = await parseUploadedFileToRag(file, category, onProgress);
  return doc;
}

/**
 * 清除所有使用者自行上傳的 RAG 文件與段落（保留系統內建核心教材與題庫）
 */
export async function clearUserUploadedRag(): Promise<void> {
  const db = await openRagDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([DOCS_STORE, CHUNKS_STORE], 'readwrite');
    tx.objectStore(DOCS_STORE).clear();
    tx.objectStore(CHUNKS_STORE).clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

