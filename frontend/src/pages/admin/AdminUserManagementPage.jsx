import React, { useState, useEffect } from 'react';
import { Users, Search, Shield, UserX, UserCheck, Edit3 } from 'lucide-react';
import api from '../../services/api';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';

export const AdminUserManagementPage = () => {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedRole, setSelectedRole] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchUsers = async () => {
    try {
      let url = '/admin/users';
      const params = [];
      if (search) params.push(`search=${encodeURIComponent(search)}`);
      if (selectedRole) params.push(`role=${encodeURIComponent(selectedRole)}`);
      if (params.length > 0) url += `?${params.join('&')}`;

      const res = await api.get(url);
      setUsers(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [search, selectedRole]);

  const handleRoleChange = async (userId, newRole) => {
    try {
      await api.put(`/admin/users/${userId}/role`, { role: newRole });
      fetchUsers();
    } catch (err) {
      alert(err.message || 'Failed to update role.');
    }
  };

  const handleToggleStatus = async (userId, currentStatus) => {
    try {
      await api.put(`/admin/users/${userId}/status`, { is_active: !currentStatus });
      fetchUsers();
    } catch (err) {
      alert(err.message || 'Failed to toggle status.');
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 py-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">User Management & Access Control</h1>
          <p className="text-xs text-slate-400 mt-1">Supervise accounts, assign roles (Learner, Coach, Educator, Admin), and toggle activation.</p>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            className="p-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white"
          >
            <option value="">All Roles</option>
            <option value="learner">Learner</option>
            <option value="coach">Coach</option>
            <option value="educator">Educator</option>
            <option value="admin">Admin</option>
          </select>
          <div className="relative w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search user by name/email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-rose-500"
            />
          </div>
        </div>
      </div>

      <Card>
        {loading ? (
          <div className="py-12 text-center text-xs text-slate-400">Loading user database...</div>
        ) : users.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-400">No users match your criteria.</div>
        ) : (
          <div className="divide-y divide-slate-700/50">
            {users.map(u => (
              <div key={u.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-white">{u.full_name}</span>
                    <Badge variant={u.role === 'admin' ? 'danger' : (u.role === 'coach' ? 'warning' : (u.role === 'educator' ? 'purple' : 'primary'))} size="sm">
                      {u.role}
                    </Badge>
                    <Badge variant={u.is_active ? 'success' : 'danger'} size="sm">
                      {u.is_active ? 'Active' : 'Deactivated'}
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-400">
                    {u.email} • Experience: {u.experience_level}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <select
                    value={u.role}
                    onChange={(e) => handleRoleChange(u.id, e.target.value)}
                    className="p-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-300 focus:outline-none"
                  >
                    <option value="learner">Learner</option>
                    <option value="coach">Coach</option>
                    <option value="educator">Educator</option>
                    <option value="admin">Admin</option>
                  </select>

                  <Button
                    size="sm"
                    variant={u.is_active ? 'outline' : 'success'}
                    onClick={() => handleToggleStatus(u.id, u.is_active)}
                    className={u.is_active ? 'text-rose-400 border-rose-500/40' : ''}
                  >
                    {u.is_active ? 'Deactivate' : 'Activate'}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};
