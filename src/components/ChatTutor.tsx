import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Sparkles,
  Bot,
  User,
  Lightbulb,
  Compass,
  Scale,
  Calculator,
  Globe,
  Copy,
  Check,
  RotateCcw,
  Volume2,
  VolumeX,
  ExternalLink,
  Key,
  FileText,
  Database,
  BookOpen,
  ChevronDown,
  ChevronUp,
  Upload,
  Zap,
  MessageSquare,
} from 'lucide-react';
import { ChatMessage, TutorMode } from '../types';
import { streamGeminiChat, hasApiKey, ContextScope, getStoredModel } from '../services/geminiService';
import { getAllRagDocuments, uploadFileToRag } from '../services/ragService';
import { exportNotesToPdf } from '../utils/pdfExport';
import {
  formatInlineRichText,
  convertLatexToHtml,
  normalizeBlockMath,
  cleanTextForSpeech,
} from '../utils/formatMathAndMarkdown';

interface ChatTutorProps {
  initialPrompt?: string;
  onClearInitialPrompt?: () => void;
  onOpenApiKeyModal?: () => void;
  onOpenRagTab?: () => void;
}

export const ChatTutor: React.FC<ChatTutorProps> = ({
  initialPrompt,
  onClearInitialPrompt,
  onOpenApiKeyModal,
  onOpenRagTab,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome-1',
      role: 'assistant',
      content: `你好！我是你的 **iPAS 淨零碳規劃師** AI 備考助教（已搭載 **RAG 教材與考古題優先檢索系統**）。🌱

在每次對答中，我的檢索與教學邏輯如下：
1. 📚 **第一優先：檢索並引用 RAG 知識庫**：我會先從本地「公版教材與歷年考古題庫」檢索最相關的章節與考題。你可以點擊上方 **「📚 RAG 知識庫 / 快速上傳」** 匯入你的 PDF 教材或考古題。
2. 🌐 **第二順位：自動聯網搜尋備援**：若你的提問在 RAG 知識庫中沒有直接匹配的內容，我會**自動啟動 Google Search 上網查證**最新環境部法規或國際標準。
3. 💡 **蘇格拉底啟發引導**：面對考古題時，我會先給你法規條款提示與解題關鍵字，引導你自主判斷！`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [mode, setMode] = useState<TutorMode>('socratic');
  const [enableSearch, setEnableSearch] = useState(false);
  const [contextScope, setContextScope] = useState<ContextScope>('single');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [pdfProgress, setPdfProgress] = useState('');
  const [expandedCitationMsgIds, setExpandedCitationMsgIds] = useState<Record<string, boolean>>({});
  const [ragDocCount, setRagDocCount] = useState<number>(0);
  const [quickUploadToast, setQuickUploadToast] = useState<string>('');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const quickFileInputRef = useRef<HTMLInputElement>(null);

  const refreshRagCount = async () => {
    try {
      const docs = await getAllRagDocuments();
      setRagDocCount(docs.length);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    refreshRagCount();
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  useEffect(() => {
    if (initialPrompt) {
      setInput(initialPrompt);
      if (onClearInitialPrompt) onClearInitialPrompt();
      inputRef.current?.focus();
    }
  }, [initialPrompt, onClearInitialPrompt]);

  const handleQuickFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    try {
      const file = files[0];
      setQuickUploadToast(`正在解析並匯入「${file.name}」至 RAG 知識庫...`);
      const isExam =
        file.name.includes('題') ||
        file.name.toLowerCase().includes('exam') ||
        file.name.toLowerCase().includes('quiz');
      const doc = await uploadFileToRag(
        file,
        isExam ? '歷年考古題' : '公版教材',
        (status: string) => setQuickUploadToast(status)
      );
      await refreshRagCount();
      setQuickUploadToast(
        `✅ 已成功將「${doc.name}」（共 ${doc.chunkCount} 段）加入 RAG 知識庫！現在可直接針對該教材提問。`
      );
      setTimeout(() => setQuickUploadToast(''), 5000);
    } catch (err: unknown) {
      const error = err as Error;
      setQuickUploadToast(`⚠️ 上傳失敗：${error.message}`);
      setTimeout(() => setQuickUploadToast(''), 5000);
    } finally {
      if (quickFileInputRef.current) quickFileInputRef.current.value = '';
    }
  };

  const quickPrompts = [
    {
      label: '💡 考我一題 ISO 14064-1 類別分類',
      prompt:
        '請出 1 道 ISO 14064-1:2018 類別分類（類別 1 至 類別 6）的單選模擬題，列出選項，但暫時不要公布答案，請等待我的作答。',
    },
    {
      label: '⚖️ 生質能 CO2 排放如何報告？',
      prompt:
        '請問在 ISO 14064-1 與溫室氣體盤查議定書中，燃燒生質燃料產生的 CO2 應該如何報告？為什麼不能直接與化石排放合併？',
    },
    {
      label: '🔍 範疇二地點法 vs 市場法',
      prompt:
        '請幫我剖析範疇二 (Scope 2) 的「地點基礎法 (Location-based)」與「市場基礎法 (Market-based)」之核心觀念與常考陷阱。',
    },
    {
      label: '🧮 逸散排放與 GWP 計算引導',
      prompt:
        '請引導我練習一題「冷媒設備維修逸散」的排放量計算題，請先給予計算步驟與公式提示，讓我試算。',
    },
    {
      label: '📜 台灣碳費三子法重點',
      prompt:
        '請列舉台灣環境部公布之碳費收費辦法與自主減量計畫的核心要點，包括一般費率、優惠費率與碳洩漏風險產業規定。',
    },
  ];

  const handleSendMessage = async (textToSend?: string) => {
    const userText = textToSend || input.trim();
    if (!userText || isLoading) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: userText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);

    const assistantId = `assistant-${Date.now()}`;
    const assistantMessage: ChatMessage = {
      id: assistantId,
      role: 'assistant',
      content: '',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages([...newMessages, assistantMessage]);

    try {
      let accumulatedContent = '';

      await streamGeminiChat(
        newMessages.map((m) => ({ role: m.role, content: m.content })),
        mode,
        enableSearch,
        {
          onChunk: (text: string) => {
            accumulatedContent += text;
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId ? { ...m, content: accumulatedContent } : m
              )
            );
          },
          onMetadata: (meta) => {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId
                  ? {
                      ...m,
                      ragCitations: meta.ragCitations,
                      groundingUrls: meta.groundingUrls,
                      sourceMode: meta.sourceMode,
                    }
                  : m
              )
            );
          },
          onDone: () => {
            setIsLoading(false);
          },
          onError: (err: Error) => {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId
                  ? {
                      ...m,
                      content:
                        accumulatedContent + `\n\n⚠️ **提示**：${err.message}`,
                    }
                  : m
              )
            );
            setIsLoading(false);
          },
        },
        contextScope
      );
    } catch (err: unknown) {
      const error = err as Error;
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? {
                ...m,
                content: `發生錯誤：${error.message}`,
              }
            : m
        )
      );
      setIsLoading(false);
    }
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSpeak = (id: string, text: string) => {
    if ('speechSynthesis' in window) {
      if (speakingId === id) {
        window.speechSynthesis.cancel();
        setSpeakingId(null);
        return;
      }
      window.speechSynthesis.cancel();
      const cleanText = cleanTextForSpeech(text);
      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.lang = 'zh-TW';
      utterance.rate = 1.05;
      utterance.onend = () => setSpeakingId(null);
      utterance.onerror = () => setSpeakingId(null);
      setSpeakingId(id);
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleClearChat = () => {
    if (window.confirm('確定要清空對話紀錄嗎？')) {
      setMessages([
        {
          id: 'welcome-reset',
          role: 'assistant',
          content: '對話已重置。對答將優先檢索並引用您的 RAG 教材與歷年考古題庫，若無匹配則自動聯網查證！🌱',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        setSpeakingId(null);
      }
    }
  };

  const handleExportChatPdf = async () => {
    if (isExportingPdf) return;
    try {
      setIsExportingPdf(true);
      await exportNotesToPdf(messages, (status) => setPdfProgress(status));
    } catch (err: unknown) {
      const error = err as Error;
      alert(`匯出 PDF 發生錯誤: ${error.message}`);
    } finally {
      setIsExportingPdf(false);
      setPdfProgress('');
    }
  };

  const toggleCitationExpand = (msgId: string) => {
    setExpandedCitationMsgIds((prev) => ({
      ...prev,
      [msgId]: !prev[msgId],
    }));
  };

  // Render markdown, chemical formulas (CO₂, CH₄...), and LaTeX calculation formulas cleanly
  const renderFormattedContent = (content: string) => {
    const normalized = normalizeBlockMath(content);
    const paragraphs = normalized.split(/\n{2,}/);

    return (
      <div className="space-y-2.5 text-slate-100 text-sm leading-relaxed">
        {paragraphs.map((rawParagraph, pIdx) => {
          const paragraph = rawParagraph.trim();
          if (!paragraph) return null;

          // 1. 區塊數學公式 $$ ... $$
          if (paragraph.startsWith('$$') && paragraph.endsWith('$$')) {
            const innerMath = paragraph.slice(2, -2).trim();
            return (
              <div
                key={pIdx}
                className="bg-slate-950/90 border border-emerald-800/50 rounded-xl px-4 py-3 my-2 text-center text-base overflow-x-auto shadow-inner"
                dangerouslySetInnerHTML={{
                  __html: convertLatexToHtml(innerMath, false),
                }}
              />
            );
          }

          // 2. 程式碼區塊 ``` ... ```
          if (paragraph.startsWith('```')) {
            const lines = paragraph.split('\n');
            const code = lines.slice(1, -1).join('\n');
            return (
              <pre
                key={pIdx}
                className="bg-slate-950 p-3 rounded-lg overflow-x-auto text-xs text-emerald-200 border border-slate-800 font-mono my-2"
              >
                <code>{code}</code>
              </pre>
            );
          }

          // 3. 標題 H4 / H3 / H2
          if (paragraph.startsWith('#### ')) {
            return (
              <h5
                key={pIdx}
                className="font-bold text-teal-300 text-sm mt-2"
                dangerouslySetInnerHTML={{
                  __html: formatInlineRichText(paragraph.replace(/^####\s+/, ''), false),
                }}
              />
            );
          }
          if (paragraph.startsWith('### ')) {
            return (
              <h4
                key={pIdx}
                className="font-bold text-emerald-300 text-base mt-2"
                dangerouslySetInnerHTML={{
                  __html: formatInlineRichText(paragraph.replace(/^###\s+/, ''), false),
                }}
              />
            );
          }
          if (paragraph.startsWith('## ') || paragraph.startsWith('# ')) {
            return (
              <h3
                key={pIdx}
                className="font-bold text-emerald-400 text-lg mt-3"
                dangerouslySetInnerHTML={{
                  __html: formatInlineRichText(paragraph.replace(/^#{1,2}\s+/, ''), false),
                }}
              />
            );
          }

          // 4. 分隔線
          if (paragraph === '---' || paragraph === '***') {
            return <hr key={pIdx} className="border-slate-800 my-2" />;
          }

          // 5. Markdown 表格
          const lines = paragraph.split('\n');
          if (lines.length >= 2 && lines[0].includes('|') && lines[1].includes('---')) {
            const headerCells = lines[0]
              .split('|')
              .map((c) => c.trim())
              .filter(Boolean);
            const bodyRows = lines.slice(2).map((r) =>
              r
                .split('|')
                .map((c) => c.trim())
                .filter(Boolean)
            );
            return (
              <div key={pIdx} className="overflow-x-auto my-2 rounded-xl border border-slate-800">
                <table className="w-full text-left text-xs text-slate-200">
                  <thead className="bg-slate-950 text-emerald-300 border-b border-slate-800">
                    <tr>
                      {headerCells.map((hc, hIdx) => (
                        <th
                          key={hIdx}
                          className="px-3 py-2 font-semibold"
                          dangerouslySetInnerHTML={{ __html: formatInlineRichText(hc, false) }}
                        />
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 bg-slate-900/50">
                    {bodyRows.map((row, rIdx) => (
                      <tr key={rIdx}>
                        {row.map((cell, cIdx) => (
                          <td
                            key={cIdx}
                            className="px-3 py-2"
                            dangerouslySetInnerHTML={{ __html: formatInlineRichText(cell, false) }}
                          />
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          }

          // 6. 條列清單
          const isListBlock = lines.every(
            (l) =>
              /^\s*[-*•]\s+/.test(l) ||
              /^\s*\d+\.\s+/.test(l) ||
              l.trim() === ''
          );
          if (isListBlock) {
            const nonEmptyLines = lines.filter((l) => l.trim().length > 0);
            const isOrdered = /^\s*\d+\.\s+/.test(nonEmptyLines[0] || '');
            const ListTag = isOrdered ? 'ol' : 'ul';
            return (
              <ListTag
                key={pIdx}
                className={`${
                  isOrdered ? 'list-decimal' : 'list-disc'
                } list-inside space-y-1.5 pl-1 text-slate-200`}
              >
                {nonEmptyLines.map((it, itIdx) => {
                  const cleanedItem = it
                    .replace(/^\s*[-*•]\s+/, '')
                    .replace(/^\s*\d+\.\s+/, '');
                  return (
                    <li key={itIdx} className="leading-relaxed">
                      <span
                        dangerouslySetInnerHTML={{
                          __html: formatInlineRichText(cleanedItem, false),
                        }}
                      />
                    </li>
                  );
                })}
              </ListTag>
            );
          }

          // 7. 一般段落
          return (
            <div key={pIdx} className="space-y-1">
              {lines.map((line, lIdx) => {
                const trimmedLine = line.trim();
                if (!trimmedLine) return null;
                if (/^[-*•]\s+/.test(trimmedLine)) {
                  return (
                    <div key={lIdx} className="flex items-start space-x-2 pl-2">
                      <span className="text-emerald-400 mt-0.5">•</span>
                      <span
                        className="flex-1"
                        dangerouslySetInnerHTML={{
                          __html: formatInlineRichText(trimmedLine.replace(/^[-*•]\s+/, ''), false),
                        }}
                      />
                    </div>
                  );
                }
                return (
                  <p
                    key={lIdx}
                    dangerouslySetInnerHTML={{
                      __html: formatInlineRichText(line, false),
                    }}
                  />
                );
              })}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] max-w-6xl mx-auto px-2 sm:px-4 py-4">
      {/* Quick Upload Status Toast */}
      {quickUploadToast && (
        <div className="mb-2 px-3 py-2 rounded-xl bg-emerald-950/90 border border-emerald-600/60 text-emerald-200 text-xs flex items-center justify-between shadow-md">
          <span>{quickUploadToast}</span>
          <button
            onClick={() => setQuickUploadToast('')}
            className="text-emerald-400 hover:text-white ml-2"
          >
            ✕
          </button>
        </div>
      )}

      {/* Top Controller Bar */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 mb-3 shadow-md flex flex-wrap items-center justify-between gap-2">
        {/* Mode Selector */}
        <div className="flex items-center space-x-1 sm:space-x-2 overflow-x-auto">
          <span className="text-xs text-slate-400 font-medium hidden sm:inline">助教模式:</span>
          <button
            onClick={() => setMode('socratic')}
            className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
              mode === 'socratic'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            <Lightbulb className="w-3.5 h-3.5 text-yellow-300" />
            <span>啟發提示 (不透漏答案)</span>
          </button>

          <button
            onClick={() => setMode('diagnostic')}
            className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
              mode === 'diagnostic'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            <Compass className="w-3.5 h-3.5 text-cyan-300" />
            <span>盲點診斷</span>
          </button>

          <button
            onClick={() => setMode('standards')}
            className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
              mode === 'standards'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            <Scale className="w-3.5 h-3.5 text-amber-300" />
            <span>法規標準引證</span>
          </button>

          <button
            onClick={() => setMode('calculation')}
            className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
              mode === 'calculation'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            <Calculator className="w-3.5 h-3.5 text-violet-300" />
            <span>排放計算引導</span>
          </button>
        </div>

        {/* Tools and Actions */}
        <div className="flex items-center space-x-1.5 sm:space-x-2 flex-wrap gap-y-1">
          {/* Hidden quick file upload input */}
          <input
            ref={quickFileInputRef}
            type="file"
            accept=".pdf,.txt,.md,.csv,.json"
            onChange={(e) => handleQuickFileUpload(e.target.files)}
            className="hidden"
          />

          {/* Quick Upload File to RAG Button */}
          <button
            onClick={() => quickFileInputRef.current?.click()}
            className="flex items-center space-x-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-emerald-950/80 hover:bg-emerald-900/80 border border-emerald-700/60 text-emerald-300 transition-all cursor-pointer"
            title="快速上傳歷年考古題或公版教材 (PDF/TXT/CSV)"
          >
            <Upload className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">上傳教材/題庫</span>
          </button>

          {/* Open RAG Knowledge Base Manager */}
          {onOpenRagTab && (
            <button
              onClick={onOpenRagTab}
              className="flex items-center space-x-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 border border-slate-700 text-emerald-300 transition-all cursor-pointer"
              title="管理 RAG 歷年考古題與公版教材知識庫"
            >
              <Database className="w-3.5 h-3.5 text-emerald-400" />
              <span>RAG 庫 ({ragDocCount})</span>
            </button>
          )}

          {/* Google Search Toggle */}
          <button
            onClick={() => setEnableSearch(!enableSearch)}
            className={`flex items-center space-x-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all border cursor-pointer ${
              enableSearch
                ? 'bg-teal-950/80 border-teal-500 text-teal-300 shadow-sm'
                : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-300'
            }`}
            title="預設優先檢索 RAG，若無匹配會自動聯網。開啟此項則強制每次皆同步聯網查證"
          >
            <Globe className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">強制聯網</span>
            <span
              className={`w-2 h-2 rounded-full ml-1 ${
                enableSearch ? 'bg-teal-400 animate-pulse' : 'bg-slate-600'
              }`}
            />
          </button>

          {/* Context Scope Toggle (防429單輪專注 vs 多輪歷程) */}
          <button
            onClick={() => setContextScope(contextScope === 'single' ? 'multi' : 'single')}
            className={`flex items-center space-x-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all border cursor-pointer ${
              contextScope === 'single'
                ? 'bg-emerald-950/90 border-emerald-500/80 text-emerald-300 shadow-sm'
                : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-slate-100'
            }`}
            title={
              contextScope === 'single'
                ? '⚡ 單輪專注模式：只保留前一題題目與本次作答，節省 85% Token，徹底杜絕 429 頻率限制 (推薦刷題互動使用)'
                : '💬 多輪歷程模式：保留連續上下文，若對答長度過長可能觸發 Google 免費版每分鐘配額'
            }
          >
            {contextScope === 'single' ? (
              <>
                <Zap className="w-3.5 h-3.5 text-yellow-400" />
                <span className="hidden sm:inline">單輪專注 (防429)</span>
                <span className="sm:hidden">單輪</span>
              </>
            ) : (
              <>
                <MessageSquare className="w-3.5 h-3.5 text-sky-400" />
                <span className="hidden sm:inline">多輪歷程</span>
                <span className="sm:hidden">多輪</span>
              </>
            )}
          </button>

          {/* API Key Status / Setting */}
          {onOpenApiKeyModal && (
            <button
              onClick={onOpenApiKeyModal}
              className={`flex items-center space-x-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
                hasApiKey()
                  ? 'bg-emerald-950/70 border-emerald-700/60 text-emerald-300 hover:bg-emerald-900/60'
                  : 'bg-amber-950/60 border-amber-700/50 text-amber-300 hover:bg-amber-900/60'
              }`}
              title={
                hasApiKey()
                  ? `目前使用單一模型：${getStoredModel()} (點擊更換)`
                  : '點擊設定 Gemini API Key'
              }
            >
              <Key className="w-3.5 h-3.5" />
              <span className="hidden md:inline">
                {hasApiKey()
                  ? `模型: ${getStoredModel().replace('gemini-', '')}`
                  : '設定 Key'}
              </span>
            </button>
          )}

          <button
            onClick={handleExportChatPdf}
            disabled={isExportingPdf}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center space-x-1.5 transition-all border cursor-pointer ${
              isExportingPdf
                ? 'bg-emerald-950/80 border-emerald-600 text-emerald-300'
                : 'bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 hover:text-emerald-300 border-slate-700'
            }`}
            title="將對話與解題重點匯出為 PDF 檔案"
          >
            {isExportingPdf ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
                <span className="hidden sm:inline">{pdfProgress || '產生 PDF...'}</span>
              </>
            ) : (
              <>
                <FileText className="w-3.5 h-3.5 text-emerald-400" />
                <span className="hidden sm:inline">匯出 PDF</span>
              </>
            )}
          </button>

          <button
            onClick={handleClearChat}
            className="p-1.5 rounded-lg text-slate-400 hover:text-red-300 hover:bg-slate-800 text-xs flex items-center space-x-1 transition-all cursor-pointer"
            title="清空對話"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto space-y-4 px-1 pb-4">
        {messages.map((m) => {
          const isUser = m.role === 'user';
          const hasRagCitations = Boolean(m.ragCitations && m.ragCitations.length > 0);
          const isCitationExpanded = Boolean(expandedCitationMsgIds[m.id]);

          return (
            <div
              key={m.id}
              className={`flex items-start space-x-3 ${
                isUser ? 'flex-row-reverse space-x-reverse' : ''
              }`}
            >
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 shadow-md ${
                  isUser
                    ? 'bg-blue-600 text-white'
                    : 'bg-gradient-to-tr from-emerald-600 to-teal-500 text-white'
                }`}
              >
                {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>

              <div
                className={`max-w-[88%] sm:max-w-[80%] rounded-2xl px-4 py-3 shadow-md ${
                  isUser
                    ? 'bg-blue-600 text-white rounded-tr-none'
                    : 'bg-slate-900 border border-emerald-900/40 rounded-tl-none'
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5 border-b border-slate-700/30 pb-1.5">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-medium text-emerald-400">
                      {isUser ? '你 (考生)' : 'iPAS AI 備考助教'}
                    </span>

                    {/* Source Pipeline Badge */}
                    {!isUser && m.sourceMode && (
                      <span
                        className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-medium border ${
                          hasRagCitations
                            ? 'bg-emerald-950/90 border-emerald-700/60 text-emerald-300'
                            : 'bg-teal-950/90 border-teal-700/60 text-teal-300'
                        }`}
                      >
                        {hasRagCitations ? (
                          <>
                            <BookOpen className="w-2.5 h-2.5" />
                            <span>
                              優先引用 RAG 知識庫 ({m.ragCitations?.length} 段)
                              {m.sourceMode === 'rag+web' ? ' + 聯網補充' : ''}
                            </span>
                          </>
                        ) : (
                          <>
                            <Globe className="w-2.5 h-2.5" />
                            <span>RAG 無直接匹配・已自動聯網搜尋</span>
                          </>
                        )}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center space-x-2 text-[10px] text-slate-400">
                    <span>{m.timestamp}</span>
                    {!isUser && (
                      <>
                        <button
                          onClick={() => handleCopy(m.id, m.content)}
                          className="hover:text-emerald-300 transition-colors cursor-pointer"
                          title="複製內容"
                        >
                          {copiedId === m.id ? (
                            <Check className="w-3 h-3 text-emerald-400" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                        <button
                          onClick={() => handleSpeak(m.id, m.content)}
                          className="hover:text-emerald-300 transition-colors cursor-pointer"
                          title="語音朗讀"
                        >
                          {speakingId === m.id ? (
                            <VolumeX className="w-3 h-3 text-emerald-400 animate-pulse" />
                          ) : (
                            <Volume2 className="w-3 h-3" />
                          )}
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {isUser ? (
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{m.content}</p>
                ) : (
                  <div>{renderFormattedContent(m.content)}</div>
                )}

                {/* RAG Citations Expandable Drawer */}
                {!isUser && hasRagCitations && (
                  <div className="mt-3 pt-2.5 border-t border-slate-800/90 text-xs">
                    <button
                      onClick={() => toggleCitationExpand(m.id)}
                      className="w-full flex items-center justify-between text-left px-2.5 py-1.5 rounded-lg bg-emerald-950/40 hover:bg-emerald-950/70 border border-emerald-800/40 text-emerald-300 transition-all cursor-pointer"
                    >
                      <span className="flex items-center space-x-1.5 font-medium">
                        <Database className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span>
                          📚 本次回答優先引用的 RAG 教材與考古題依據 ({m.ragCitations?.length} 處)
                        </span>
                      </span>
                      <span className="flex items-center space-x-1 text-[11px] text-emerald-400">
                        <span>{isCitationExpanded ? '收合原文' : '展開檢視原文'}</span>
                        {isCitationExpanded ? (
                          <ChevronUp className="w-3.5 h-3.5" />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5" />
                        )}
                      </span>
                    </button>

                    {isCitationExpanded && (
                      <div className="mt-2 space-y-2 pl-1">
                        {m.ragCitations?.map((cit, idx) => (
                          <div
                            key={cit.chunkId}
                            className="bg-slate-950/90 border border-slate-800 rounded-xl p-2.5 space-y-1"
                          >
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="font-semibold text-emerald-300">
                                📖 [{idx + 1}] {cit.docName} — {cit.pageOrSection}
                              </span>
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-900 text-slate-400 border border-slate-800">
                                檢索分數 {cit.score}
                              </span>
                            </div>
                            <p
                              className="text-[11px] text-slate-300 leading-relaxed"
                              dangerouslySetInnerHTML={{
                                __html: formatInlineRichText(cit.snippet, false),
                              }}
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Web Search Grounding references if present */}
                {m.groundingUrls && m.groundingUrls.length > 0 && (
                  <div className="mt-3 pt-2 border-t border-slate-800 text-xs">
                    <span className="text-teal-400 font-medium flex items-center space-x-1 mb-1">
                      <Globe className="w-3 h-3" />
                      <span>🌐 網路搜尋查證來源 (Google Search Grounding):</span>
                    </span>
                    <ul className="space-y-1">
                      {m.groundingUrls.map((link, idx) => (
                        <li key={idx}>
                          <a
                            href={link.uri}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-slate-400 hover:text-emerald-300 flex items-center space-x-1 transition-colors truncate"
                          >
                            <ExternalLink className="w-3 h-3 shrink-0" />
                            <span className="truncate">{link.title || link.uri}</span>
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {isLoading && (
          <div className="flex items-center space-x-2 text-slate-400 text-xs pl-11">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span>助教正在優先檢索 RAG 歷年考古題與公版教材，若無匹配將自動聯網查證...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Quick Prompts */}
      <div className="py-2 overflow-x-auto flex items-center space-x-2 text-xs scrollbar-none">
        <span className="text-slate-400 whitespace-nowrap flex items-center space-x-1 text-[11px]">
          <Sparkles className="w-3 h-3 text-emerald-400" />
          <span>精選練習:</span>
        </span>
        {quickPrompts.map((qp, index) => (
          <button
            key={index}
            onClick={() => handleSendMessage(qp.prompt)}
            disabled={isLoading}
            className="px-2.5 py-1 bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 hover:text-emerald-300 rounded-full border border-slate-700 whitespace-nowrap transition-all cursor-pointer text-xs"
          >
            {qp.label}
          </button>
        ))}
      </div>

      {/* Context Scope Indicator & Hint */}
      <div className="flex items-center justify-between px-2 pb-1.5 text-[11px] text-slate-400">
        <div className="flex items-center space-x-1.5">
          {contextScope === 'single' ? (
            <>
              <Zap className="w-3.5 h-3.5 text-yellow-400 shrink-0" />
              <span className="text-emerald-300 font-semibold">⚡ 單輪專注模式 (防429)：</span>
              <span className="text-slate-400 hidden sm:inline">僅帶上一題背景與本次作答，省 85% Token，不觸發配額限制</span>
            </>
          ) : (
            <>
              <MessageSquare className="w-3.5 h-3.5 text-sky-400 shrink-0" />
              <span className="text-sky-300 font-semibold">💬 多輪歷程模式：</span>
              <span className="text-slate-400 hidden sm:inline">保留完整對談上下文</span>
            </>
          )}
        </div>
        <button
          type="button"
          onClick={() => setContextScope(contextScope === 'single' ? 'multi' : 'single')}
          className="text-xs text-slate-400 hover:text-emerald-300 underline underline-offset-2 transition-colors cursor-pointer"
        >
          {contextScope === 'single' ? '切換多輪歷程' : '切換單輪專注 (防429)'}
        </button>
      </div>

      {/* Input Form */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-2 shadow-lg focus-within:border-emerald-600 transition-all">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="flex items-end space-x-2"
        >
          <textarea
            ref={inputRef}
            rows={2}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            placeholder="貼上考古題或詢問考點（系統將優先引用 RAG 教材與考古題，若無則自動上網搜尋）... (Enter 送出)"
            className="flex-1 bg-transparent border-0 text-slate-100 placeholder-slate-500 text-sm focus:ring-0 resize-none p-1.5 focus:outline-none"
          />

          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className={`p-2.5 rounded-lg flex items-center justify-center transition-all ${
              isLoading || !input.trim()
                ? 'bg-slate-800 text-slate-600 cursor-not-allowed'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-700/20 cursor-pointer'
            }`}
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
