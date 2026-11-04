import React from 'react';
import { 
  Bot, 
  BookOpen, 
  HelpCircle, 
  Sparkles,
  Key
} from 'lucide-react';

interface NavbarProps {
  activeTab: 'chat' | 'exam' | 'guide';
  setActiveTab: (tab: 'chat' | 'exam' | 'guide') => void;
  hasApiKey: boolean;
  onOpenApiKeyModal: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  hasApiKey,
  onOpenApiKeyModal
}) => {
  return (
    <header className="bg-slate-900 border-b border-emerald-800/40 sticky top-0 z-40 backdrop-blur-md bg-opacity-95 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Title */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-lg text-emerald-400 tracking-tight">iPAS</span>
                <span className="font-semibold text-slate-100 text-sm sm:text-base">淨零碳規劃師 備考助教</span>
                <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-950 text-emerald-300 border border-emerald-700/50">
                  備考專用
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">
                啟發式提示 • ISO 14064-1/14067 • 氣候變遷因應法 • 歷屆題庫
              </p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="hidden md:flex items-center space-x-1">
            <button
              onClick={() => setActiveTab('chat')}
              className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer ${
                activeTab === 'chat'
                  ? 'bg-emerald-600/20 text-emerald-300 border border-emerald-500/30'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Bot className="w-4 h-4 text-emerald-400" />
              <span>AI 備考助教</span>
            </button>

            <button
              onClick={() => setActiveTab('exam')}
              className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer ${
                activeTab === 'exam'
                  ? 'bg-emerald-600/20 text-emerald-300 border border-emerald-500/30'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <HelpCircle className="w-4 h-4 text-teal-400" />
              <span>考題模擬庫</span>
            </button>

            <button
              onClick={() => setActiveTab('guide')}
              className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer ${
                activeTab === 'guide'
                  ? 'bg-emerald-600/20 text-emerald-300 border border-emerald-500/30'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <BookOpen className="w-4 h-4 text-cyan-400" />
              <span>標準速查圖譜</span>
            </button>
          </nav>

          {/* Status Badge & API Key Setting */}
          <div className="flex items-center space-x-2">
            <button
              onClick={onOpenApiKeyModal}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
                hasApiKey
                  ? 'bg-emerald-950/80 border-emerald-700/60 text-emerald-300 hover:bg-emerald-900/60 shadow-sm'
                  : 'bg-amber-950/70 border-amber-700/60 text-amber-300 hover:bg-amber-900/60 animate-pulse'
              }`}
              title="點擊設定個人 Gemini API Key"
            >
              <Key className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{hasApiKey ? 'API Key 已配置' : '設定 API Key'}</span>
              <span className="sm:hidden">{hasApiKey ? '已設Key' : '設Key'}</span>
            </button>

            <div className="hidden lg:flex items-center space-x-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium bg-slate-800/80 border border-slate-700 text-slate-300">
              <span className={`w-2 h-2 rounded-full ${hasApiKey ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
              <span>{hasApiKey ? 'Gemini 3.8 Flash' : '離線知識庫'}</span>
            </div>
          </div>
        </div>

        {/* Mobile Navigation Tabs */}
        <div className="flex md:hidden border-t border-slate-800 py-2 space-x-1 overflow-x-auto text-xs">
          <button
            onClick={() => setActiveTab('chat')}
            className={`flex items-center space-x-1 px-3 py-1.5 rounded-md whitespace-nowrap cursor-pointer ${
              activeTab === 'chat' ? 'bg-emerald-600/30 text-emerald-300 font-semibold' : 'text-slate-400'
            }`}
          >
            <Bot className="w-3.5 h-3.5" />
            <span>AI 助教</span>
          </button>
          <button
            onClick={() => setActiveTab('exam')}
            className={`flex items-center space-x-1 px-3 py-1.5 rounded-md whitespace-nowrap cursor-pointer ${
              activeTab === 'exam' ? 'bg-emerald-600/30 text-emerald-300 font-semibold' : 'text-slate-400'
            }`}
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>題庫</span>
          </button>
          <button
            onClick={() => setActiveTab('guide')}
            className={`flex items-center space-x-1 px-3 py-1.5 rounded-md whitespace-nowrap cursor-pointer ${
              activeTab === 'guide' ? 'bg-emerald-600/30 text-emerald-300 font-semibold' : 'text-slate-400'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>速查</span>
          </button>
        </div>
      </div>
    </header>
  );
};
