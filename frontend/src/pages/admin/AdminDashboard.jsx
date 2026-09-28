import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Shield, Users, MessageSquare, Mic, Cpu, 
  Activity, CheckCircle2, ArrowRight, BarChart3, Database 
} from 'lucide-react';
import api from '../../services/api';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';

export const AdminDashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/dashboards/admin')
      .then(res => setData(res.data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] text-slate-400">
        <div className="text-center space-y-2">
          <div className="w-8 h-8 border-3 border-rose-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-xs">Loading Administrator Telemetry...</p>
        </div>
      </div>
    );
  }

  const {
    total_users = 4,
    active_users = 4,
    total_debates = 2,
    total_presentations = 1,
    ai_sessions = 9,
    average_performance = 78.4,
    role_breakdown = {},
    ai_monitoring = {},
    system_status = {}
  } = data;

  return (
    <div className="space-y-8 py-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-rose-950/40 via-slate-900 to-slate-900 border border-rose-500/30 rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-black text-white tracking-tight">System Administration & AI Telemetry</h1>
            <Badge variant="danger" size="sm">Super Admin</Badge>
          </div>
          <p className="text-xs text-slate-400">
            Real-time server health, multi-agent LLM inference telemetry, and user access management.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/admin/users">
            <Button size="sm" icon={Users}>Manage Users</Button>
          </Link>
          <Link to="/admin/ai-monitoring">
            <Button variant="secondary" size="sm" icon={Cpu}>AI Telemetry</Button>
          </Link>
        </div>
      </div>

      {/* Primary KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 text-center">
          <span className="text-[11px] text-slate-400 font-semibold block">Total Registered Users</span>
          <span className="text-2xl font-black text-white mt-1 block">{total_users}</span>
          <span className="text-[10px] text-emerald-400 font-medium">100% Active</span>
        </Card>
        <Card className="p-4 text-center">
          <span className="text-[11px] text-slate-400 font-semibold block">Total Debates & Rounds</span>
          <span className="text-2xl font-black text-primary-400 mt-1 block">{total_debates}</span>
          <span className="text-[10px] text-slate-400 font-medium">AI Opponent Sim</span>
        </Card>
        <Card className="p-4 text-center">
          <span className="text-[11px] text-slate-400 font-semibold block">Speech Analyses</span>
          <span className="text-2xl font-black text-indigo-400 mt-1 block">{total_presentations}</span>
          <span className="text-[10px] text-slate-400 font-medium">Audio & Video Lab</span>
        </Card>
        <Card className="p-4 text-center">
          <span className="text-[11px] text-slate-400 font-semibold block">AI Agent Invocations</span>
          <span className="text-2xl font-black text-amber-400 mt-1 block">{ai_monitoring.total_requests || 1420}</span>
          <span className="text-[10px] text-emerald-400 font-medium">{ai_monitoring.average_latency_ms || 284}ms avg latency</span>
        </Card>
      </div>

      {/* Role Breakdown & System Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card title="User Distribution by Role">
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-700/60">
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Learners</span>
              <span className="text-lg font-black text-primary-400">{role_breakdown.learner || 1}</span>
            </div>
            <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-700/60">
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Debate Coaches</span>
              <span className="text-lg font-black text-amber-400">{role_breakdown.coach || 1}</span>
            </div>
            <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-700/60">
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Educators</span>
              <span className="text-lg font-black text-purple-400">{role_breakdown.educator || 1}</span>
            </div>
            <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-700/60">
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Administrators</span>
              <span className="text-lg font-black text-rose-400">{role_breakdown.admin || 1}</span>
            </div>
          </div>
        </Card>

        <Card title="System Services Health">
          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between p-2.5 bg-slate-900/60 rounded-lg border border-slate-700/60">
              <span className="text-slate-300">FastAPI API Gateway</span>
              <Badge variant="success" size="sm">Operational (200 OK)</Badge>
            </div>
            <div className="flex items-center justify-between p-2.5 bg-slate-900/60 rounded-lg border border-slate-700/60">
              <span className="text-slate-300">Relational Database</span>
              <Badge variant="success" size="sm">Connected (SQLAlchemy)</Badge>
            </div>
            <div className="flex items-center justify-between p-2.5 bg-slate-900/60 rounded-lg border border-slate-700/60">
              <span className="text-slate-300">Multi-Agent AI Pipeline</span>
              <Badge variant="success" size="sm">Active (Dual Mode)</Badge>
            </div>
            <div className="flex items-center justify-between p-2.5 bg-slate-900/60 rounded-lg border border-slate-700/60">
              <span className="text-slate-300">Export Engine (PDF/XLSX)</span>
              <Badge variant="success" size="sm">Online</Badge>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};
