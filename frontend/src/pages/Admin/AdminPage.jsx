import React, { useState, useEffect } from 'react';
import {
  Users,
  Shield,
  Activity,
  CheckCircle2,
  XCircle,
  ToggleLeft,
  ToggleRight,
  Database,
  Cpu,
  RefreshCw
} from 'lucide-react';
import api from '../../services/api';

export default function AdminPage() {
  const [users, setUsers] = useState([]);
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAdminData();
  }, []);

  const fetchAdminData = async () => {
    try {
      const [usersRes, metricsRes] = await Promise.all([
        api.get('/admin/users'),
        api.get('/admin/system-metrics')
      ]);
      setUsers(usersRes.data || []);
      setMetrics(metricsRes.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleUser = async (userId) => {
    try {
      await api.put(`/admin/users/${userId}/toggle-status`);
      fetchAdminData();
    } catch (e) {
      alert("Could not toggle user status.");
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* HEADER */}
      <div className="bg-white rounded-2xl border border-[#ECE7DE] p-6 shadow-card flex items-center justify-between">
        <div className="flex items-center space-x-3.5">
          <div className="w-10 h-10 rounded-xl bg-[#FCF6E5] flex items-center justify-center text-[#D49B19]">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-[#1E242B]">Administration & User Governance</h2>
            <p className="text-xs text-gray-500">
              Manage accounts across all 4 roles, control access privileges, and monitor AI service health.
            </p>
          </div>
        </div>

        <button
          onClick={fetchAdminData}
          className="p-2 rounded-xl bg-white border border-[#ECE7DE] hover:bg-gray-50 text-gray-600 transition-colors"
          title="Refresh"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* SYSTEM TELEMETRY METRICS */}
      {metrics && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl p-5 border border-[#ECE7DE] shadow-card">
            <span className="text-[10px] uppercase font-bold text-gray-400 block">Registered Users</span>
            <div className="text-2xl font-black text-[#1E242B] mt-1">{metrics.total_users}</div>
            <span className="text-[11px] text-emerald-600 font-semibold mt-1 block">
              {metrics.active_users} active accounts
            </span>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-[#ECE7DE] shadow-card">
            <span className="text-[10px] uppercase font-bold text-gray-400 block">Total Debates Run</span>
            <div className="text-2xl font-black text-[#1E242B] mt-1">{metrics.total_debates}</div>
            <span className="text-[11px] text-[#B87E0E] font-semibold mt-1 block">
              Multi-turn simulations
            </span>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-[#ECE7DE] shadow-card">
            <span className="text-[10px] uppercase font-bold text-gray-400 block">AI Subscriptions</span>
            <div className="text-2xl font-black text-[#1E242B] mt-1">{metrics.pro_subscriptions}</div>
            <span className="text-[11px] text-emerald-600 font-semibold mt-1 block">
              Pro Plan Tiers
            </span>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-[#ECE7DE] shadow-card">
            <span className="text-[10px] uppercase font-bold text-gray-400 block">AI Inference Status</span>
            <div className="text-xs font-bold text-emerald-700 mt-2 flex items-center space-x-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>{metrics.ai_model_status}</span>
            </div>
            <span className="text-[10px] text-gray-400 mt-1 block">
              {metrics.api_latency_ms}ms avg latency
            </span>
          </div>
        </div>
      )}

      {/* USER MANAGEMENT TABLE */}
      <div className="bg-white rounded-2xl border border-[#ECE7DE] shadow-card overflow-hidden">
        <div className="p-4 border-b border-[#ECE7DE] bg-[#FAF8F3]">
          <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider">
            User Accounts & Roles
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[#ECE7DE] bg-[#FAF8F3]/50 text-gray-500 font-bold uppercase text-[10px]">
                <th className="py-3 px-5">User</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4">Plan</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-[#FAF8F3]/60 transition-colors">
                  <td className="py-3.5 px-5">
                    <div className="font-bold text-[#1E242B]">{u.full_name}</div>
                    <div className="text-[11px] text-gray-400">{u.email}</div>
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#FCF6E5] text-[#B87E0E] border border-[#F4E9C0]">
                      {u.role}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 font-semibold text-gray-700">
                    {u.subscription?.plan_name || 'Free'}
                  </td>
                  <td className="py-3.5 px-4">
                    <span className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      u.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${u.is_active ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
                      <span>{u.is_active ? 'Active' : 'Disabled'}</span>
                    </span>
                  </td>
                  <td className="py-3.5 px-5 text-right">
                    <button
                      onClick={() => handleToggleUser(u.id)}
                      className="text-xs font-semibold text-gray-600 hover:text-[#D49B19] underline"
                    >
                      {u.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
