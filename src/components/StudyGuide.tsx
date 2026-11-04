import React, { useState } from 'react';
import { 
  BookOpen, 
  Search, 
  Calculator, 
  FileCheck, 
  ShieldCheck,
  Scale,
  Sparkles,
  AlertTriangle,
  Flame,
  Globe,
  Layers,
  ChevronRight
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
      note.standard.toLowerCase().includes(searchTerm.toLowerCase()) ||
      note.keyPoints.some((kp) => kp.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchCat && matchSearch;
  });

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-teal-950 border border-teal-800/40 rounded-2xl p-6 shadow-xl text-white">
        <div className="flex flex-wrap items-center gap-2">
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-teal-500/20 text-teal-300 border border-teal-500/30">
            考前衝刺必備 • 2026 最新官方大綱精華
          </span>
          <span className="text-xs text-amber-300 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800/40">
            新增 ISO 14068-1 碳中和 • 歐盟 CBAM 2026 正式期 • 4 大計算公式彙編
          </span>
        </div>
        <h2 className="text-xl sm:text-2xl font-bold mt-2 text-slate-100 flex items-center space-x-2">
          <span>iPAS 淨零碳規劃師 核心規範速查圖譜</span>
        </h2>
        <p className="text-sm text-slate-300 mt-1 max-w-3xl leading-relaxed">
          全面整合 ISO 14064-1 六大類別、ISO 14068-1 碳中和階層架構、ISO 14067 產品碳足跡分配原則、歐盟 CBAM 2026年正式期規則、台灣氣候變遷因應法碳費子法，以及考試必出的四大類量化計算公式（包含高低位熱值轉換、冷媒自然逸散、員工出差延人公里、化糞池排放），助您速記關鍵數字、擊破考題盲點！
        </p>

        {/* Search & Category Filter */}
        <div className="mt-6 pt-4 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  activeCategory === cat
                    ? 'bg-teal-600 text-white shadow-md shadow-teal-700/40 border border-teal-400'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
                }`}
              >
                {cat === 'ALL' ? '全部速查手冊 (8大主題)' : cat}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="搜尋 CBAM、14068、GWP、出差計算..."
              className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-teal-500"
            />
          </div>
        </div>
      </div>

      {/* Quick Formula Strip (4 大精選速查卡片) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-slate-900 border border-emerald-800/40 rounded-xl p-3.5 shadow-md flex flex-col justify-between">
          <div>
            <div className="flex items-center space-x-1.5 text-emerald-400 mb-1">
              <Calculator className="w-4 h-4" />
              <span className="font-bold text-xs">量化計算核心通式</span>
            </div>
            <div className="bg-slate-950 p-2 rounded border border-slate-800 font-mono text-xs text-emerald-300 mb-1">
              E = AD × EF × GWP
            </div>
          </div>
          <p className="text-[11px] text-slate-400 leading-snug">
            單位須統一為公噸 CO2e（若算式為 kg 須除以 1,000；登錄四捨五入取至小數點後三位）。
          </p>
        </div>

        <div className="bg-slate-900 border border-teal-800/40 rounded-xl p-3.5 shadow-md flex flex-col justify-between">
          <div>
            <div className="flex items-center space-x-1.5 text-teal-400 mb-1">
              <FileCheck className="w-4 h-4" />
              <span className="font-bold text-xs">ISO 14064-1 五大原則</span>
            </div>
            <div className="bg-slate-950 p-2 rounded border border-slate-800 font-mono text-xs text-teal-300 mb-1">
              相 • 完 • 一 • 準 • 透
            </div>
          </div>
          <p className="text-[11px] text-slate-400 leading-snug">
            相關性、完整性、一致性、準確性（降低不確定性）、透明度（未取得數據須陳述理由）。
          </p>
        </div>

        <div className="bg-slate-900 border border-amber-800/40 rounded-xl p-3.5 shadow-md flex flex-col justify-between">
          <div>
            <div className="flex items-center space-x-1.5 text-amber-400 mb-1">
              <Layers className="w-4 h-4" />
              <span className="font-bold text-xs">碳中和減量階層順序</span>
            </div>
            <div className="bg-slate-950 p-2 rounded border border-slate-800 font-mono text-xs text-amber-300 mb-1">
              減量 ➔ 移除 ➔ 抵換
            </div>
          </div>
          <p className="text-[11px] text-slate-400 leading-snug">
            ISO 14068-1 明定：優先廠內深度減量，次為移除，最後才准對無法避免之殘餘排放進行抵換。
          </p>
        </div>

        <div className="bg-slate-900 border border-cyan-800/40 rounded-xl p-3.5 shadow-md flex flex-col justify-between">
          <div>
            <div className="flex items-center space-x-1.5 text-cyan-400 mb-1">
              <Globe className="w-4 h-4" />
              <span className="font-bold text-xs">歐盟 CBAM 2026 正式期</span>
            </div>
            <div className="bg-slate-950 p-2 rounded border border-slate-800 font-mono text-xs text-cyan-300 mb-1">
              ≤50噸豁免 • 9/30申報
            </div>
          </div>
          <p className="text-[11px] text-slate-400 leading-snug">
            年度進口量 ≤ 50 噸免課；列管水電肥鋼鋁氫；每張憑證等同 1 tCO2e；不允許碳抵換。
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
                  <span className="px-2.5 py-0.5 rounded text-xs font-semibold bg-teal-950 text-teal-300 border border-teal-800/40">
                    {note.category}
                  </span>
                  <span className="text-xs text-slate-400">{note.standard}</span>
                </div>
                <h3 className="text-lg font-bold text-slate-100 mt-1 flex items-center space-x-2">
                  <span>{note.title}</span>
                </h3>
              </div>
            </div>

            <p className="text-sm text-slate-300 leading-relaxed">{note.summary}</p>

            {/* Key Bullet Points */}
            <div className="bg-slate-950/70 p-4 rounded-xl border border-slate-800/80 space-y-1.5">
              <span className="text-xs font-semibold text-emerald-400 flex items-center space-x-1 mb-1">
                <Sparkles className="w-3.5 h-3.5" />
                <span>核心考核與高頻考點：</span>
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
                  <thead className="bg-slate-950 text-slate-300 font-semibold border-b border-slate-800">
                    <tr>
                      {note.tableHeaders.map((th, thIdx) => (
                        <th key={thIdx} className="px-4 py-3">
                          {th}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 bg-slate-900/60 text-xs">
                    {note.tableRows.map((row, rIdx) => (
                      <tr key={rIdx} className="hover:bg-slate-800/40 transition-colors">
                        {row.map((cell, cIdx) => (
                          <td key={cIdx} className="px-4 py-3 whitespace-nowrap sm:whitespace-normal">
                            {cIdx === 0 ? (
                              <strong className="text-emerald-300">{cell}</strong>
                            ) : cIdx === row.length - 1 && cell.includes('【') ? (
                              <span className="text-amber-400 font-semibold">{cell}</span>
                            ) : (
                              <span className="text-slate-300">{cell}</span>
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
              <div className="flex items-start space-x-2.5 p-3.5 rounded-xl bg-amber-950/30 border border-amber-800/50 text-amber-200 text-xs">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div className="leading-relaxed">
                  <strong className="text-amber-300 font-semibold">真題常考陷阱避雷針：</strong>
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
