import React, { useState } from 'react';
import { 
  CheckCircle2, 
  XCircle, 
  Lightbulb, 
  HelpCircle, 
  ArrowRight, 
  BookOpen, 
  Filter, 
  Sparkles, 
  MessageSquareShare, 
  ChevronDown, 
  ChevronUp,
  Award,
  RefreshCw
} from 'lucide-react';
import { ExamQuestion } from '../types';
import { MOCK_QUESTIONS } from '../data/mockQuestions';

interface QuestionBankProps {
  onAskTutorWithQuestion: (questionText: string) => void;
}

export const QuestionBank: React.FC<QuestionBankProps> = ({
  onAskTutorWithQuestion,
}) => {
  const [questions] = useState<ExamQuestion[]>(MOCK_QUESTIONS);
  const [selectedSubject, setSelectedSubject] = useState<string>('ALL');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('ALL');

  // Answers state: { [questionId]: 'A' | 'B' | 'C' | 'D' }
  const [userAnswers, setUserAnswers] = useState<Record<string, 'A' | 'B' | 'C' | 'D'>>({});
  // Submitted status: { [questionId]: boolean }
  const [submittedStatus, setSubmittedStatus] = useState<Record<string, boolean>>({});
  // Shown hints: { [questionId]: boolean }
  const [shownHints, setShownHints] = useState<Record<string, boolean>>({});

  // Custom question parser state
  const [customQuestionInput, setCustomQuestionInput] = useState('');

  const filteredQuestions = questions.filter((q) => {
    const matchSubject = selectedSubject === 'ALL' || q.subject === selectedSubject;
    const matchDiff = selectedDifficulty === 'ALL' || q.difficulty === selectedDifficulty;
    return matchSubject && matchDiff;
  });

  const totalAnswered = Object.keys(submittedStatus).length;
  const totalCorrect = Object.entries(submittedStatus).filter(([id, submitted]) => {
    if (!submitted) return false;
    const q = questions.find((item) => item.id === id);
    return q && userAnswers[id] === q.answer;
  }).length;
  const accuracy = totalAnswered > 0 ? Math.round((totalCorrect / totalAnswered) * 100) : 0;

  const handleSelectOption = (questionId: string, optionKey: 'A' | 'B' | 'C' | 'D') => {
    if (submittedStatus[questionId]) return; // locked once submitted
    setUserAnswers((prev) => ({ ...prev, [questionId]: optionKey }));
  };

  const handleSubmitAnswer = (questionId: string) => {
    if (!userAnswers[questionId]) return;
    setSubmittedStatus((prev) => ({ ...prev, [questionId]: true }));
  };

  const toggleHint = (questionId: string) => {
    setShownHints((prev) => ({ ...prev, [questionId]: !prev[questionId] }));
  };

  const handleResetQuiz = () => {
    if (window.confirm('確定要重置所有作答記錄嗎？')) {
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
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                iPAS 經濟部考證官方綱要
              </span>
              <span className="text-xs text-slate-400">最新常考題型全覆蓋</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold mt-1 text-slate-100 flex items-center space-x-2">
              <span>iPAS 淨零碳規劃師 精選歷屆模擬試題庫</span>
            </h2>
            <p className="text-sm text-slate-300 mt-1 max-w-2xl">
              練習作答前可點選「💡 觀念提示」啟發思考。作答完畢立即查閱詳細 ISO 14064-1、ISO 14067 及法規條款引證，更可一鍵向 AI 助教深入提問！
            </p>
          </div>

          {/* Stats Badges */}
          <div className="flex items-center space-x-3 bg-slate-950/60 p-3 rounded-xl border border-slate-800 shrink-0">
            <div className="text-center px-3 border-r border-slate-800">
              <span className="block text-xs text-slate-400">已作答</span>
              <span className="text-lg font-bold text-white">{totalAnswered} / {questions.length}</span>
            </div>
            <div className="text-center px-3 border-r border-slate-800">
              <span className="block text-xs text-slate-400">正確題數</span>
              <span className="text-lg font-bold text-emerald-400">{totalCorrect}</span>
            </div>
            <div className="text-center px-3">
              <span className="block text-xs text-slate-400">正確率</span>
              <span className="text-lg font-bold text-teal-300">{accuracy}%</span>
            </div>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="mt-6 pt-4 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center space-x-1.5 text-xs text-slate-400 mr-1">
              <Filter className="w-3.5 h-3.5" />
              <span>篩選科目:</span>
            </div>
            {['ALL', '科目一', '科目二'].map((subj) => (
              <button
                key={subj}
                onClick={() => setSelectedSubject(subj)}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                  selectedSubject === subj
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {subj === 'ALL' ? '全部科目' : subj === '科目一' ? '科目一：淨零法規基礎' : '科目二：溫盤與碳足跡實務'}
              </button>
            ))}

            <div className="flex items-center space-x-1.5 text-xs text-slate-400 ml-2 mr-1">
              <span>難度:</span>
            </div>
            {['ALL', '基礎', '中等', '進階'].map((diff) => (
              <button
                key={diff}
                onClick={() => setSelectedDifficulty(diff)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                  selectedDifficulty === diff
                    ? 'bg-teal-600 text-white shadow-sm'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {diff === 'ALL' ? '全部難度' : diff}
              </button>
            ))}
          </div>

          <button
            onClick={handleResetQuiz}
            className="flex items-center space-x-1 text-xs text-slate-400 hover:text-red-300 transition-colors"
          >
            <RefreshCw className="w-3 h-3" />
            <span>重新測驗</span>
          </button>
        </div>
      </div>

      {/* Questions List */}
      <div className="space-y-4">
        {filteredQuestions.map((q, index) => {
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
                  <span className="px-2 py-0.5 rounded text-xs font-medium bg-emerald-950 text-emerald-300 border border-emerald-800/40">
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
                  let optionStyle = 'bg-slate-800/60 border-slate-700/80 text-slate-200 hover:bg-slate-800';

                  if (isSubmitted) {
                    if (opt.key === q.answer) {
                      optionStyle = 'bg-emerald-950/80 border-emerald-500 text-emerald-200 font-semibold';
                    } else if (isThisSelected && opt.key !== q.answer) {
                      optionStyle = 'bg-red-950/80 border-red-500 text-red-200 line-through';
                    } else {
                      optionStyle = 'bg-slate-900 border-slate-800 text-slate-500';
                    }
                  } else if (isThisSelected) {
                    optionStyle = 'bg-emerald-950/60 border-emerald-500 text-emerald-200 font-semibold ring-1 ring-emerald-500/50';
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

              {/* Action Buttons: Submit / Hint */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800/80">
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => toggleHint(q.id)}
                    className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-amber-300 bg-amber-950/40 hover:bg-amber-950/70 border border-amber-800/40 transition-all cursor-pointer"
                  >
                    <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
                    <span>{isHintOpen ? '隱藏觀念提示' : '💡 觀念提示 (不公布答案)'}</span>
                    {isHintOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>

                  <button
                    onClick={() =>
                      onAskTutorWithQuestion(
                        `【向助教請教試題】\n題目：${q.question}\n選項：\n${q.options
                          .map((o) => `${o.key}. ${o.text}`)
                          .join('\n')}\n請問這題的核心法規考核點是什麼？能給我思考的引導提示嗎？`
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
                    正確答案：<strong className="text-emerald-400 font-bold text-sm">{q.answer}</strong>
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

              {/* Official Explanation & Citation Panel (Visible after submit) */}
              {isSubmitted && (
                <div className="mt-4 p-4 rounded-xl bg-slate-950/90 border border-slate-800 space-y-2 text-xs">
                  <div className="flex items-center space-x-2 text-emerald-400 font-semibold text-sm">
                    <BookOpen className="w-4 h-4" />
                    <span>官方解析與盲點釋疑：</span>
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
        })}
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
