/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { ChatTutor } from './components/ChatTutor';
import { QuestionBank } from './components/QuestionBank';
import { StudyGuide } from './components/StudyGuide';
import { ApiKeyModal } from './components/ApiKeyModal';
import { hasApiKey } from './services/geminiService';
import { ShieldCheck } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<'chat' | 'exam' | 'guide'>('chat');
  const [pendingPromptForChat, setPendingPromptForChat] = useState<string>('');
  const [isKeyConfigured, setIsKeyConfigured] = useState<boolean>(false);
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState<boolean>(false);

  const checkKeyStatus = () => {
    setIsKeyConfigured(hasApiKey());
  };

  useEffect(() => {
    checkKeyStatus();
  }, []);

  const handleAskTutorWithQuestion = (questionText: string) => {
    setPendingPromptForChat(questionText);
    setActiveTab('chat');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500/30 selection:text-emerald-200">
      {/* Top Navigation */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        hasApiKey={isKeyConfigured}
        onOpenApiKeyModal={() => setIsApiKeyModalOpen(true)}
      />

      {/* Main Tab Content */}
      <main className="flex-1 overflow-x-hidden">
        {activeTab === 'chat' && (
          <ChatTutor
            initialPrompt={pendingPromptForChat}
            onClearInitialPrompt={() => setPendingPromptForChat('')}
            onOpenApiKeyModal={() => setIsApiKeyModalOpen(true)}
          />
        )}

        {activeTab === 'exam' && (
          <QuestionBank onAskTutorWithQuestion={handleAskTutorWithQuestion} />
        )}

        {activeTab === 'guide' && <StudyGuide />}
      </main>

      {/* API Key Modal */}
      <ApiKeyModal
        isOpen={isApiKeyModalOpen}
        onClose={() => setIsApiKeyModalOpen(false)}
        onKeyUpdated={checkKeyStatus}
      />

      {/* Sticky Bottom Status Footer */}
      <footer className="bg-slate-900/80 border-t border-slate-800/80 py-2.5 px-4 text-xs text-slate-400">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-slate-300 font-medium">iPAS 淨零碳規劃師備考系統</span>
            <span className="text-slate-500">|</span>
            <span className="text-slate-400">ISO 14064-1 • ISO 14067 • 氣候變遷因應法</span>
          </div>

          <div className="flex items-center space-x-2 text-[11px] text-slate-400">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>純靜態 Zero-Leak 架構：金鑰僅存於個人本機瀏覽器，原始碼零外洩風險</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
