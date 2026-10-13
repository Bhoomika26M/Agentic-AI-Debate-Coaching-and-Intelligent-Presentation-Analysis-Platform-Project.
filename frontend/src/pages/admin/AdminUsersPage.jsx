import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../api/client';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Shield, UserX, UserCheck, ShieldAlert } from 'lucide-react';

export const AdminUsersPage = () => {
  const queryClient = useQueryClient();
  const [roleFilter, setRoleFilter] = useState('');

  // 1. Fetch all users
  const { data: users = [], isLoading } = useQuery({
    queryKey: ['adminUsers', roleFilter],
    queryFn: async () => {
      let url = '/users/';
      if (roleFilter) url += `?role=${roleFilter}`;
      const res = await apiClient.get(url);
      return res.data;
    },
  });

  // 2. Change role mutation
  const changeRoleMutation = useMutation({
    mutationFn: async ({ userId, role }) => {
      const res = await apiClient.put(`/users/${userId}/role`, { role });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['adminUsers']);
    },
  });

  // 3. Deactivate user mutation
  const deactivateUserMutation = useMutation({
    mutationFn: async (userId) => {
      const res = await apiClient.delete(`/users/${userId}`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['adminUsers']);
    },
  });

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-white/5">
        <div>
          <span className="text-xs uppercase tracking-widest font-semibold text-arena-amber block mb-1">
            System Administration
          </span>
          <h1 className="text-3xl font-serif font-bold text-white tracking-tight">
            User Governance & Role Rosters
          </h1>
          <p className="text-sm text-arena-muted mt-1">
            Review registered debaters, promote coaching staff, and manage chamber credentials.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {['', 'LEARNER', 'DEBATE_COACH', 'EDUCATOR', 'ADMIN'].map((r) => (
            <button
              key={r}
              onClick={() => setRoleFilter(r)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition ${
                roleFilter === r
                  ? 'bg-arena-amber/15 text-arena-amber border border-arena-amber/30'
                  : 'bg-arena-bg-card border border-white/5 text-arena-muted hover:text-white'
              }`}
            >
              {r ? r.replace('_', ' ') : 'All Roles'}
            </button>
          ))}
        </div>
      </div>

      {/* Users Table Card */}
      <Card className="p-0 overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-sm text-arena-muted">Loading user registry...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/5 bg-arena-bg-elevated/50 text-[10px] font-mono uppercase tracking-wider text-arena-muted">
                  <th className="py-3.5 px-6">Member</th>
                  <th className="py-3.5 px-6">Current Role</th>
                  <th className="py-3.5 px-6">Status</th>
                  <th className="py-3.5 px-6">Enrolled</th>
                  <th className="py-3.5 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-xs">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-white/[0.02] transition">
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <img
                          src={u.profile?.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${u.id}`}
                          alt={u.full_name}
                          className="w-9 h-9 rounded-xl bg-arena-bg-elevated border border-white/10"
                        />
                        <div>
                          <div className="font-semibold text-white">{u.full_name}</div>
                          <div className="text-arena-muted text-[11px]">{u.email}</div>
                        </div>
                      </div>
                    </td>

                    <td className="py-4 px-6">
                      <select
                        value={u.role}
                        onChange={(e) =>
                          changeRoleMutation.mutate({ userId: u.id, role: e.target.value })
                        }
                        className="bg-arena-bg-card border border-white/10 rounded-lg px-2.5 py-1 text-xs text-arena-parchment focus:outline-none focus:border-arena-amber"
                      >
                        <option value="LEARNER">LEARNER</option>
                        <option value="DEBATE_COACH">DEBATE_COACH</option>
                        <option value="EDUCATOR">EDUCATOR</option>
                        <option value="ADMIN">ADMIN</option>
                      </select>
                    </td>

                    <td className="py-4 px-6">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono ${
                          u.is_active
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-red-500/10 text-red-400 border border-red-500/20'
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${u.is_active ? 'bg-emerald-400' : 'bg-red-400'}`} />
                        {u.is_active ? 'Active' : 'Deactivated'}
                      </span>
                    </td>

                    <td className="py-4 px-6 text-arena-muted font-mono text-[11px]">
                      {new Date(u.created_at).toLocaleDateString()}
                    </td>

                    <td className="py-4 px-6 text-right">
                      {u.is_active && u.role !== 'ADMIN' && (
                        <button
                          onClick={() => deactivateUserMutation.mutate(u.id)}
                          className="text-xs text-arena-muted hover:text-arena-opp transition inline-flex items-center gap-1"
                        >
                          <UserX className="w-3.5 h-3.5" /> Deactivate
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};
