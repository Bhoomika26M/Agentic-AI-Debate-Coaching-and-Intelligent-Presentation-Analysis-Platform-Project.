import React from 'react';
import { Shield, Database, Cpu, HardDrive, CheckCircle2 } from 'lucide-react';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';

export const AdminSystemReportsPage = () => {
  return (
    <div className="max-w-5xl mx-auto space-y-6 py-6">
      <div>
        <h1 className="text-2xl font-black text-white tracking-tight">System Infrastructure Health & Server Status</h1>
        <p className="text-xs text-slate-400 mt-1">Underlying database connections, API throughput, and container states.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card title="Database Cluster Status">
          <div className="space-y-3 text-xs">
            <div className="flex justify-between p-2.5 bg-slate-900/60 rounded-lg border border-slate-700/60">
              <span className="text-slate-300">Engine:</span>
              <span className="text-white font-mono">SQLite (PostgreSQL Compatible Schema)</span>
            </div>
            <div className="flex justify-between p-2.5 bg-slate-900/60 rounded-lg border border-slate-700/60">
              <span className="text-slate-300">Tables Initialized:</span>
              <span className="text-white font-mono">24 Relational Entities</span>
            </div>
            <div className="flex justify-between p-2.5 bg-slate-900/60 rounded-lg border border-slate-700/60">
              <span className="text-slate-300">Connection Pool:</span>
              <Badge variant="success" size="sm">Available / Pre-ping enabled</Badge>
            </div>
          </div>
        </Card>

        <Card title="Backend API Health Check (/health)">
          <div className="space-y-3 text-xs">
            <div className="flex justify-between p-2.5 bg-slate-900/60 rounded-lg border border-slate-700/60">
              <span className="text-slate-300">Status:</span>
              <Badge variant="success" size="sm">healthy</Badge>
            </div>
            <div className="flex justify-between p-2.5 bg-slate-900/60 rounded-lg border border-slate-700/60">
              <span className="text-slate-300">Database:</span>
              <span className="text-emerald-400 font-mono">connected</span>
            </div>
            <div className="flex justify-between p-2.5 bg-slate-900/60 rounded-lg border border-slate-700/60">
              <span className="text-slate-300">AI Service:</span>
              <span className="text-emerald-400 font-mono">available</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};
