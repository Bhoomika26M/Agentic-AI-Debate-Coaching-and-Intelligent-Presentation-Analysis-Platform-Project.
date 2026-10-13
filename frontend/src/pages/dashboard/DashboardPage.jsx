import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../context/AuthContext';
import { apiClient } from '../../api/client';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { RadarChart } from '../../components/ui/RadarChart';
import {
  Calendar,
  Sparkles,
  Target,
  Flame,
  ArrowRight,
  PlusCircle,
  PlayCircle,
  Users,
  Compass,
  Trophy,
} from 'lucide-react';

export const DashboardPage = () => {
  const { user, isCoach, isEducator, isAdmin, isLearner } = useAuth();

  // 1. Fetch upcoming debate sessions
  const { data: sessions = [], isLoading: loadingSessions } = useQuery({
    queryKey: ['sessions'],
    queryFn: async () => {
      const res = await apiClient.get('/sessions?limit=5');
      return res.data;
    },
  });

  // 2. Fetch skills
  const { data: mySkills = [] } = useQuery({
    queryKey: ['mySkills'],
    queryFn: async () => {
      const res = await apiClient.get('/skills/me');
      return res.data;
    },
  });

  // 3. Fetch goals
  const { data: goals = [] } = useQuery({
    queryKey: ['goals'],
    queryFn: async () => {
      const res = await apiClient.get('/goals');
      return res.data;
    },
  });

  // 4. Fetch recommended topics
  const { data: topics = [] } = useQuery({
    queryKey: ['topics'],
    queryFn: async () => {
      const res = await apiClient.get('/topics?limit=3');
      return res.data;
    },
  });

  const radarData = mySkills.slice(0, 6).map((s) => ({
    label: s.skill_name.length > 14 ? s.skill_name.substring(0, 12) + '..' : s.skill_name,
    value: s.level,
  }));

  const recommendedTopic = topics[0];

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Hero Rostrum Banner */}
      <div className="relative p-8 rounded-3xl bg-gradient-to-r from-arena-bg-card via-arena-bg-elevated to-arena-bg-card border border-white/5 overflow-hidden">
        {/* Ambient spot */}
        <div className="absolute right-0 top-0 w-96 h-96 bg-arena-amber/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-arena-amber/10 border border-arena-amber/20 text-arena-amber text-xs font-semibold uppercase tracking-wider mb-3">
              <Sparkles className="w-3.5 h-3.5" />
              <span>{user?.role?.replace('_', ' ')} Command Center</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-serif font-bold text-white tracking-tight">
              Welcome to the Chamber, {user?.full_name?.split(' ')[0]}
            </h1>
            <p className="text-sm text-arena-muted mt-2 max-w-xl leading-relaxed">
              Sharpen your argumentation forensics, evaluate opposing claims, and master the art of
              unassailable refutation.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {(isCoach || isEducator || isAdmin) ? (
              <Link to="/sessions/new">
                <Button variant="primary" size="md">
                  <PlusCircle className="w-4 h-4 mr-2" />
                  Schedule Session
                </Button>
              </Link>
            ) : (
              <Link to="/topics">
                <Button variant="primary" size="md">
                  <PlayCircle className="w-4 h-4 mr-2" />
                  Start a Debate
                </Button>
              </Link>
            )}
            <Link to="/topics">
              <Button variant="secondary" size="md">
                Browse Motions
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Bento Grid Layout */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {/* Card 1: Upcoming Debates (Span 2) */}
        <Card className="md:col-span-2 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-arena-amber" />
                <h3 className="font-serif font-bold text-white text-base">Upcoming Debates</h3>
              </div>
              <Link to="/sessions" className="text-xs text-arena-amber hover:underline flex items-center gap-1">
                View all <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            {loadingSessions ? (
              <p className="text-xs text-arena-muted py-8 text-center">Loading scheduled motions...</p>
            ) : sessions.length === 0 ? (
              <div className="text-center py-12 text-xs text-arena-muted">
                No sessions currently scheduled.
              </div>
            ) : (
              <div className="space-y-3">
                {sessions.map((sess) => (
                  <div
                    key={sess.id}
                    className="p-3.5 rounded-xl bg-arena-bg-elevated border border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-white/10 transition"
                  >
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="amber">{sess.format?.replace('_', ' ')}</Badge>
                        <span className="text-[11px] font-mono text-arena-muted">
                          {new Date(sess.scheduled_at).toLocaleDateString([], {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                      <h4 className="text-xs font-semibold text-white truncate max-w-sm">
                        {sess.topic?.title || 'Chamber Motion'}
                      </h4>
                    </div>

                    <Link to={`/sessions/${sess.id}`} className="shrink-0">
                      <Button variant="secondary" size="sm">
                        Join Chamber
                      </Button>
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>

        {/* Card 2: Skill Radar Summary */}
        <Card className="flex flex-col items-center justify-between">
          <div className="w-full flex items-center justify-between mb-2">
            <h3 className="font-serif font-bold text-white text-base">Skill Radar</h3>
            <Link to="/profile" className="text-xs text-arena-amber hover:underline">
              Calibrate
            </Link>
          </div>
          <div className="my-auto py-2">
            <RadarChart data={radarData} size={230} />
          </div>
          <div className="w-full text-center border-t border-white/5 pt-2">
            <span className="text-[11px] text-arena-muted">
              {mySkills.length} Forensics Dimensions Tracked
            </span>
          </div>
        </Card>

        {/* Card 3: Forensics Streak & Status */}
        <Card className="flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-arena-amber mb-3">
              <Flame className="w-5 h-5 fill-arena-amber" />
              <h3 className="font-serif font-bold text-white text-base">Chamber Streak</h3>
            </div>
            <div className="text-4xl font-serif font-bold text-white tracking-tight">4 Days</div>
            <p className="text-xs text-arena-muted mt-1 leading-relaxed">
              Continuous engagement across parliamentary cross-examinations and rebuttal practice.
            </p>
          </div>

          <div className="mt-6 pt-4 border-t border-white/5 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-arena-muted">Rostrum Standing:</span>
              <span className="text-arena-parchment font-semibold">
                {user?.profile?.experience_level || 'Beginner'}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-arena-muted">Active Goals:</span>
              <span className="text-arena-prop font-semibold">{goals.length} Targets</span>
            </div>
          </div>
        </Card>

        {/* Card 4: Recommended Motion / Topic (Span 2) */}
        {recommendedTopic && (
          <Card className="md:col-span-2 relative overflow-hidden bg-gradient-to-br from-arena-bg-card to-arena-bg-elevated border-arena-amber/20">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Compass className="w-4 h-4 text-arena-amber" />
                <span className="text-xs font-semibold uppercase tracking-wider text-arena-amber">
                  Spotlight Motion
                </span>
              </div>
              <Badge variant="amber">{recommendedTopic.category}</Badge>
            </div>
            <h3 className="text-lg font-serif font-bold text-white mb-2 leading-snug">
              {recommendedTopic.title}
            </h3>
            <p className="text-xs text-arena-muted line-clamp-2 mb-4 leading-relaxed">
              {recommendedTopic.description}
            </p>
            <div className="flex items-center justify-between pt-2">
              <span className="text-[11px] font-mono text-arena-muted">
                Difficulty: {recommendedTopic.difficulty}
              </span>
              <Link to="/topics">
                <Button variant="outline" size="sm">
                  Debate this Motion
                </Button>
              </Link>
            </div>
          </Card>
        )}

        {/* Card 5: Goal Progress Tracker (Span 2) */}
        <Card className="md:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-arena-prop" />
              <h3 className="font-serif font-bold text-white text-base">Goal Trajectory</h3>
            </div>
            <Link to="/profile" className="text-xs text-arena-prop hover:underline">
              Manage
            </Link>
          </div>

          <div className="space-y-3">
            {goals.slice(0, 3).map((g) => (
              <div key={g.id} className="p-3 rounded-xl bg-arena-bg-elevated/60 border border-white/5">
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="font-medium text-white truncate max-w-xs">{g.title}</span>
                  <span className="font-mono text-arena-prop text-[11px] shrink-0">{g.progress}%</span>
                </div>
                <div className="w-full bg-arena-bg-dark h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-arena-prop h-full transition-all duration-300"
                    style={{ width: `${g.progress}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
};
