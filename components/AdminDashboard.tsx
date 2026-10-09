'use client';

import React from 'react';
import { useAuth } from '@/lib/auth-context';
import { AI_MODELS } from '@/lib/ai-models';
import { Shield, Cpu, Activity, Server, CheckCircle2, RefreshCw } from 'lucide-react';

export default function AdminDashboard() {
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      
      {/* Admin Header */}
      <div className="rounded-3xl border border-slate-800 bg-slate-900/90 p-6 md:p-8 shadow-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <img src={user.avatarUrl} alt={user.name} className="h-16 w-16 rounded-2xl border-2 border-emerald-500/50 object-cover" />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-white">{user.name}</h1>
              <span className="rounded-full bg-emerald-500/20 border border-emerald-500/30 px-3 py-0.5 text-xs font-bold text-emerald-400">
                System Administrator
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">Platform Infrastructure • AI Gateway & Health Monitoring</p>
          </div>
        </div>

        <div className="flex gap-3">
          <button className="flex items-center gap-2 rounded-2xl bg-emerald-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-emerald-500 transition-all shadow-md">
            <Server className="h-4 w-4" /> System Health 99.98%
          </button>
        </div>
      </div>

      {/* Main Grid: AI Model Monitoring & System Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* AI Model Health & Latency Monitor (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Cpu className="h-4 w-4 text-emerald-400" />
                Multi-Model API Gateway Monitoring
              </h2>
              <span className="text-xs text-slate-400">7 Active Providers</span>
            </div>

            <div className="space-y-3">
              {AI_MODELS.map((m) => (
                <div key={m.id} className="flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-950 p-4">
                  <div>
                    <h3 className="text-xs font-bold text-white">{m.name}</h3>
                    <p className="text-[10px] text-slate-400">{m.provider} • {m.badge}</p>
                  </div>

                  <div className="flex items-center gap-4 text-right">
                    <div>
                      <p className="text-xs font-bold text-emerald-400 font-mono">142 ms</p>
                      <span className="text-[10px] text-slate-500">Avg Latency</span>
                    </div>
                    <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-400" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* System Load & Platform Analytics (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6 space-y-4">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Activity className="h-4 w-4 text-indigo-400" />
              Platform Operational Metrics
            </h2>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between items-center rounded-2xl border border-slate-800 bg-slate-950 p-3">
                <span className="text-slate-300">Total Registered Users</span>
                <span className="text-white font-bold font-mono">1,480</span>
              </div>
              <div className="flex justify-between items-center rounded-2xl border border-slate-800 bg-slate-950 p-3">
                <span className="text-slate-300">Active Debate Rooms Today</span>
                <span className="text-emerald-400 font-bold font-mono">42 Active</span>
              </div>
              <div className="flex justify-between items-center rounded-2xl border border-slate-800 bg-slate-950 p-3">
                <span className="text-slate-300">Smart Simulator Fallback Rate</span>
                <span className="text-indigo-400 font-bold font-mono">100% Ready</span>
              </div>
            </div>

            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 space-y-1">
              <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">System Operational</span>
              <p className="text-xs text-emerald-200">
                All microservices, argument mining engines, and fallacy detection modules running nominally.
              </p>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
