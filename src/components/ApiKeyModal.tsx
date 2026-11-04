import React, { useState, useEffect } from 'react';
import { 
  Key, 
  ShieldCheck, 
  ExternalLink, 
  Check, 
  Trash2, 
  X, 
  Lock,
  Eye,
  EyeOff,
  Cpu,
  RefreshCw,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { 
  getStoredApiKey, 
  setStoredApiKey, 
  removeStoredApiKey,
  getStoredModel,
  setStoredModel,
  DEFAULT_MODELS,
  fetchAvailableModelsForKey,
  ModelOption
} from '../services/geminiService';

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onKeyUpdated: () => void;
}

export const ApiKeyModal: React.FC<ApiKeyModalProps> = ({
  isOpen,
  onClose,
  onKeyUpdated,
}) => {
  const [keyInput, setKeyInput] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [selectedModel, setSelectedModel] = useState('auto');
  const [modelOptions, setModelOptions] = useState<ModelOption[]>(DEFAULT_MODELS);
  const [hasExistingKey, setHasExistingKey] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [isTestingKey, setIsTestingKey] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string } | null>(null);

  useEffect(() => {
    if (isOpen) {
      const stored = getStoredApiKey();
      setKeyInput(stored);
      setSelectedModel(getStoredModel());
      setHasExistingKey(Boolean(stored && stored.length > 5));
      setSavedSuccess(false);
      setTestResult(null);

      if (stored && stored.length > 10) {
        loadModelsForKey(stored, false);
      }
    }
  }, [isOpen]);

  const loadModelsForKey = async (keyToTest: string, showFeedback: boolean) => {
    if (!keyToTest.trim()) return;
    setIsTestingKey(true);
    if (showFeedback) setTestResult(null);

    try {
      const detected = await fetchAvailableModelsForKey(keyToTest.trim());
      if (detected.length > 0) {
        const dynamicOptions: ModelOption[] = [
          { id: 'auto', name: 'Auto 智慧自動選擇 (優先選擇低負載可用模型，推薦)' },
          ...detected.map((id) => ({
            id,
            name: `${id} (已驗證您的金鑰支援)`,
          })),
        ];
        setModelOptions(dynamicOptions);
        if (showFeedback) {
          setTestResult({
            ok: true,
            msg: `金鑰驗證成功！偵測到 ${detected.length} 個可用 Gemini 模型。`,
          });
        }
      } else if (showFeedback) {
        setTestResult({
          ok: false,
          msg: '無法取得可用模型清單，請確認 API Key 是否正確。',
        });
      }
    } catch {
      if (showFeedback) {
        setTestResult({
          ok: false,
          msg: '連線測試失敗，請檢查網路或 API Key。',
        });
      }
    } finally {
      setIsTestingKey(false);
    }
  };

  if (!isOpen) return null;

  const handleSave = () => {
    if (!keyInput.trim()) {
      alert('請輸入有效的 Gemini API Key，或點選「清除金鑰」使用離線知識庫模式。');
      return;
    }
    setStoredApiKey(keyInput.trim());
    setStoredModel(selectedModel);
    setHasExistingKey(true);
    setSavedSuccess(true);
    onKeyUpdated();
    setTimeout(() => {
      onClose();
    }, 900);
  };

  const handleRemove = () => {
    if (window.confirm('確定要從瀏覽器清除儲存的 API Key 嗎？清除後將切換為內建離線知識庫模式。')) {
      removeStoredApiKey();
      setKeyInput('');
      setHasExistingKey(false);
      setTestResult(null);
      onKeyUpdated();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-emerald-800/60 rounded-2xl w-full max-w-lg shadow-2xl p-6 text-slate-100 relative">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-emerald-600/30 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
            <Key className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-100">Gemini API Key 與模型設定</h3>
            <p className="text-xs text-slate-400">純靜態網頁 Zero-Leak 安全架構</p>
          </div>
        </div>

        {/* Security Shield Banner */}
        <div className="bg-emerald-950/40 border border-emerald-800/50 rounded-xl p-3.5 mb-5 space-y-2 text-xs">
          <div className="flex items-center space-x-2 text-emerald-300 font-semibold">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>100% 原始碼零金鑰・絕無洩漏風險</span>
          </div>
          <ul className="list-disc list-inside space-y-1 text-slate-300 text-[11px] leading-relaxed">
            <li>本網站為<strong>純靜態網頁 (Static SPA)</strong>，專案原始碼中絕無寫入任何 API Key。</li>
            <li>您填寫的金鑰僅存放於<strong>您個人的瀏覽器 LocalStorage</strong>。</li>
            <li>所有 AI 問答直接向 Google 官方端點請求，<strong>不經任何第三方伺服器</strong>。</li>
          </ul>
        </div>

        {/* API Key Input */}
        <div className="space-y-3 mb-5">
          <div className="flex items-center justify-between text-xs">
            <label className="font-semibold text-slate-300">您的 Google Gemini API Key：</label>
            <a
              href="https://aistudio.google.com/app/apikey"
              target="_blank"
              rel="noopener noreferrer"
              className="text-emerald-400 hover:text-emerald-300 flex items-center space-x-1 transition-colors"
            >
              <span>免費獲取 API Key</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          <div className="flex items-center space-x-2">
            <div className="relative flex-1">
              <input
                type={showKey ? 'text' : 'password'}
                value={keyInput}
                onChange={(e) => setKeyInput(e.target.value)}
                placeholder="AIzaSy..."
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-emerald-500 font-mono pr-10"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-200"
              >
                {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            <button
              type="button"
              onClick={() => loadModelsForKey(keyInput, true)}
              disabled={!keyInput.trim() || isTestingKey}
              className="px-3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-teal-300 border border-slate-700 text-xs font-medium flex items-center space-x-1.5 shrink-0 transition-all cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isTestingKey ? 'animate-spin' : ''}`} />
              <span>測試並偵測模型</span>
            </button>
          </div>

          {testResult && (
            <div
              className={`flex items-center space-x-1.5 text-xs p-2.5 rounded-lg border ${
                testResult.ok
                  ? 'bg-emerald-950/60 border-emerald-700/60 text-emerald-300'
                  : 'bg-red-950/60 border-red-700/60 text-red-300'
              }`}
            >
              {testResult.ok ? (
                <CheckCircle2 className="w-4 h-4 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0" />
              )}
              <span>{testResult.msg}</span>
            </div>
          )}

          {hasExistingKey && (
            <div className="flex items-center justify-between text-xs pt-1">
              <span className="text-emerald-400 flex items-center space-x-1">
                <Check className="w-3.5 h-3.5" />
                <span>本機已儲存金鑰（隨時可覆蓋或清除）</span>
              </span>
              <button
                type="button"
                onClick={handleRemove}
                className="text-red-400 hover:text-red-300 flex items-center space-x-1 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3 h-3" />
                <span>清除金鑰</span>
              </button>
            </div>
          )}
        </div>

        {/* Model Selection */}
        <div className="space-y-2 mb-5 pt-3 border-t border-slate-800">
          <label className="text-xs font-semibold text-slate-300 flex items-center space-x-1.5">
            <Cpu className="w-3.5 h-3.5 text-teal-400" />
            <span>選擇 Gemini 模型：</span>
          </label>
          <select
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
          >
            {modelOptions.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            💡 點擊上方「測試並偵測模型」可自動向 Google 伺服器查詢您的 API Key 實際支援的所有模型清單。
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-medium text-slate-300 hover:bg-slate-800 transition-colors cursor-pointer"
          >
            取消
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-700/30 flex items-center space-x-1.5 transition-all cursor-pointer"
          >
            {savedSuccess ? (
              <>
                <Check className="w-4 h-4 text-white" />
                <span>已安全儲存！</span>
              </>
            ) : (
              <>
                <Lock className="w-3.5 h-3.5" />
                <span>儲存設定</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
