import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../context/AuthContext';
import { apiClient } from '../../api/client';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { RadarChart } from '../../components/ui/RadarChart';
import { Plus, Target, CheckCircle2, Sliders, User, Sparkles } from 'lucide-react';

export const ProfilePage = () => {
  const { user, updateUserProfile } = useAuth();
  const queryClient = useQueryClient();

  // Profile Form state
  const [bio, setBio] = useState(user?.profile?.bio || '');
  const [level, setLevel] = useState(user?.profile?.experience_level || 'BEGINNER');
  const [coachingStyle, setCoachingStyle] = useState(user?.profile?.coaching_style || 'Analytical & Direct');
  const [profileSaved, setProfileSaved] = useState(false);

  // New Goal modal/input state
  const [newGoalTitle, setNewGoalTitle] = useState('');

  // 1. Fetch user skills
  const { data: mySkills = [], isLoading: loadingSkills } = useQuery({
    queryKey: ['mySkills'],
    queryFn: async () => {
      const res = await apiClient.get('/skills/me');
      return res.data;
    },
  });

  // 2. Fetch learning goals
  const { data: goals = [], isLoading: loadingGoals } = useQuery({
    queryKey: ['goals'],
    queryFn: async () => {
      const res = await apiClient.get('/goals');
      return res.data;
    },
  });

  // Mutations
  const updateProfileMutation = useMutation({
    mutationFn: async (updated) => {
      const res = await apiClient.patch('/profile', updated);
      return res.data;
    },
    onSuccess: (data) => {
      updateUserProfile({ ...user, profile: data });
      setProfileSaved(true);
      setTimeout(() => setProfileSaved(false), 3000);
    },
  });

  const createGoalMutation = useMutation({
    mutationFn: async (title) => {
      const res = await apiClient.post('/goals', { title, progress: 0 });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['goals']);
      setNewGoalTitle('');
    },
  });

  const updateGoalProgressMutation = useMutation({
    mutationFn: async ({ goalId, progress }) => {
      const res = await apiClient.patch(`/goals/${goalId}`, { progress });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['goals']);
    },
  });

  const updateSkillMutation = useMutation({
    mutationFn: async ({ skillId, level }) => {
      const res = await apiClient.put('/skills/me', { skill_id: skillId, level });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['mySkills']);
    },
  });

  const handleProfileSubmit = (e) => {
    e.preventDefault();
    updateProfileMutation.mutate({
      bio,
      experience_level: level,
      coaching_style: coachingStyle,
    });
  };

  const radarData = mySkills.map((s) => ({
    label: s.skill_name.length > 18 ? s.skill_name.substring(0, 16) + '..' : s.skill_name,
    value: s.level,
  }));

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-white/5">
        <div>
          <span className="text-xs uppercase tracking-widest font-semibold text-arena-amber block mb-1">
            Forensic Portfolio
          </span>
          <h1 className="text-3xl font-serif font-bold text-white tracking-tight">
            Profile & Skills Mastery
          </h1>
          <p className="text-sm text-arena-muted mt-1">
            Calibrate your debating attributes, track Toulmin mastery, and achieve forensic milestones.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Profile Card */}
        <div className="space-y-6">
          <Card>
            <div className="flex items-center gap-4 mb-6">
              <img
                src={user?.profile?.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${user?.id}`}
                alt={user?.full_name}
                className="w-16 h-16 rounded-2xl bg-arena-bg-elevated border border-white/10"
              />
              <div>
                <h3 className="font-serif font-bold text-lg text-white">{user?.full_name}</h3>
                <p className="text-xs text-arena-muted">{user?.email}</p>
                <div className="mt-1">
                  <Badge variant="amber">{user?.role?.replace('_', ' ')}</Badge>
                </div>
              </div>
            </div>

            <form onSubmit={handleProfileSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-arena-muted mb-1">
                  Experience Level
                </label>
                <select
                  value={level}
                  onChange={(e) => setLevel(e.target.value)}
                  className="w-full bg-arena-bg-elevated border border-white/10 rounded-xl px-3 py-2 text-xs text-arena-parchment focus:outline-none focus:border-arena-amber"
                >
                  <option value="BEGINNER">Beginner</option>
                  <option value="INTERMEDIATE">Intermediate</option>
                  <option value="ADVANCED">Advanced</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-arena-muted mb-1">
                  Coaching Preference
                </label>
                <input
                  type="text"
                  value={coachingStyle}
                  onChange={(e) => setCoachingStyle(e.target.value)}
                  className="w-full bg-arena-bg-elevated border border-white/10 rounded-xl px-3 py-2 text-xs text-arena-parchment focus:outline-none focus:border-arena-amber"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-arena-muted mb-1">
                  Rostrum Bio
                </label>
                <textarea
                  rows={3}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Tell the chamber about your forensic background..."
                  className="w-full bg-arena-bg-elevated border border-white/10 rounded-xl px-3 py-2 text-xs text-arena-parchment placeholder-arena-muted/50 focus:outline-none focus:border-arena-amber"
                />
              </div>

              <Button
                type="submit"
                variant="primary"
                size="sm"
                className="w-full"
                isLoading={updateProfileMutation.isPending}
              >
                {profileSaved ? 'Profile Updated!' : 'Save Profile Changes'}
              </Button>
            </form>
          </Card>

          {/* Interests Card */}
          <Card>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-arena-amber mb-3">
              Preferred Topics
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {(user?.profile?.preferred_topics || []).length > 0 ? (
                user.profile.preferred_topics.map((t, i) => (
                  <Badge key={i} variant="default" className="text-[10px]">
                    {t}
                  </Badge>
                ))
              ) : (
                <span className="text-xs text-arena-muted">No topics selected in onboarding yet.</span>
              )}
            </div>
          </Card>
        </div>

        {/* Center Column: Skill Radar Chart & Sliders */}
        <div className="space-y-6">
          <Card className="flex flex-col items-center">
            <div className="w-full flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-arena-amber" />
                <h3 className="font-serif font-bold text-white text-base">Forensics Skill Radar</h3>
              </div>
              <span className="text-xs font-mono text-arena-amber font-semibold">
                {mySkills.length} Traits
              </span>
            </div>

            {loadingSkills ? (
              <div className="h-64 flex items-center justify-center text-xs text-arena-muted">
                Calibrating radar metrics...
              </div>
            ) : (
              <RadarChart data={radarData} size={300} />
            )}
          </Card>

          {/* Interactive Skill Sliders */}
          <Card>
            <h4 className="font-serif font-bold text-white text-sm mb-3">Refine Skill Self-Assessments</h4>
            <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
              {mySkills.map((sk) => (
                <div key={sk.skill_id} className="text-xs">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-arena-parchment">{sk.skill_name}</span>
                    <span className="font-mono text-arena-amber">{sk.level}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={sk.level}
                    onChange={(e) =>
                      updateSkillMutation.mutate({
                        skillId: sk.skill_id,
                        level: parseInt(e.target.value),
                      })
                    }
                    className="w-full accent-arena-amber cursor-pointer"
                  />
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Right Column: Learning Goals Tracker */}
        <div className="space-y-6">
          <Card>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-arena-prop" />
                <h3 className="font-serif font-bold text-white text-base">Learning Goals</h3>
              </div>
              <Badge variant="prop">{goals.length} Active</Badge>
            </div>

            {/* Quick add goal */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (newGoalTitle.trim()) {
                  createGoalMutation.mutate(newGoalTitle.trim());
                }
              }}
              className="flex gap-2 mb-4"
            >
              <input
                type="text"
                placeholder="New target (e.g. Master Toulmin warrants)..."
                value={newGoalTitle}
                onChange={(e) => setNewGoalTitle(e.target.value)}
                className="flex-1 bg-arena-bg-elevated border border-white/10 rounded-xl px-3 py-1.5 text-xs text-arena-parchment placeholder-arena-muted/50 focus:outline-none focus:border-arena-prop"
              />
              <Button type="submit" variant="prop" size="sm" isLoading={createGoalMutation.isPending}>
                <Plus className="w-3.5 h-3.5" />
              </Button>
            </form>

            {/* Goals list */}
            <div className="space-y-3">
              {loadingGoals ? (
                <p className="text-xs text-arena-muted">Loading goals...</p>
              ) : goals.length === 0 ? (
                <div className="text-center py-8 text-xs text-arena-muted">
                  No learning goals set. Add one above!
                </div>
              ) : (
                goals.map((goal) => (
                  <div
                    key={goal.id}
                    className="p-3 rounded-xl bg-arena-bg-elevated border border-white/5 space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-xs font-medium text-white">{goal.title}</p>
                      <span className="text-[10px] font-mono text-arena-prop shrink-0">
                        {goal.progress}%
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-arena-bg-dark h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-arena-prop h-full transition-all duration-300"
                        style={{ width: `${goal.progress}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <button
                        onClick={() =>
                          updateGoalProgressMutation.mutate({
                            goalId: goal.id,
                            progress: Math.min(100, goal.progress + 20),
                          })
                        }
                        className="text-[10px] text-arena-muted hover:text-arena-prop transition"
                      >
                        +20% Progress
                      </button>
                      {goal.progress >= 100 && (
                        <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-semibold">
                          <CheckCircle2 className="w-3 h-3" /> Completed
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
