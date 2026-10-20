import React, { useState } from 'react';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import {
  Settings as SettingsIcon,
  Bell,
  Sliders,
  Sparkles,
  Shield,
  Save,
  CheckCircle2
} from 'lucide-react';

export const SettingsPage = () => {
  const [saved, setSaved] = useState(false);
  const [settings, setSettings] = useState({
    defaultFormat: 'OXFORD',
    targetWpm: 145,
    difficulty: 'COLLEGIATE',
    emailNotifications: true,
    weeklyDigest: true,
    strictFallacyMode: false,
  });

  const handleSave = (e) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto pb-12">
      <div>
        <h2 className="text-2xl font-bold text-[#0F172A] tracking-tight">
          Platform Settings
        </h2>
        <p className="text-sm text-slate-500 mt-1">
          Customize your default debate formats, AI coach strictness, and feedback preferences.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Practice & Debate Preferences */}
        <Card className="space-y-4">
          <h3 className="text-base font-bold text-[#0F172A] flex items-center gap-2 pb-2 border-b border-slate-100">
            <Sliders className="w-4 h-4 text-[#172554]" />
            Debate & Coaching Preferences
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
                Preferred Debate Format
              </label>
              <select
                value={settings.defaultFormat}
                onChange={(e) => setSettings({ ...settings, defaultFormat: e.target.value })}
                className="w-full bg-slate-50 text-slate-900 border border-slate-300 rounded-xl p-2.5 text-sm focus:border-[#1E3A8A] focus:ring-2 focus:ring-blue-100 outline-none"
              >
                <option value="OXFORD">Oxford Parliamentary Style</option>
                <option value="PARLIAMENTARY">British Parliamentary (BP)</option>
                <option value="LINCOLN_DOUGLAS">Lincoln-Douglas (Value Debate)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
                AI Opponent Rigor
              </label>
              <select
                value={settings.difficulty}
                onChange={(e) => setSettings({ ...settings, difficulty: e.target.value })}
                className="w-full bg-slate-50 text-slate-900 border border-slate-300 rounded-xl p-2.5 text-sm focus:border-[#1E3A8A] focus:ring-2 focus:ring-blue-100 outline-none"
              >
                <option value="NOVICE">Novice (Gentle Socratic feedback)</option>
                <option value="COLLEGIATE">Collegiate Intermediate (Standard)</option>
                <option value="CHAMPIONSHIP">Varsity Championship (Strict rebuttal)</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
                Target Speaking Cadence: {settings.targetWpm} Words Per Minute
              </label>
              <input
                type="range"
                min="110"
                max="180"
                value={settings.targetWpm}
                onChange={(e) => setSettings({ ...settings, targetWpm: Number(e.target.value) })}
                className="w-full accent-[#172554] cursor-pointer"
              />
              <div className="flex justify-between text-[11px] text-slate-400 mt-1">
                <span>110 WPM (Deliberate)</span>
                <span className="font-semibold text-[#172554]">130–160 WPM (Optimal Collegiate)</span>
                <span>180 WPM (Rapid)</span>
              </div>
            </div>
          </div>
        </Card>

        {/* Notifications & AI Mode */}
        <Card className="space-y-4">
          <h3 className="text-base font-bold text-[#0F172A] flex items-center gap-2 pb-2 border-b border-slate-100">
            <Bell className="w-4 h-4 text-[#172554]" />
            Notifications & System Flags
          </h3>

          <div className="space-y-3">
            <label className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer">
              <div>
                <span className="text-xs font-semibold text-slate-800 block">Weekly Progress Digest</span>
                <span className="text-[11px] text-slate-500">Receive a weekly summary of your logic score and speeches.</span>
              </div>
              <input
                type="checkbox"
                checked={settings.weeklyDigest}
                onChange={(e) => setSettings({ ...settings, weeklyDigest: e.target.checked })}
                className="w-4 h-4 accent-[#172554] rounded cursor-pointer"
              />
            </label>

            <label className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer">
              <div>
                <span className="text-xs font-semibold text-slate-800 block">Strict Fallacy Flagging</span>
                <span className="text-[11px] text-slate-500">Detect subtle micro-fallacies during live debate cross-examinations.</span>
              </div>
              <input
                type="checkbox"
                checked={settings.strictFallacyMode}
                onChange={(e) => setSettings({ ...settings, strictFallacyMode: e.target.checked })}
                className="w-4 h-4 accent-[#172554] rounded cursor-pointer"
              />
            </label>
          </div>
        </Card>

        <div className="flex items-center justify-between pt-2">
          {saved && (
            <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" /> Preferences saved successfully!
            </span>
          )}
          {!saved && <div />}

          <Button type="submit" variant="primary" size="md" icon={Save} iconPosition="left">
            Save Preferences
          </Button>
        </div>
      </form>
    </div>
  );
};
