import React, { useState, useMemo } from 'react';
import { 
  CheckCircle2, 
  XCircle, 
  Lightbulb, 
  ArrowRight, 
  BookOpen, 
  Filter, 
  Sparkles, 
  MessageSquareShare, 
  ChevronDown, 
  ChevronUp,
  RefreshCw,
  Sliders,
  Shuffle,
  FileQuestion,
  HelpCircle,
  Database
} from 'lucide-react';
import { ExamQuestion } from '../types';
import { getAllExamQuestions } from '../services/questionBankService';

interface QuestionBankProps {
  onAskTutorWithQuestion: (questionText: string) => void;
}

export type QuizCountMode = 10 | 20 | 50 | 'ALL';

export const QuestionBank: React.FC<QuestionBankProps> = ({
  onAskTutorWithQuestion,
}) => {
  // 全部 210 題來源（包含 115 年第一次、第二次 200 道真題 + 精選考題）
  const allAvailableQuestions = useMemo(() => getAllExamQuestions(), []);

  // 測驗題數模式：10 題、20 題、50 題 或 全部 (210 題)
  const [quizCountMode, setQuizCountMode] = useState<QuizCountMode>(10);
  const [selectedSubject, setSelectedSubject] = useState<string>('ALL');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('ALL');
  const [selectedExamSource, setSelectedExamSource] = useState<string>('ALL');
  const [randomSeed, setRandomSeed] = useState<number>(1);

  // 作答狀態
  const [userAnswers, setUserAnswers] = useState<Record<string, 'A' | 'B' | 'C' | 'D'>>({});
  const [submittedStatus, setSubmittedStatus] = useState<Record<string, boolean>>({});
  const [shownHints, setShownHints] = useState<Record<string, boolean>>({});

  // 自訂題目解析輸入
  const [customQuestionInput, setCustomQuestionInput] = useState('');

  // 1. 先依科目、難度、試卷來源篩選
  const basePool = useMemo(() => {
    return allAvailableQuestions.filter((q) => {
      const matchSubject = selectedSubject === 'ALL' || q.subject === selectedSubject;
      const matchDiff = selectedDifficulty === 'ALL' || q.difficulty === selectedDifficulty;
      const matchSource =
        selectedExamSource === 'ALL'
          ? true
          : selectedExamSource === '115-1'
          ? q.topic.includes('115年第一次')
          : selectedExamSource === '115-2'
          ? q.topic.includes('115年第二次')
          : q.topic.includes('官方精選');
      return matchSubject && matchDiff && matchSource;
    });
  }, [allAvailableQuestions, selectedSubject, selectedDifficulty, selectedExamSource]);

  // 2. 依選擇的題數 (10 / 20 / 50 / ALL) 與抽題種子產生當前作答清單
  const activeQuestions = useMemo(() => {
    if (quizCountMode === 'ALL') {
      return basePool;
    }
    // 依隨機種子洗牌後切出指定題數
    const poolCopy = [...basePool];
    // 簡單偽隨機打亂演算法 (由 randomSeed 控制)
    let s = randomSeed;
    for (let i = poolCopy.length - 1; i > 0; i--) {
      s = (s * 9301 + 49297) % 233280;
      const j = Math.floor((s / 233280) * (i + 1));
      [poolCopy[i], poolCopy[j]] = [poolCopy[j], poolCopy[i]];
    }
    return poolCopy.slice(0, Math.min(quizCountMode, poolCopy.length));
  }, [basePool, quizCountMode, randomSeed]);

  // 計分統計
  const totalInSet = activeQuestions.length;
  const currentSetAnswered = activeQuestions.filter((q) => submittedStatus[q.id]).length;
  const currentSetCorrect = activeQuestions.filter(
    (q) => submittedStatus[q.id] && userAnswers[q.id] === q.answer
  ).length;
  const accuracy =
    currentSetAnswered > 0 ? Math.round((currentSetCorrect / currentSetAnswered) * 100) : 0;

  const handleSelectOption = (questionId: string, optionKey: 'A' | 'B' | 'C' | 'D') => {
    if (submittedStatus[questionId]) return;
    setUserAnswers((prev) => ({ ...prev, [questionId]: optionKey }));
  };

  const handleSubmitAnswer = (questionId: string) => {
    if (!userAnswers[questionId]) return;
    setSubmittedStatus((prev) => ({ ...prev, [questionId]: true }));
  };

  const toggleHint = (questionId: string) => {
    setShownHints((prev) => ({ ...prev, [questionId]: !prev[questionId] }));
  };

  const handleShuffleNewQuestions = () => {
    setRandomSeed((prev) => prev + 1);
    setUserAnswers({});
    setSubmittedStatus({});
    setShownHints({});
  };

  const handleResetQuiz = () => {
    if (window.confirm('確定要清除當前作答紀錄嗎？')) {
      setUserAnswers({});
      setSubmittedStatus({});
      setShownHints({});
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      {/* Top Banner & Stats */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-emerald-950 border border-emerald-800/40 rounded-2xl p-6 shadow-xl text-white">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center space-x-1">
                <Database className="w-3.5 h-3.5 text-emerald-400" />
                <span>RAG 真題庫擴充完成 (共 {allAvailableQuestions.length} 道真題)</span>
              </span>
              <span className="text-xs text-amber-300 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800/40">
                收錄 115 年第一次與第二次全科目真題
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold mt-2 text-slate-100 flex items-center space-x-2">
              <span>iPAS 淨零碳規劃師 官方真題模擬演練庫</span>
            </h2>
            <p className="text-sm text-slate-300 mt-1 max-w-2xl">
              直接基於 RAG 本地知識庫的 115 年真題與公版規範產生模擬測驗。您可以自由選擇每次測驗 <strong className="text-emerald-300">10 題</strong>（通勤快篩）、<strong className="text-emerald-300">20 題</strong>（課後強化）或 <strong className="text-emerald-300">50 題</strong>（模擬考全真模式），並支援隨機智能抽題！
            </p>
          </div>

          {/* Stats Badges */}
          <div className="flex items-center space-x-3 bg-slate-950/70 p-3.5 rounded-xl border border-slate-800 shrink-0">
            <div className="text-center px-3 border-r border-slate-800">
              <span className="block text-xs text-slate-400">當前測驗進度</span>
              <span className="text-lg font-bold text-white">
                {currentSetAnswered} / {totalInSet}
              </span>
            </div>
            <div className="text-center px-3 border-r border-slate-800">
              <span className="block text-xs text-slate-400">正確題數</span>
              <span className="text-lg font-bold text-emerald-400">{currentSetCorrect}</span>
            </div>
            <div className="text-center px-3">
              <span className="block text-xs text-slate-400">答題正確率</span>
              <span className="text-lg font-bold text-teal-300">{accuracy}%</span>
            </div>
          </div>
        </div>

        {/* Quiz Count Selector: 10, 20, 50, ALL */}
        <div className="mt-5 pt-4 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-slate-950/50 p-3 rounded-xl border border-slate-800/80">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center space-x-1.5 text-xs font-semibold text-emerald-400 mr-1">
              <Sliders className="w-4 h-4 text-emerald-400" />
              <span>抽題測驗模式：</span>
            </div>
            {([10, 20, 50, 'ALL'] as QuizCountMode[]).map((mode) => {
              const isSelected = quizCountMode === mode;
              const label = mode === 10 ? '⚡ 10 題 (通勤精選)' : mode === 20 ? '🎯 20 題 (單元衝刺)' : mode === 50 ? '🏆 50 題 (全真模考)' : `📚 全部真題 (${basePool.length} 題)`;
              return (
                <button
                  key={String(mode)}
                  onClick={() => {
                    setQuizCountMode(mode);
                    setUserAnswers({});
                    setSubmittedStatus({});
                    setShownHints({});
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-emerald-600 text-white shadow-md shadow-emerald-700/40 border border-emerald-400 ring-2 ring-emerald-500/30'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>

          <div className="flex items-center space-x-2">
            {quizCountMode !== 'ALL' && (
              <button
                onClick={handleShuffleNewQuestions}
                className="flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-teal-950/70 hover:bg-teal-900/80 border border-teal-700/60 text-teal-300 transition-all cursor-pointer"
                title="重新隨機抽取一組全新題目"
              >
                <Shuffle className="w-3.5 h-3.5" />
                <span>換一組全新 {quizCountMode} 題</span>
              </button>
            )}

            <button
              onClick={handleResetQuiz}
              className="flex items-center space-x-1 text-xs text-slate-400 hover:text-red-300 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 transition-all cursor-pointer"
              title="重設目前作答"
            >
              <RefreshCw className="w-3 h-3" />
              <span>清空重做</span>
            </button>
          </div>
        </div>

        {/* Filter Controls: Subject, Difficulty, Exam Source */}
        <div className="mt-3 pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center space-x-1 text-slate-400 mr-1">
              <Filter className="w-3.5 h-3.5" />
              <span>科目：</span>
            </div>
            {['ALL', '科目一', '科目二'].map((subj) => (
              <button
                key={subj}
                onClick={() => setSelectedSubject(subj)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all cursor-pointer ${
                  selectedSubject === subj
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'bg-slate-800/90 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {subj === 'ALL' ? '不限科目' : subj === '科目一' ? '科目一：淨零法規' : '科目二：盤查與碳足跡'}
              </button>
            ))}

            <div className="flex items-center space-x-1 text-slate-400 ml-2 mr-1">
              <span>試卷來源：</span>
            </div>
            {[
              { id: 'ALL', label: '全部來源' },
              { id: '115-1', label: '115年第1次 (100題)' },
              { id: '115-2', label: '115年第2次 (100題)' },
            ].map((src) => (
              <button
                key={src.id}
                onClick={() => setSelectedExamSource(src.id)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all cursor-pointer ${
                  selectedExamSource === src.id
                    ? 'bg-amber-600 text-white shadow-sm'
                    : 'bg-slate-800/90 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {src.label}
              </button>
            ))}

            <div className="flex items-center space-x-1 text-slate-400 ml-2 mr-1">
              <span>難度：</span>
            </div>
            {['ALL', '基礎', '中等', '進階'].map((diff) => (
              <button
                key={diff}
                onClick={() => setSelectedDifficulty(diff)}
                className={`px-2 py-1 rounded-md text-xs font-medium transition-all cursor-pointer ${
                  selectedDifficulty === diff
                    ? 'bg-teal-600 text-white shadow-sm'
                    : 'bg-slate-800/90 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {diff === 'ALL' ? '全部難度' : diff}
              </button>
            ))}
          </div>

          <div className="text-slate-400 text-[11px]">
            符合條件題庫庫存：<strong className="text-emerald-400">{basePool.length}</strong> 題（目前顯示 <strong className="text-white">{activeQuestions.length}</strong> 題）
          </div>
        </div>
      </div>

      {/* Questions List */}
      <div className="space-y-4">
        {activeQuestions.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center text-slate-400 space-y-2">
            <FileQuestion className="w-10 h-10 text-slate-600 mx-auto" />
            <p className="text-sm font-medium text-slate-300">查無符合目前篩選條件的試題</p>
            <p className="text-xs">請嘗試將科目或難度調整為「全部」，即可載入 115 年官方公告試題！</p>
          </div>
        ) : (
          activeQuestions.map((q, index) => {
            const isSubmitted = submittedStatus[q.id];
            const selectedOption = userAnswers[q.id];
            const isCorrect = isSubmitted && selectedOption === q.answer;
            const isHintOpen = shownHints[q.id];

            return (
              <div
                key={q.id}
                className={`bg-slate-900 border rounded-2xl p-5 shadow-lg transition-all ${
                  isSubmitted
                    ? isCorrect
                      ? 'border-emerald-600/50 bg-slate-900/95'
                      : 'border-red-600/50 bg-slate-900/95'
                    : 'border-slate-800 hover:border-slate-700'
                }`}
              >
                {/* Question Header */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-slate-800 text-emerald-400 font-bold text-xs flex items-center justify-center border border-slate-700">
                      {index + 1}
                    </span>
                    <span className="px-2 py-0.5 rounded text-xs font-semibold bg-emerald-950 text-emerald-300 border border-emerald-800/40">
                      {q.subject}
                    </span>
                    <span className="px-2 py-0.5 rounded text-xs font-medium bg-slate-800 text-slate-300 border border-slate-700">
                      {q.topic}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-medium ${
                        q.difficulty === '基礎'
                          ? 'bg-blue-950 text-blue-300 border border-blue-800/40'
                          : q.difficulty === '中等'
                          ? 'bg-amber-950 text-amber-300 border border-amber-800/40'
                          : 'bg-purple-950 text-purple-300 border border-purple-800/40'
                      }`}
                    >
                      難度：{q.difficulty}
                    </span>
                  </div>

                  {isSubmitted && (
                    <div className="flex items-center space-x-1.5 shrink-0">
                      {isCorrect ? (
                        <span className="flex items-center space-x-1 text-emerald-400 font-bold text-sm bg-emerald-950/60 px-2.5 py-1 rounded-lg border border-emerald-800/60">
                          <CheckCircle2 className="w-4 h-4" />
                          <span>回答正確</span>
                        </span>
                      ) : (
                        <span className="flex items-center space-x-1 text-red-400 font-bold text-sm bg-red-950/60 px-2.5 py-1 rounded-lg border border-red-800/60">
                          <XCircle className="w-4 h-4" />
                          <span>回答錯誤</span>
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Question Body */}
                <p className="text-slate-100 font-medium text-base mb-4 leading-relaxed whitespace-pre-line">
                  {q.question}
                </p>

                {/* Options */}
                <div className="space-y-2 mb-4">
                  {q.options.map((opt) => {
                    const isThisSelected = selectedOption === opt.key;
                    let optionStyle =
                      'bg-slate-800/60 border-slate-700/80 text-slate-200 hover:bg-slate-800 cursor-pointer';

                    if (isSubmitted) {
                      if (opt.key === q.answer) {
                        optionStyle =
                          'bg-emerald-950/80 border-emerald-500 text-emerald-200 font-semibold';
                      } else if (isThisSelected && opt.key !== q.answer) {
                        optionStyle = 'bg-red-950/80 border-red-500 text-red-200 line-through';
                      } else {
                        optionStyle = 'bg-slate-900 border-slate-800 text-slate-500';
                      }
                    } else if (isThisSelected) {
                      optionStyle =
                        'bg-emerald-950/60 border-emerald-500 text-emerald-200 font-semibold ring-1 ring-emerald-500/50';
                    }

                    return (
                      <button
                        key={opt.key}
                        onClick={() => handleSelectOption(q.id, opt.key)}
                        disabled={isSubmitted}
                        className={`w-full text-left p-3 rounded-xl border flex items-center space-x-3 transition-all ${optionStyle}`}
                      >
                        <span
                          className={`w-6 h-6 rounded-lg text-xs font-bold flex items-center justify-center shrink-0 border ${
                            isThisSelected
                              ? 'bg-emerald-500 text-slate-900 border-emerald-400'
                              : 'bg-slate-700/50 text-slate-300 border-slate-600'
                          }`}
                        >
                          {opt.key}
                        </span>
                        <span className="text-sm leading-snug">{opt.text}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Action Buttons: Submit / Hint / Ask Tutor */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800/80">
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => toggleHint(q.id)}
                      className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-amber-300 bg-amber-950/40 hover:bg-amber-950/70 border border-amber-800/40 transition-all cursor-pointer"
                    >
                      <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
                      <span>{isHintOpen ? '隱藏觀念提示' : '💡 觀念提示 (不公布答案)'}</span>
                      {isHintOpen ? (
                        <ChevronUp className="w-3.5 h-3.5" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5" />
                      )}
                    </button>

                    <button
                      onClick={() =>
                        onAskTutorWithQuestion(
                          `【向助教請教試題】\n題目：${q.question}\n選項：\n${q.options
                            .map((o) => `(${o.key}) ${o.text}`)
                            .join('\n')}\n請問這題的核心法規與標準考核點是什麼？能給我思考排除選項的引導提示嗎？`
                        )
                      }
                      className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-teal-300 bg-teal-950/40 hover:bg-teal-950/70 border border-teal-800/40 transition-all cursor-pointer"
                    >
                      <MessageSquareShare className="w-3.5 h-3.5" />
                      <span>向 AI 助教深入提問</span>
                    </button>
                  </div>

                  {!isSubmitted ? (
                    <button
                      onClick={() => handleSubmitAnswer(q.id)}
                      disabled={!selectedOption}
                      className={`flex items-center space-x-1.5 px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        selectedOption
                          ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-700/30 cursor-pointer'
                          : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                      }`}
                    >
                      <span>確認答案</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  ) : (
                    <span className="text-xs text-slate-400 font-medium">
                      正確答案：
                      <strong className="text-emerald-400 font-bold text-sm ml-1">
                        ({q.answer})
                      </strong>
                    </span>
                  )}
                </div>

                {/* Socratic Hint Panel */}
                {isHintOpen && (
                  <div className="mt-3 p-3.5 rounded-xl bg-amber-950/30 border border-amber-800/40 text-amber-200 text-xs leading-relaxed space-y-1">
                    <div className="font-semibold flex items-center space-x-1 text-amber-300">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>助教解題觀念線索：</span>
                    </div>
                    <p>{q.hint}</p>
                  </div>
                )}

                {/* Official Explanation & Citation Panel */}
                {isSubmitted && (
                  <div className="mt-4 p-4 rounded-xl bg-slate-950/90 border border-slate-800 space-y-2 text-xs">
                    <div className="flex items-center space-x-2 text-emerald-400 font-semibold text-sm">
                      <BookOpen className="w-4 h-4" />
                      <span>官方解答與考點釋疑：</span>
                    </div>
                    <p className="text-slate-300 leading-relaxed whitespace-pre-line text-sm">
                      {q.explanation}
                    </p>
                    <div className="pt-2 border-t border-slate-800/80 flex items-center space-x-1 text-teal-400">
                      <span className="font-medium">法規標準引證：</span>
                      <span className="text-slate-300">{q.standardCitation}</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Custom Question Analyzer Section */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl text-white">
        <div className="flex items-center space-x-2 mb-2">
          <Sparkles className="w-5 h-5 text-emerald-400" />
          <h3 className="font-bold text-lg text-slate-100">自訂考題 / 筆記疑難即時解析</h3>
        </div>
        <p className="text-xs text-slate-400 mb-4">
          手邊有其他年度的 iPAS 考古題、坊間模擬題或官方講義看不懂的題目嗎？直接貼在下方，AI 助教將為您進行盲點診斷與引導！
        </p>
        <div className="space-y-3">
          <textarea
            rows={3}
            value={customQuestionInput}
            onChange={(e) => setCustomQuestionInput(e.target.value)}
            placeholder="請在此貼上題目、選項或法規段落..."
            className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 resize-none"
          />
          <div className="flex justify-end">
            <button
              onClick={() => {
                if (!customQuestionInput.trim()) return;
                onAskTutorWithQuestion(
                  `【考生自訂考題求助】\n${customQuestionInput}\n請不要直接給答案，請先為我剖析這題考查的標準核心概念、關鍵字提示與判斷線索！`
                );
              }}
              disabled={!customQuestionInput.trim()}
              className={`flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                customQuestionInput.trim()
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-700/20 cursor-pointer'
                  : 'bg-slate-800 text-slate-600 cursor-not-allowed'
              }`}
            >
              <MessageSquareShare className="w-4 h-4" />
              <span>送至 AI 備考助教進行觀念引導</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
