'use client';

import React, { useState } from 'react';
import { useModel } from '@/lib/model-context';
import { AI_MODELS } from '@/lib/ai-models';
import { X, Check, Key, Cpu, Zap, Shield, Sparkles } from 'lucide-react';

export default function ModelSelectorModal() {
  const { selectedModel, setSelectedModelId, apiKeys, setProviderApiKey, isSettingsOpen, setIsSettingsOpen } = useModel();
  const [activeTab, setActiveTab] = useState<'models' | 'keys'>('models');
  const [tempKeys, setTempKeys] = useState<Record<string, string>>(apiKeys);
  const [saveSuccess, setSaveSuccess] = useState(false);

  if (!isSettingsOpen) return null;

  const handleKeySave = (provider: string, value: string) => {
    setTempKeys(prev => ({ ...prev, [provider]: value }));
    setProviderApiKey(provider, value);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-md">
      <div className="relative w-full max-w-2xl rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-400">
              <Cpu className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">AI Model Engine & Gateway</h2>
              <p className="text-xs text-slate-400">Select active AI model or enter custom API keys for direct provider execution</p>
            </div>
          </div>
          <button
            onClick={() => setIsSettingsOpen(false)}
            className="rounded-xl p-2 text-slate-400 hover:bg-slate-800 hover:text-white transition-all"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tab switcher */}
        <div className="mt-4 flex gap-2 border-b border-slate-800 pb-2">
          <button
            onClick={() => setActiveTab('models')}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition-all ${
              activeTab === 'models'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
            }`}
          >
            <Sparkles className="h-3.5 w-3.5" />
            Select AI Model ({AI_MODELS.length})
          </button>
          <button
            onClick={() => setActiveTab('keys')}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition-all ${
              activeTab === 'keys'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
            }`}
          >
            <Key className="h-3.5 w-3.5" />
            API Keys Settings
          </button>
        </div>

        {/* Tab 1: Models Grid */}
        {activeTab === 'models' && (
          <div className="mt-4 max-h-[380px] space-y-3 overflow-y-auto pr-1">
            {AI_MODELS.map((model) => {
              const isSelected = selectedModel.id === model.id;
              return (
                <div
                  key={model.id}
                  onClick={() => setSelectedModelId(model.id)}
                  className={`group relative flex cursor-pointer items-start justify-between rounded-2xl border p-4 transition-all ${
                    isSelected
                      ? 'border-emerald-500/50 bg-emerald-500/10 shadow-lg shadow-emerald-500/5'
                      : 'border-slate-800 bg-slate-950/60 hover:border-slate-700 hover:bg-slate-950'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-sm text-white">{model.name}</h3>
                      <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] font-semibold text-slate-300">
                        {model.badge}
                      </span>
                      {model.isSimulator && (
                        <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
                          Zero Setup
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed">{model.description}</p>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {model.capabilities.map((cap, idx) => (
                        <span key={idx} className="rounded-md bg-slate-900 border border-slate-800 px-2 py-0.5 text-[10px] text-indigo-300">
                          {cap}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center pt-1 pl-4">
                    {isSelected ? (
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-slate-950">
                        <Check className="h-4 w-4 stroke-[3]" />
                      </div>
                    ) : (
                      <div className="h-5 w-5 rounded-full border border-slate-700 group-hover:border-slate-500" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Tab 2: API Keys Management */}
        {activeTab === 'keys' && (
          <div className="mt-4 space-y-4 max-h-[380px] overflow-y-auto pr-1">
            <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/10 p-3 text-xs text-indigo-300 flex items-start gap-2">
              <Shield className="h-4 w-4 shrink-0 mt-0.5 text-indigo-400" />
              <p>
                API keys are stored strictly in your browser local storage. When no keys are provided, the platform automatically utilizes the built-in <strong>VerbalArena Smart Simulator</strong> engine.
              </p>
            </div>

            {['google', 'openai', 'anthropic', 'deepseek', 'meta'].map((provider) => (
              <div key={provider} className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                <label className="block text-xs font-bold text-white uppercase tracking-wider mb-1">
                  {provider} API Key
                </label>
                <div className="flex gap-2">
                  <input
                    type="password"
                    placeholder={`Enter ${provider} key (e.g. sk-...)`}
                    value={tempKeys[provider] || ''}
                    onChange={(e) => setTempKeys({ ...tempKeys, [provider]: e.target.value })}
                    className="w-full rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
                  />
                  <button
                    onClick={() => handleKeySave(provider, tempKeys[provider] || '')}
                    className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-500 transition-all"
                  >
                    Save
                  </button>
                </div>
              </div>
            ))}

            {saveSuccess && (
              <p className="text-xs text-emerald-400 font-semibold text-center animate-pulse">
                ✓ API Key Saved Successfully!
              </p>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="mt-6 flex justify-end border-t border-slate-800 pt-4">
          <button
            onClick={() => setIsSettingsOpen(false)}
            className="rounded-xl bg-slate-800 px-5 py-2 text-xs font-bold text-white hover:bg-slate-700 transition-all"
          >
            Close & Apply
          </button>
        </div>

      </div>
    </div>
  );
}
