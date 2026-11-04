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
  Download, 
  ExternalLink,
  ChevronRight
} from 'lucide-react';
import { ChatMessage, TutorMode } from '../types';

interface ChatTutorProps {
  initialPrompt?: string;
  onClearInitialPrompt?: () => void;
}

export const ChatTutor: React.FC<ChatTutorProps> = ({
  initialPrompt,
  onClearInitialPrompt,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome-1',
      role: 'assistant',
      content: `你好！我是你的 **iPAS 淨零碳規劃師** AI 備考助教。🌱

在備考過程中，當你遇到考古題或計算難題時：
- 💡 **我不會直接告訴你答案選項**，而是先給予觀念提示、解題思維脈絡與關鍵字，引導你自主判斷。
- 🎯 若遇到觀念盲點，我會直接為你診斷並精準引證 **ISO 14064-1**、**ISO 14067**、**GHG Protocol** 或台灣《氣候變遷因應法》條款。

你可以隨時貼上一題考古題、請我進行觀念測驗，或直接點選下方的推薦練習主題！`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [mode, setMode] = useState<TutorMode>('socratic');
  const [enableSearch, setEnableSearch] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [speakingId, setSpeakingId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

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

  const quickPrompts = [
    { label: '💡 考我一題 ISO 14064-1 類別分類', prompt: '請出 1 道 ISO 14064-1:2018 類別分類（類別 1 至 類別 6）的單選模擬題，列出選項，但暫時不要公布答案，請等待我的作答。' },
    { label: '⚖️ 生質能 CO2 排放如何報告？', prompt: '請問在 ISO 14064-1 與溫室氣體盤查議定書中，燃燒生質燃料產生的 CO2 應該如何報告？為什麼不能直接與化石排放合併？' },
    { label: '🔍 範疇二地點法 vs 市場法', prompt: '請幫我剖析範疇二 (Scope 2) 的「地點基礎法 (Location-based)」與「市場基礎法 (Market-based)」之核心觀念與常考陷阱。' },
    { label: '🧮 逸散排放與 GWP 計算引導', prompt: '請引導我練習一題「冷媒設備維修逸散」的排放量計算題，請先給予計算步驟與公式提示，讓我試算。' },
    { label: '📜 台灣碳費三子法重點', prompt: '請列舉台灣環境部公布之碳費收費辦法與自主減量計畫的核心要點，包括一般費率、優惠費率與碳洩漏風險產業規定。' },
  ];

  const getSystemPromptByMode = (m: TutorMode): string => {
    const base = `你是一位專業且權威的 iPAS 淨零碳規劃師備考助教。請針對考生提問進行專業引導與答覆。`;
    switch (m) {
      case 'socratic':
        return `${base}
【蘇格拉底啟發模式】：遇到選擇題或考題提問時，絕對不要直接說出正確答案選項（如「答案是 B」）。請先提供關鍵解題概念、法規思考方向、排除錯誤選項的邏輯線索，引導考生自行推導得出答案。`;
      case 'diagnostic':
        return `${base}
【盲點診斷模式】：請針對考生最容易搞混的觀念（如：組織邊界股權比例 vs 營運控制、類別三運輸 vs 類別四採購原料、範疇二市場基礎法憑證認定）進行對比分析，直擊認知盲區並指出常見出題陷阱。`;
      case 'standards':
        return `${base}
【國際法規引證模式】：所有解題與觀念說明必須明確引用具體國際標準章節條款，包括：ISO 14064-1:2018、ISO 14067:2018、GHG Protocol Corporate Standard、台灣《氣候變遷因應法》條款與歐盟 CBAM 規則。`;
      case 'calculation':
        return `${base}
【排放量計算引導模式】：引導考生進行溫室氣體量化計算（E = AD × EF × GWP），詳細拆解活動數據單位轉換、排放係數選擇與 GWP (AR5/AR6) 乘數步驟，確保計算精確度。`;
      default:
        return base;
    }
  };

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
      const response = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages.map((m) => ({ role: m.role, content: m.content })),
          enableSearch,
          customSystemInstruction: getSystemPromptByMode(mode),
        }),
      });

      if (!response.ok) {
        throw new Error(`伺服器回應錯誤 (${response.status})`);
      }

      if (!response.body) {
        throw new Error('無法讀取伺服器串流');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let accumulatedContent = '';
      let groundingData: Array<{ uri: string; title?: string }> = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunkStr = decoder.decode(value, { stream: true });
        const lines = chunkStr.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.slice(6).trim();
            if (dataStr === '[DONE]') break;

            try {
              const parsed = JSON.parse(dataStr);
              if (parsed.text) {
                accumulatedContent += parsed.text;
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantId
                      ? { ...m, content: accumulatedContent, groundingUrls: groundingData }
                      : m
                  )
                );
              }
              if (parsed.grounding) {
                groundingData = parsed.grounding.map((g: any) => ({
                  uri: g.web?.uri || g.uri || '',
                  title: g.web?.title || g.title || '相關參考資料',
                }));
              }
              if (parsed.error) {
                accumulatedContent += `\n\n⚠️ **提示**：${parsed.error}`;
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantId ? { ...m, content: accumulatedContent } : m
                  )
                );
              }
            } catch {
              // Ignore parse errors on incomplete chunks
            }
          }
        }
      }
    } catch (err: unknown) {
      const error = err as Error;
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? {
                ...m,
                content: `抱歉，與伺服器連線時發生錯誤：${error.message}。\n請確認後端已正常啟動並已配置 \`GEMINI_API_KEY\`。`,
              }
            : m
        )
      );
    } finally {
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
      // Clean markdown tags for clearer speech
      const cleanText = text.replace(/[*#`_>-]/g, '').trim();
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
          content: '對話已重置。請隨時向我提出考題或淨零碳標準疑問！🌱',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        setSpeakingId(null);
      }
    }
  };

  const handleExportChatMarkdown = () => {
    const mdContent = messages
      .map(
        (m) =>
          `### ${m.role === 'user' ? '👤 考生提問' : '🌿 iPAS AI 助教'} (${m.timestamp})\n\n${m.content}\n\n---`
      )
      .join('\n\n');
    const blob = new Blob([mdContent], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `iPAS-Study-Notes-${new Date().toISOString().slice(0, 10)}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Render markdown text cleanly
  const renderFormattedContent = (content: string) => {
    return (
      <div className="space-y-2 text-slate-100 text-sm leading-relaxed">
        {content.split('\n\n').map((paragraph, pIdx) => {
          if (paragraph.startsWith('### ')) {
            return (
              <h4 key={pIdx} className="font-bold text-emerald-300 text-base mt-2">
                {paragraph.replace('### ', '')}
              </h4>
            );
          }
          if (paragraph.startsWith('## ')) {
            return (
              <h3 key={pIdx} className="font-bold text-emerald-400 text-lg mt-3">
                {paragraph.replace('## ', '')}
              </h3>
            );
          }
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
          // Handle bullet lines
          if (paragraph.includes('\n- ') || paragraph.startsWith('- ')) {
            const items = paragraph.split('\n').filter((l) => l.trim().length > 0);
            return (
              <ul key={pIdx} className="list-disc list-inside space-y-1 pl-1 text-slate-200">
                {items.map((it, itIdx) => (
                  <li key={itIdx}>
                    <span
                      dangerouslySetInnerHTML={{
                        __html: it.replace(/^- /, '').replace(/\*\*(.*?)\*\*/g, '<strong class="text-emerald-300">$1</strong>'),
                      }}
                    />
                  </li>
                ))}
              </ul>
            );
          }
          return (
            <p
              key={pIdx}
              dangerouslySetInnerHTML={{
                __html: paragraph
                  .replace(/\*\*(.*?)\*\*/g, '<strong class="text-emerald-300 font-semibold">$1</strong>')
                  .replace(/`([^`]+)`/g, '<code class="bg-slate-800 px-1.5 py-0.5 rounded text-teal-300 text-xs font-mono">$1</code>'),
              }}
            />
          );
        })}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] max-w-6xl mx-auto px-2 sm:px-4 py-4">
      {/* Top Controller Bar */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 mb-3 shadow-md flex flex-wrap items-center justify-between gap-2">
        {/* Mode Selector */}
        <div className="flex items-center space-x-1 sm:space-x-2 overflow-x-auto">
          <span className="text-xs text-slate-400 font-medium hidden sm:inline">助教模式:</span>
          <button
            onClick={() => setMode('socratic')}
            className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
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
            className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
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
            className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
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
            className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
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
        <div className="flex items-center space-x-2">
          {/* Google Search Toggle */}
          <button
            onClick={() => setEnableSearch(!enableSearch)}
            className={`flex items-center space-x-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all border ${
              enableSearch
                ? 'bg-teal-950/80 border-teal-500 text-teal-300 shadow-sm'
                : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-300'
            }`}
            title="啟用 Google Search 聯網接地查證最新公告與法規"
          >
            <Globe className="w-3.5 h-3.5" />
            <span>聯網查證</span>
            <span
              className={`w-2 h-2 rounded-full ml-1 ${
                enableSearch ? 'bg-teal-400 animate-pulse' : 'bg-slate-600'
              }`}
            />
          </button>

          <button
            onClick={handleExportChatMarkdown}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 text-xs flex items-center space-x-1 transition-all"
            title="匯出筆記 Markdown"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">匯出筆記</span>
          </button>

          <button
            onClick={handleClearChat}
            className="p-1.5 rounded-lg text-slate-400 hover:text-red-300 hover:bg-slate-800 text-xs flex items-center space-x-1 transition-all"
            title="清空對話"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">清空</span>
          </button>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto space-y-4 px-1 pb-4">
        {messages.map((m) => {
          const isUser = m.role === 'user';
          return (
            <div
              key={m.id}
              className={`flex items-start space-x-3 ${isUser ? 'flex-row-reverse space-x-reverse' : ''}`}
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
                <div className="flex items-center justify-between gap-2 mb-1 border-b border-slate-700/30 pb-1">
                  <span className="text-xs font-medium text-emerald-400">
                    {isUser ? '你 (考生)' : 'iPAS AI 備考助教'}
                  </span>
                  <div className="flex items-center space-x-2 text-[10px] text-slate-400">
                    <span>{m.timestamp}</span>
                    {!isUser && (
                      <>
                        <button
                          onClick={() => handleCopy(m.id, m.content)}
                          className="hover:text-emerald-300 transition-colors"
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
                          className="hover:text-emerald-300 transition-colors"
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

                {/* Grounding references if present */}
                {m.groundingUrls && m.groundingUrls.length > 0 && (
                  <div className="mt-3 pt-2 border-t border-slate-800 text-xs">
                    <span className="text-teal-400 font-medium flex items-center space-x-1 mb-1">
                      <Globe className="w-3 h-3" />
                      <span>參考來源 (Search Grounding):</span>
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
            <span>助教正在查閱官方教材與標準規範，組織解題思路...</span>
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
            placeholder="貼上考古題、詢問 ISO 14064-1/14067 標準或請助教出題練習... (Enter 送出, Shift+Enter 換行)"
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
