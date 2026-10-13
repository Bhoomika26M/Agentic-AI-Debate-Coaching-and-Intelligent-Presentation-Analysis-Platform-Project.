import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../context/AuthContext';
import { apiClient } from '../../api/client';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Calendar, Plus, Clock, Users, Play, CheckCircle } from 'lucide-react';

export const SessionsListPage = () => {
  const { user, isCoach, isEducator, isAdmin } = useAuth();
  const [filterStatus, setFilterStatus] = useState('');
  const [mineOnly, setMineOnly] = useState(false);

  // 1. Fetch sessions
  const { data: sessions = [], isLoading } = useQuery({
    queryKey: ['sessions', filterStatus, mineOnly],
    queryFn: async () => {
      let url = '/sessions?limit=100';
      if (filterStatus) url += `&status=${filterStatus}`;
      if (mineOnly) url += `&mine_only=true`;
      const res = await apiClient.get(url);
      return res.data;
    },
  });

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-white/5">
        <div>
          <span className="text-xs uppercase tracking-widest font-semibold text-arena-amber block mb-1">
            Forensics Calendar
          </span>
          <h1 className="text-3xl font-serif font-bold text-white tracking-tight">
            Chamber Debate Sessions
          </h1>
          <p className="text-sm text-arena-muted mt-1">
            Participate in scheduled parliamentary deliberations or review past clashes.
          </p>
        </div>

        {(isCoach || isEducator || isAdmin) && (
          <Link to="/sessions/new">
            <Button variant="primary">
              <Plus className="w-4 h-4 mr-2" />
              Schedule Session
            </Button>
          </Link>
        )}
      </div>

      {/* Filter controls */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex gap-2">
          {['', 'SCHEDULED', 'LIVE', 'COMPLETED'].map((st) => (
            <button
              key={st}
              onClick={() => setFilterStatus(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition ${
                filterStatus === st
                  ? 'bg-arena-amber/15 text-arena-amber border border-arena-amber/30'
                  : 'bg-arena-bg-card border border-white/5 text-arena-muted hover:text-white'
              }`}
            >
              {st ? st : 'All Sessions'}
            </button>
          ))}
        </div>

        <label className="flex items-center gap-2 text-xs text-arena-muted cursor-pointer">
          <input
            type="checkbox"
            checked={mineOnly}
            onChange={(e) => setMineOnly(e.target.checked)}
            className="rounded accent-arena-amber"
          />
          <span>Show my debates only</span>
        </label>
      </div>

      {/* Sessions List */}
      {isLoading ? (
        <div className="text-center py-24 text-sm text-arena-muted">Loading debate sessions...</div>
      ) : sessions.length === 0 ? (
        <div className="text-center py-24 text-sm text-arena-muted">
          No debate sessions found. Schedule one above!
        </div>
      ) : (
        <div className="space-y-4">
          {sessions.map((sess) => {
            const propParticipant = sess.participants?.find((p) => p.position === 'PROPOSITION');
            const oppParticipant = sess.participants?.find((p) => p.position === 'OPPOSITION');

            return (
              <Card key={sess.id} glow className="p-6">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                  {/* Topic & Format Info */}
                  <div className="space-y-2 max-w-xl">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="amber">{sess.format?.replace('_', ' ')}</Badge>
                      <span
                        className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${
                          sess.status === 'LIVE'
                            ? 'bg-red-500/15 text-red-400 border border-red-500/30 animate-pulse'
                            : sess.status === 'COMPLETED'
                            ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                            : 'bg-white/10 text-arena-parchment'
                        }`}
                      >
                        {sess.status}
                      </span>
                      <span className="flex items-center gap-1 text-[11px] font-mono text-arena-muted">
                        <Clock className="w-3.5 h-3.5" />
                        {sess.duration_min} min
                      </span>
                    </div>

                    <h3 className="font-serif font-bold text-lg text-white">
                      {sess.topic?.title || 'Chamber Motion'}
                    </h3>
                    <p className="text-xs text-arena-muted line-clamp-1">
                      {sess.topic?.description}
                    </p>
                  </div>

                  {/* Versus Split Layout (Proposition vs Opposition) */}
                  <div className="flex items-center gap-4 bg-arena-bg-elevated/70 p-3.5 rounded-2xl border border-white/5 shrink-0">
                    {/* Proposition Side (Teal) */}
                    <div className="text-center min-w-[100px]">
                      <span className="text-[9px] font-mono uppercase tracking-wider text-arena-prop block font-semibold mb-1">
                        Proposition
                      </span>
                      <span className="text-xs font-medium text-white block truncate max-w-[110px]">
                        {propParticipant?.user?.full_name || 'Open Seat'}
                      </span>
                    </div>

                    <span className="font-serif font-bold text-arena-amber text-xs italic">vs</span>

                    {/* Opposition Side (Crimson) */}
                    <div className="text-center min-w-[100px]">
                      <span className="text-[9px] font-mono uppercase tracking-wider text-arena-opp block font-semibold mb-1">
                        Opposition
                      </span>
                      <span className="text-xs font-medium text-white block truncate max-w-[110px]">
                        {oppParticipant?.user?.full_name || 'Open Seat'}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-3 shrink-0">
                    <Link to={`/sessions/${sess.id}`}>
                      <Button variant="primary" size="sm">
                        <Play className="w-3.5 h-3.5 mr-1.5" />
                        Enter Chamber
                      </Button>
                    </Link>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};
