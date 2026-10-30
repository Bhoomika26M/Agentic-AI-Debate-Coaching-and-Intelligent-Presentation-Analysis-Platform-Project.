import React, { useState, useEffect } from 'react';
import {
  Settings,
  Cpu,
  Volume2,
  Bell,
  Lock,
  Save,
  CheckCircle2,
  Sparkles,
  Info,
  ShieldAlert,
  ShieldCheck
} from 'lucide-react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';

export default function SettingsPage() {
  const { user } = useAuth();
  const [aiStatus, setAiStatus] = useState(null);
  const [targetWpm, setTargetWpm] = useState(135);
  const [enableReminders, setEnableReminders] = useState(true);
  const [enableCoachingAlerts, setEnableCoachingAlerts] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetchAiStatus();
  }, []);

  const fetchAiStatus = async () => {
    try {
      const res = await api.get('/system/ai-status');
      setAiStatus(res.data);
    } catch (e) {
      console.error('Could not fetch AI status:', e);
    }
  };

  const handleSave = (e) => {
    e.preventDefault();
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    }, 400);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* HEADER */}
      <div className="bg-white rounded-2xl border border-[#ECE7DE] p-6 shadow-card flex items-center justify-between">
        <div className="flex items-center space-x-3.5">
          <div className="w-10 h-10 rounded-xl bg-[#FCF6E5] flex items-center justify-center text-[#D49B19]">
            <Settings className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-[#1E242B]">Application & AI Settings</h2>
            <p className="text-xs text-gray-500">
              Configure system telemetry, AI inference provider, vocal cadence goals, and notification preferences.
            </p>
          </div>
        </div>

        {saved && (
          <div className="flex items-center space-x-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-semibold">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Settings Updated</span>
          </div>
        )}
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* 1. AI ENGINE STATUS CARD */}
        <div className="bg-white rounded-2xl border border-[#ECE7DE] p-6 shadow-card space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <div className="flex items-center space-x-2">
              <Cpu className="w-4 h-4 text-[#D49B19]" />
              <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                AI Inference Engine Status
              </h3>
            </div>
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border flex items-center space-x-1 ${
              aiStatus?.live_ai_connected
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-amber-50 text-amber-800 border-amber-200'
            }`}>
              {aiStatus?.live_ai_connected ? <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> : <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />}
              <span>{aiStatus?.status_label || 'Offline Development NLP Mode'}</span>
            </span>
          </div>

          <div className="p-4 bg-[#FAF8F3] rounded-xl border border-[#ECE7DE] text-xs space-y-2">
            <div className="flex justify-between items-center">
              <span className="font-semibold text-gray-700">Configured Model:</span>
              <span className="font-mono text-gray-800 font-bold">{aiStatus?.model || 'gpt-4o'}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="font-semibold text-gray-700">Inference Architecture:</span>
              <span className="text-gray-600">{aiStatus?.inference_mode || 'development_heuristic_mode'}</span>
            </div>
            <div className="pt-2 border-t border-gray-200/60 text-[11px] text-gray-500">
              💡 <b>Guidance:</b> {aiStatus?.guidance || 'Set OPENAI_API_KEY in backend/.env to activate live cloud inference.'}
            </div>
          </div>
        </div>

        {/* 2. PRESENTATION & SPEECH PREFERENCES */}
        <div className="bg-white rounded-2xl border border-[#ECE7DE] p-6 shadow-card space-y-4">
          <div className="flex items-center space-x-2 border-b border-gray-100 pb-3">
            <Volume2 className="w-4 h-4 text-[#D49B19]" />
            <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider">
              Speech & Cadence Targets
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-700">
                Target Speaking Cadence (WPM): <span className="text-[#D49B19] font-bold">{targetWpm} WPM</span>
              </label>
              <input
                type="range"
                min="100"
                max="170"
                step="5"
                value={targetWpm}
                onChange={(e) => setTargetWpm(Number(e.target.value))}
                className="w-full accent-[#D49B19]"
              />
              <span className="text-[11px] text-gray-400 block">
                Collegiate standard: 120-150 WPM ensures clarity and retention.
              </span>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-700">Microphone Input Format</label>
              <select className="w-full px-3 py-2 text-xs rounded-xl border border-[#ECE7DE] bg-white">
                <option>Default System Audio Stream (WebM / WAV)</option>
                <option>High-Fidelity Stereo Audio (16-bit 44.1kHz)</option>
              </select>
            </div>
          </div>
        </div>

        {/* 3. NOTIFICATION PREFERENCES */}
        <div className="bg-white rounded-2xl border border-[#ECE7DE] p-6 shadow-card space-y-4">
          <div className="flex items-center space-x-2 border-b border-gray-100 pb-3">
            <Bell className="w-4 h-4 text-[#D49B19]" />
            <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider">
              Platform Notification Preferences
            </h3>
          </div>

          <div className="space-y-3 text-xs">
            <label className="flex items-center justify-between p-3 rounded-xl bg-[#FAF8F3] border border-[#ECE7DE] cursor-pointer">
              <div>
                <p className="font-bold text-gray-800">Debate Reminders & Alerts</p>
                <p className="text-[11px] text-gray-500">Receive alerts when scheduled live matches begin.</p>
              </div>
              <input
                type="checkbox"
                checked={enableReminders}
                onChange={(e) => setEnableReminders(e.target.checked)}
                className="w-4 h-4 accent-[#D49B19]"
              />
            </label>

            <label className="flex items-center justify-between p-3 rounded-xl bg-[#FAF8F3] border border-[#ECE7DE] cursor-pointer">
              <div>
                <p className="font-bold text-gray-800">Coaching Drill Recommendations</p>
                <p className="text-[11px] text-gray-500">Receive tailored weekly drills based on your weakest debate metrics.</p>
              </div>
              <input
                type="checkbox"
                checked={enableCoachingAlerts}
                onChange={(e) => setEnableCoachingAlerts(e.target.checked)}
                className="w-4 h-4 accent-[#D49B19]"
              />
            </label>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#DF9E16] to-[#B87E0E] text-white font-bold text-xs shadow-xs hover:opacity-95 disabled:opacity-50 transition-all flex items-center space-x-2"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Saving...' : 'Save Settings'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
