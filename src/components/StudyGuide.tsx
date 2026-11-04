import React, { useState } from 'react';
import { 
  BookOpen, 
  Search, 
  Table, 
  AlertTriangle, 
  Calculator, 
  FileCheck, 
  ExternalLink,
  ChevronRight,
  ShieldCheck
} from 'lucide-react';
import { STUDY_NOTES } from '../data/studyNotes';

export const StudyGuide: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('ALL');

  const categories = ['ALL', '盤查標準對照', '量化計算基礎', '國內法規政策'];

  const filteredNotes = STUDY_NOTES.filter((note) => {
    const matchCat = activeCategory === 'ALL' || note.category === activeCategory;
    const matchSearch =
      note.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      note.summary.toLowerCase().includes(searchTerm.toLowerCase()) ||
      note.standard.toLowerCase().includes(searchTerm.toLowerCase());
    return matchCat && matchSearch;
  });

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-teal-950 border border-teal-800/40 rounded-2xl p-6 shadow-xl text-white">
        <div className="flex items-center space-x-2">
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-teal-500/20 text-teal-300 border border-teal-500/30">
            考前衝刺必備
          </span>
          <span className="text-xs text-slate-400">標準與法規關鍵對照手冊</span>
        </div>
        <h2 className="text-xl sm:text-2xl font-bold mt-1 text-slate-100">
          iPAS 淨零碳規劃師 核心規範速查圖譜
        </h2>
        <p className="text-sm text-slate-300 mt-1 max-w-2xl">
          彙整 ISO 14064-1 六大類別對照、IPCC AR5/AR6 GWP 全球暖化潛勢係數、台灣氣候變遷因應法與碳費計算公式，助你穩固記憶、避開考題陷阱！
        </p>

        {/* Search & Category Filter */}
        <div className="mt-6 pt-4 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                  activeCategory === cat
                    ? 'bg-teal-600 text-white shadow-sm'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {cat === 'ALL' ? '全部手冊' : cat}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="搜尋標準、GWP、法規..."
              className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-teal-500"
            />
          </div>
        </div>
      </div>

      {/* Quick Formula Strip */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-900 border border-emerald-800/40 rounded-xl p-4 shadow-md">
          <div className="flex items-center space-x-2 text-emerald-400 mb-2">
            <Calculator className="w-4 h-4" />
            <span className="font-bold text-sm">溫室氣體排放量計算公式</span>
          </div>
          <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 font-mono text-xs text-emerald-300 mb-2">
            E = 活動數據 (AD) × 排放係數 (EF) × GWP
          </div>
          <p className="text-[11px] text-slate-400">
            單位須統一為公噸 CO2e（如排放量為 kg 須除以 1,000）。
          </p>
        </div>

        <div className="bg-slate-900 border border-teal-800/40 rounded-xl p-4 shadow-md">
          <div className="flex items-center space-x-2 text-teal-400 mb-2">
            <FileCheck className="w-4 h-4" />
            <span className="font-bold text-sm">盤查五大原則口訣</span>
          </div>
          <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 font-mono text-xs text-teal-300 mb-2">
            相 (相關) • 完 (完整) • 一 (一致) • 準 (準確) • 透 (透明)
          </div>
          <p className="text-[11px] text-slate-400">
            ISO 14064-1 第 4 節核心品質原則，每年考試必出 1~2 題判斷題。
          </p>
        </div>

        <div className="bg-slate-900 border border-cyan-800/40 rounded-xl p-4 shadow-md">
          <div className="flex items-center space-x-2 text-cyan-400 mb-2">
            <ShieldCheck className="w-4 h-4" />
            <span className="font-bold text-sm">基準年重新計算 3 大門檻</span>
          </div>
          <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 font-mono text-xs text-cyan-300 mb-2">
            邊界結構重大改變 • 方法學變更 • 重大錯誤更正
          </div>
          <p className="text-[11px] text-slate-400">
            自然產量或經濟增長<strong>嚴禁</strong>重新計算基準年！
          </p>
        </div>
      </div>

      {/* Notes Cards with Full Tables */}
      <div className="space-y-6">
        {filteredNotes.map((note) => (
          <div
            key={note.id}
            className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl space-y-4"
          >
            {/* Note Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="px-2 py-0.5 rounded text-xs font-medium bg-teal-950 text-teal-300 border border-teal-800/40">
                    {note.category}
                  </span>
                  <span className="text-xs text-slate-400">{note.standard}</span>
                </div>
                <h3 className="text-lg font-bold text-slate-100 mt-1">{note.title}</h3>
              </div>
            </div>

            <p className="text-sm text-slate-300 leading-relaxed">{note.summary}</p>

            {/* Key Bullet Points */}
            <div className="bg-slate-950/70 p-4 rounded-xl border border-slate-800/80 space-y-1.5">
              <span className="text-xs font-semibold text-emerald-400 block mb-1">
                📌 核心考核要點：
              </span>
              <ul className="list-disc list-inside space-y-1 text-xs text-slate-300 leading-relaxed">
                {note.keyPoints.map((kp, kIdx) => (
                  <li key={kIdx}>{kp}</li>
                ))}
              </ul>
            </div>

            {/* Table if exists */}
            {note.tableHeaders && note.tableRows && (
              <div className="overflow-x-auto rounded-xl border border-slate-800">
                <table className="w-full text-left text-xs text-slate-200">
                  <thead className="bg-slate-950 text-slate-400 font-semibold uppercase border-b border-slate-800">
                    <tr>
                      {note.tableHeaders.map((th, thIdx) => (
                        <th key={thIdx} className="px-4 py-3">
                          {th}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 bg-slate-900/60 font-mono text-[11px] sm:text-xs">
                    {note.tableRows.map((row, rIdx) => (
                      <tr key={rIdx} className="hover:bg-slate-800/40 transition-colors">
                        {row.map((cell, cIdx) => (
                          <td key={cIdx} className="px-4 py-3 whitespace-nowrap sm:whitespace-normal">
                            {cIdx === 0 ? (
                              <strong className="text-emerald-300 font-sans">{cell}</strong>
                            ) : cIdx === row.length - 1 && cell.includes('【') ? (
                              <span className="text-amber-400 font-sans font-semibold">{cell}</span>
                            ) : (
                              <span>{cell}</span>
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Exam Trap Alert Notice */}
            {note.examTrapNotice && (
              <div className="flex items-start space-x-2.5 p-3 rounded-xl bg-amber-950/30 border border-amber-800/50 text-amber-200 text-xs">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div className="leading-relaxed">
                  <strong className="text-amber-300 font-semibold">常考陷阱提示：</strong>
                  <span>{note.examTrapNotice}</span>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
