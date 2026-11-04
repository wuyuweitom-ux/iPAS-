import React, { useState, useEffect, useRef } from 'react';
import {
  Database,
  Upload,
  FileText,
  Trash2,
  Search,
  BookOpen,
  FileQuestion,
  Scale,
  PlusCircle,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Sparkles,
  RefreshCw,
  FolderOpen,
  MessageSquarePlus,
  Download,
} from 'lucide-react';
import { RagDocument, RagChunk, RagDocCategory, RagCitation } from '../types';
import {
  getAllRagDocuments,
  getAllRagChunks,
  uploadFileToRag,
  addCustomTextToRag,
  deleteRagDocument,
  clearUserUploadedRag,
  retrieveRagContext,
  exportUserRagBundle,
  importUserRagBundle,
} from '../services/ragService';
import { formatInlineRichText } from '../utils/formatMathAndMarkdown';

interface RagKnowledgeBaseProps {
  onAskTutorWithQuestion?: (promptText: string) => void;
}

const CATEGORY_META: Record<
  RagDocCategory,
  { label: string; badgeClass: string; icon: React.ReactNode }
> = {
  公版教材: {
    label: '公版教材',
    badgeClass: 'bg-emerald-950/90 text-emerald-300 border-emerald-700/60',
    icon: <BookOpen className="w-3.5 h-3.5 text-emerald-400" />,
  },
  歷年考古題: {
    label: '歷年考古題',
    badgeClass: 'bg-amber-950/90 text-amber-300 border-amber-700/60',
    icon: <FileQuestion className="w-3.5 h-3.5 text-amber-400" />,
  },
  法規標準: {
    label: '法規標準',
    badgeClass: 'bg-cyan-950/90 text-cyan-300 border-cyan-700/60',
    icon: <Scale className="w-3.5 h-3.5 text-cyan-400" />,
  },
  自訂講義: {
    label: '自訂講義',
    badgeClass: 'bg-violet-950/90 text-violet-300 border-violet-700/60',
    icon: <FileText className="w-3.5 h-3.5 text-violet-400" />,
  },
};

export const RagKnowledgeBase: React.FC<RagKnowledgeBaseProps> = ({
  onAskTutorWithQuestion,
}) => {
  const [docs, setDocs] = useState<RagDocument[]>([]);
  const [allChunks, setAllChunks] = useState<RagChunk[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<RagDocCategory>('公版教材');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // 手動貼上教材或考古題表單
  const [showManualModal, setShowManualModal] = useState(false);
  const [manualTitle, setManualTitle] = useState('');
  const [manualCategory, setManualCategory] = useState<RagDocCategory>('歷年考古題');
  const [manualContent, setManualContent] = useState('');

  // 展開預覽某份文件的知識段落
  const [expandedDocId, setExpandedDocId] = useState<string | null>(null);

  // RAG 檢索測試器
  const [testQuery, setTestQuery] = useState('');
  const [testResults, setTestResults] = useState<RagCitation[] | null>(null);
  const [isTesting, setIsTesting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const bundleInputRef = useRef<HTMLInputElement>(null);

  const handleImportBundle = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const { importedDocs, importedChunks } = await importUserRagBundle(files[0]);
      await loadKnowledgeBase();
      setSuccessMsg(
        `成功匯入知識包（共載入 ${importedDocs} 份文件、${importedChunks} 個檢索段落）！`
      );
    } catch (err: unknown) {
      const error = err as Error;
      setErrorMsg(error.message || '知識包匯入失敗');
    } finally {
      if (bundleInputRef.current) bundleInputRef.current.value = '';
    }
  };

  const loadKnowledgeBase = async () => {
    try {
      const [loadedDocs, loadedChunks] = await Promise.all([
        getAllRagDocuments(),
        getAllRagChunks(),
      ]);
      setDocs(loadedDocs);
      setAllChunks(loadedChunks);
    } catch (err) {
      console.error('Failed to load RAG DB:', err);
    }
  };

  useEffect(() => {
    loadKnowledgeBase();
  }, []);

  const handleFilesSelected = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setErrorMsg('');
    setSuccessMsg('');
    setIsUploading(true);

    try {
      let uploadedCount = 0;
      let totalChunksAdded = 0;

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setUploadStatus(`正在處理 (${i + 1}/${files.length})：${file.name}...`);
        const doc = await uploadFileToRag(file, selectedCategory, (msg: string) => {
          setUploadStatus(`[${i + 1}/${files.length}] ${msg}`);
        });
        uploadedCount++;
        totalChunksAdded += doc.chunkCount;
      }

      await loadKnowledgeBase();
      setSuccessMsg(
        `成功匯入 ${uploadedCount} 份檔案（共建立 ${totalChunksAdded} 個知識檢索段落）！對答時將自動優先引用。`
      );
    } catch (err: unknown) {
      const error = err as Error;
      setErrorMsg(error.message || '檔案解析失敗，請確認檔案格式。');
    } finally {
      setIsUploading(false);
      setUploadStatus('');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualTitle.trim() || !manualContent.trim()) return;
    setErrorMsg('');
    setSuccessMsg('');
    setIsUploading(true);

    try {
      const { doc } = await addCustomTextToRag(manualTitle, manualCategory, manualContent);
      await loadKnowledgeBase();
      setSuccessMsg(`已新增「${doc.name}」（共切分為 ${doc.chunkCount} 個檢索段落）！`);
      setManualTitle('');
      setManualContent('');
      setShowManualModal(false);
    } catch (err: unknown) {
      const error = err as Error;
      setErrorMsg(error.message || '新增文字失敗');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteDoc = async (doc: RagDocument) => {
    if (doc.isBuiltIn) return;
    if (!window.confirm(`確定要從本地 RAG 知識庫移除「${doc.name}」嗎？`)) return;
    await deleteRagDocument(doc.id);
    await loadKnowledgeBase();
    if (expandedDocId === doc.id) setExpandedDocId(null);
  };

  const handleClearAllUserDocs = async () => {
    const userDocs = docs.filter((d) => !d.isBuiltIn);
    if (userDocs.length === 0) return;
    if (
      !window.confirm(
        `確定要清除所有自訂上傳的 ${userDocs.length} 份文件嗎？（內建公版核心精要將保留）`
      )
    ) {
      return;
    }
    await clearUserUploadedRag();
    await loadKnowledgeBase();
    setSuccessMsg('已清除所有自訂上傳文件。');
  };

  const handleRunTestSearch = async (e?: React.FormEvent, customQuery?: string) => {
    if (e) e.preventDefault();
    const q = (customQuery ?? testQuery).trim();
    if (!q) return;
    if (customQuery) setTestQuery(customQuery);
    setIsTesting(true);
    try {
      const res = await retrieveRagContext(q, 4);
      setTestResults(res.citations);
    } finally {
      setIsTesting(false);
    }
  };

  const userUploadedCount = docs.filter((d) => !d.isBuiltIn).length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-emerald-950/50 to-slate-900 border border-emerald-800/50 rounded-2xl p-6 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-medium">
              <Database className="w-3.5 h-3.5" />
              <span>混合式 RAG 檢索增強引擎 (BM25 + 專業詞彙加權 + Google Search 自動備援)</span>
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              📚 iPAS 歷年考古題與公版教材 RAG 知識庫
            </h1>
            <p className="text-sm text-slate-300 max-w-3xl leading-relaxed">
              上傳您的 <strong className="text-emerald-300">iPAS 淨零碳規劃師公版教材 (PDF/TXT/MD)</strong> 或{' '}
              <strong className="text-amber-300">歷年考古題題庫 (PDF/CSV/JSON)</strong>。
              助教對答時會<strong className="text-white underline decoration-emerald-400">優先檢索並引用您上傳的 RAG 內容</strong>；若 RAG 知識庫無相關內容，才會自動啟動 Google Search 聯網搜尋最新法規！
            </p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3 shrink-0">
            <div className="bg-slate-900/90 border border-slate-800 rounded-xl px-4 py-3 text-center">
              <div className="text-xl font-bold text-emerald-400">{docs.length}</div>
              <div className="text-[11px] text-slate-400">知識庫文件總數</div>
            </div>
            <div className="bg-slate-900/90 border border-slate-800 rounded-xl px-4 py-3 text-center">
              <div className="text-xl font-bold text-amber-400">{userUploadedCount}</div>
              <div className="text-[11px] text-slate-400">您上傳的教材/題庫</div>
            </div>
            <div className="bg-slate-900/90 border border-slate-800 rounded-xl px-4 py-3 text-center">
              <div className="text-xl font-bold text-cyan-400">{allChunks.length}</div>
              <div className="text-[11px] text-slate-400">可檢索知識段落</div>
            </div>
          </div>
        </div>
      </div>

      {/* Alerts */}
      {errorMsg && (
        <div className="bg-red-950/60 border border-red-700/60 rounded-xl p-4 flex items-center justify-between text-red-200 text-sm">
          <div className="flex items-center space-x-2.5">
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg('')} className="text-xs text-red-300 hover:underline">
            關閉
          </button>
        </div>
      )}

      {successMsg && (
        <div className="bg-emerald-950/60 border border-emerald-700/60 rounded-xl p-4 flex items-center justify-between text-emerald-200 text-sm">
          <div className="flex items-center space-x-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg('')} className="text-xs text-emerald-300 hover:underline">
            關閉
          </button>
        </div>
      )}

      {/* Upload & Live Retrieval Test Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Upload Files / Paste Text */}
        <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-lg">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white flex items-center space-x-2">
              <Upload className="w-4 h-4 text-emerald-400" />
              <span>上傳歷年考古題或公版教材 (支援多檔批次匯入)</span>
            </h2>
            <button
              onClick={() => setShowManualModal(!showManualModal)}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-emerald-950/80 hover:bg-emerald-900/70 text-emerald-300 border border-emerald-700/50 text-xs font-medium transition-all cursor-pointer"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>{showManualModal ? '切換為檔案上傳' : '直接貼上文字/考古題'}</span>
            </button>
          </div>

          {/* Category Selector */}
          <div className="space-y-1.5">
            <label className="text-xs text-slate-400 font-medium">
              步驟 1：選擇上傳資料分類（影響檢索引用標記）
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {(Object.keys(CATEGORY_META) as RagDocCategory[]).map((cat) => {
                const meta = CATEGORY_META[cat];
                const isSelected = selectedCategory === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedCategory(cat)}
                    className={`flex items-center justify-center space-x-1.5 px-3 py-2 rounded-xl border text-xs font-medium transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-600/20 border-emerald-500 text-emerald-200 shadow-sm'
                        : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {meta.icon}
                    <span>{meta.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {!showManualModal ? (
            /* File Drag & Drop Zone */
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                handleFilesSelected(e.dataTransfer.files);
              }}
              onClick={() => !isUploading && fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all cursor-pointer ${
                isUploading
                  ? 'border-emerald-500/60 bg-emerald-950/20'
                  : 'border-slate-700 hover:border-emerald-500/60 bg-slate-950/50 hover:bg-slate-950/80'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".pdf,.txt,.md,.csv,.json"
                onChange={(e) => handleFilesSelected(e.target.files)}
                className="hidden"
              />
              {isUploading ? (
                <div className="py-4 space-y-3">
                  <RefreshCw className="w-8 h-8 text-emerald-400 animate-spin mx-auto" />
                  <p className="text-sm font-medium text-emerald-300">
                    {uploadStatus || '正在解析並建立索引...'}
                  </p>
                  <p className="text-xs text-slate-400">
                    正在瀏覽器本機端進行 PDF 逐頁文字擷取與智慧段落切分
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto">
                    <FolderOpen className="w-6 h-6 text-emerald-400" />
                  </div>
                  <div className="text-sm font-medium text-slate-200">
                    點擊選擇檔案，或將檔案拖曳至此處上傳
                  </div>
                  <p className="text-xs text-slate-400">
                    支援格式：<span className="text-emerald-300 font-mono">.pdf</span>
                    （公版教材/歷屆試題卷）、
                    <span className="text-emerald-300 font-mono">.txt / .md</span>、
                    <span className="text-emerald-300 font-mono">.csv / .json</span>
                  </p>
                  <p className="text-[11px] text-slate-500">
                    🔒 資料儲存於您的瀏覽器本機 IndexedDB，重整頁面不會消失，且絕不外洩至第三方伺服器
                  </p>
                </div>
              )}
            </div>
          ) : (
            /* Manual Paste Form */
            <form
              onSubmit={handleManualSubmit}
              className="space-y-3 bg-slate-950/70 p-4 rounded-xl border border-slate-800"
            >
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs text-slate-400 mb-1">教材或考古題標題</label>
                  <input
                    type="text"
                    required
                    value={manualTitle}
                    onChange={(e) => setManualTitle(e.target.value)}
                    placeholder="例如：113年 iPAS 淨零碳規劃師 第一次考古題解析"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:border-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">分類</label>
                  <select
                    value={manualCategory}
                    onChange={(e) => setManualCategory(e.target.value as RagDocCategory)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:border-emerald-500 focus:outline-none"
                  >
                    <option value="歷年考古題">歷年考古題</option>
                    <option value="公版教材">公版教材</option>
                    <option value="法規標準">法規標準</option>
                    <option value="自訂講義">自訂講義</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  貼上教材內文或考古題題目與解析（系統將自動切分為檢索段落）
                </label>
                <textarea
                  rows={5}
                  required
                  value={manualContent}
                  onChange={(e) => setManualContent(e.target.value)}
                  placeholder="在此貼上公版教材章節內容、歷年考題題目與詳解..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-xs text-white focus:border-emerald-500 focus:outline-none resize-y"
                />
              </div>
              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowManualModal(false)}
                  className="px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:text-white"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={isUploading}
                  className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium cursor-pointer"
                >
                  存入 RAG 知識庫
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Right: Live RAG Retrieval Tester */}
        <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between space-y-4 shadow-lg">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-white flex items-center space-x-2">
                <Search className="w-4 h-4 text-teal-400" />
                <span>🔍 RAG 檢索優先度測試器</span>
              </h2>
              <span className="text-[11px] text-slate-400">驗證問題是否命中 RAG</span>
            </div>

            <p className="text-xs text-slate-400">
              輸入任何考題或關鍵字，測試系統是否能從 RAG 知識庫檢索出對應教材；若無匹配，對答時將自動切換為 Google Search 上網查證。
            </p>

            <form onSubmit={(e) => handleRunTestSearch(e)} className="flex space-x-2">
              <input
                type="text"
                value={testQuery}
                onChange={(e) => setTestQuery(e.target.value)}
                placeholder="輸入測試問題，例如：生質燃料燃燒 CO2 如何報告？"
                className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
              />
              <button
                type="submit"
                disabled={isTesting || !testQuery.trim()}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 text-white rounded-xl text-xs font-medium transition-all cursor-pointer shrink-0"
              >
                檢索測試
              </button>
            </form>

            {/* Quick test pills */}
            <div className="flex flex-wrap gap-1.5">
              {[
                'CBAM 豁免門檻 50噸',
                'ISO 14068-1 碳中和減量優先順序',
                '冰水機冷媒 0.007公噸 GWP 1136',
                '員工出差延人公里碳排放計算',
                '生質燃料 CO2 報告',
              ].map((sample) => (
                <button
                  key={sample}
                  type="button"
                  onClick={() => handleRunTestSearch(undefined, sample)}
                  className="px-2 py-0.5 rounded-full bg-slate-800 hover:bg-slate-700 text-[11px] text-slate-300 border border-slate-700 cursor-pointer"
                >
                  {sample}
                </button>
              ))}
            </div>
          </div>

          {/* Test Output */}
          <div className="flex-1 bg-slate-950/80 border border-slate-800/80 rounded-xl p-3 max-h-60 overflow-y-auto space-y-2">
            {testResults === null ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-500 py-8">
                點擊上方範例或輸入問題，立即預覽 RAG 命中的教材段落與關聯度分數
              </div>
            ) : testResults.length > 0 ? (
              <>
                <div className="flex items-center justify-between text-[11px] text-emerald-400 font-medium pb-1 border-b border-slate-800">
                  <span>✅ 命中 {testResults.length} 處本地 RAG 知識庫段落（對答將優先引用）</span>
                  {onAskTutorWithQuestion && (
                    <button
                      onClick={() => onAskTutorWithQuestion(testQuery)}
                      className="text-teal-300 hover:underline flex items-center space-x-1 cursor-pointer"
                    >
                      <MessageSquarePlus className="w-3 h-3" />
                      <span>傳送至助教對答</span>
                    </button>
                  )}
                </div>
                {testResults.map((hit, idx) => (
                  <div
                    key={hit.chunkId || idx}
                    className="bg-slate-900/90 border border-slate-800 rounded-lg p-2.5 text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-emerald-300 truncate">
                        #{idx + 1} {hit.docName} ({hit.pageOrSection})
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800/60 shrink-0">
                        關聯度 {hit.score}
                      </span>
                    </div>
                    <p
                      className="text-slate-300 text-[11px] line-clamp-3 leading-relaxed"
                      dangerouslySetInnerHTML={{
                        __html: formatInlineRichText(hit.snippet, false),
                      }}
                    />
                  </div>
                ))}
              </>
            ) : (
              <div className="py-6 text-center space-y-2">
                <div className="text-xs font-medium text-amber-300">
                  🌐 本地 RAG 知識庫無直接匹配段落
                </div>
                <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                  當您在「AI 備考助教」詢問此問題時，系統判定本地 RAG 無結果後，會
                  <strong className="text-teal-300">自動啟動 Google Search 聯網搜尋</strong>
                  為您查證！
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Document List */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-2">
            <BookOpen className="w-4 h-4 text-emerald-400" />
            <h2 className="text-base font-bold text-white">
              目前已掛載之 RAG 教材與考古題清單 ({docs.length})
            </h2>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <input
              ref={bundleInputRef}
              type="file"
              accept=".json"
              onChange={(e) => handleImportBundle(e.target.files)}
              className="hidden"
            />
            <button
              onClick={() => bundleInputRef.current?.click()}
              className="flex items-center space-x-1 text-xs text-teal-300 hover:text-teal-200 px-2.5 py-1 rounded-lg bg-teal-950/50 border border-teal-800/50 cursor-pointer"
              title="匯入先前匯出的 RAG 知識庫備份包 (.json)"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>匯入知識包</span>
            </button>

            {userUploadedCount > 0 && (
              <>
                <button
                  onClick={() => exportUserRagBundle()}
                  className="flex items-center space-x-1 text-xs text-emerald-300 hover:text-emerald-200 px-2.5 py-1 rounded-lg bg-emerald-950/50 border border-emerald-800/50 cursor-pointer"
                  title="將您上傳的所有 PDF/教材匯出為單一 JSON 知識包，可備份或預載入專案"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>匯出知識包 (.json)</span>
                </button>

                <button
                  onClick={handleClearAllUserDocs}
                  className="flex items-center space-x-1 text-xs text-red-400 hover:text-red-300 px-2.5 py-1 rounded-lg bg-red-950/40 border border-red-800/40 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>清除自訂上傳 ({userUploadedCount})</span>
                </button>
              </>
            )}
          </div>
        </div>

        <div className="space-y-3">
          {docs.map((doc) => {
            const catMeta = CATEGORY_META[doc.category] || CATEGORY_META['自訂講義'];
            const isExpanded = expandedDocId === doc.id;
            const docChunks = allChunks.filter((c) => c.docId === doc.id);

            return (
              <div
                key={doc.id}
                className="bg-slate-950/70 border border-slate-800/90 rounded-xl overflow-hidden transition-all"
              >
                <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start space-x-3">
                    <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 mt-0.5">
                      {catMeta.icon}
                    </div>
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-sm text-white">{doc.name}</span>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${catMeta.badgeClass}`}
                        >
                          {catMeta.label}
                        </span>
                        {doc.id.startsWith('preload-115-') ? (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 font-semibold">
                            ✨ 115年官方公告真題 (已預載)
                          </span>
                        ) : doc.isBuiltIn ? (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                            系統內建核心知識
                          </span>
                        ) : (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-700/50">
                            使用者上傳
                          </span>
                        )}
                      </div>
                      <div className="flex items-center space-x-3 text-xs text-slate-400">
                        <span>段落數：{doc.chunkCount} 段</span>
                        <span>•</span>
                        <span>字數：{doc.charCount.toLocaleString()} 字</span>
                        <span>•</span>
                        <span>建立時間：{doc.createdAt}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 self-end sm:self-center">
                    <button
                      onClick={() => setExpandedDocId(isExpanded ? null : doc.id)}
                      className="flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 text-xs transition-all cursor-pointer"
                    >
                      <span>{isExpanded ? '收合段落' : `檢視段落 (${docChunks.length})`}</span>
                      {isExpanded ? (
                        <ChevronUp className="w-3.5 h-3.5" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5" />
                      )}
                    </button>

                    {!doc.isBuiltIn && (
                      <button
                        onClick={() => handleDeleteDoc(doc)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-950/30 transition-all cursor-pointer"
                        title="刪除此文件"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Expanded Chunk Viewer */}
                {isExpanded && (
                  <div className="border-t border-slate-800/80 bg-slate-900/50 p-4 space-y-2.5 max-h-96 overflow-y-auto">
                    {docChunks.map((chunk, cIdx) => (
                      <div
                        key={chunk.id}
                        className="bg-slate-950 border border-slate-800/80 rounded-xl p-3 text-xs space-y-1.5"
                      >
                        <div className="flex items-center justify-between text-emerald-400 font-medium">
                          <span>
                            段落 #{cIdx + 1} • {chunk.pageOrSection}
                          </span>
                          {onAskTutorWithQuestion && (
                            <button
                              onClick={() =>
                                onAskTutorWithQuestion(
                                  `請根據公版教材/考古題段落（${doc.name} - ${chunk.pageOrSection}）向我提問或解析重點：\n\n「${chunk.content.slice(0, 300)}」`
                                )
                              }
                              className="flex items-center space-x-1 text-[11px] text-teal-300 hover:text-emerald-300 cursor-pointer"
                            >
                              <Sparkles className="w-3 h-3" />
                              <span>請助教依此段落出題/解析</span>
                            </button>
                          )}
                        </div>
                        <div
                          className="text-slate-300 leading-relaxed whitespace-pre-wrap"
                          dangerouslySetInnerHTML={{
                            __html: formatInlineRichText(chunk.content, false),
                          }}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
