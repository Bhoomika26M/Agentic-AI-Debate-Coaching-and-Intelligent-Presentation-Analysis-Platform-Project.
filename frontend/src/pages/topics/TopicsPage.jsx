import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../context/AuthContext';
import { apiClient } from '../../api/client';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Input } from '../../components/ui/Input';
import { Compass, Plus, Search, Filter, BookOpen, AlertCircle } from 'lucide-react';

export const TopicsPage = () => {
  const { isCoach, isEducator, isAdmin } = useAuth();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [selectedDifficulty, setSelectedDifficulty] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Technology & Society');
  const [difficulty, setDifficulty] = useState('INTERMEDIATE');
  const [formError, setFormError] = useState('');

  // 1. Fetch topics
  const { data: topics = [], isLoading } = useQuery({
    queryKey: ['topics', search, selectedDifficulty, selectedCategory],
    queryFn: async () => {
      let url = '/topics?limit=100';
      if (search) url += `&search=${encodeURIComponent(search)}`;
      if (selectedDifficulty) url += `&difficulty=${selectedDifficulty}`;
      if (selectedCategory) url += `&category=${encodeURIComponent(selectedCategory)}`;
      const res = await apiClient.get(url);
      return res.data;
    },
  });

  // 2. Create topic mutation
  const createTopicMutation = useMutation({
    mutationFn: async (newTopic) => {
      const res = await apiClient.post('/topics', newTopic);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['topics']);
      setShowCreateModal(false);
      setTitle('');
      setDescription('');
    },
    onError: (err) => {
      setFormError(err.response?.data?.detail || 'Failed to create topic.');
    },
  });

  const handleCreateSubmit = (e) => {
    e.preventDefault();
    setFormError('');
    if (!title.trim() || !description.trim()) {
      setFormError('Please fill in both title and description.');
      return;
    }
    createTopicMutation.mutate({
      title: title.trim(),
      description: description.trim(),
      category,
      difficulty,
    });
  };

  const categories = Array.from(new Set(topics.map((t) => t.category))).filter(Boolean);

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-white/5">
        <div>
          <span className="text-xs uppercase tracking-widest font-semibold text-arena-amber block mb-1">
            Chamber Motions
          </span>
          <h1 className="text-3xl font-serif font-bold text-white tracking-tight">
            Debate Topics Catalog
          </h1>
          <p className="text-sm text-arena-muted mt-1">
            Explore curated philosophical, legal, economic, and technological propositions for deliberation.
          </p>
        </div>

        {(isCoach || isEducator || isAdmin) && (
          <Button variant="primary" onClick={() => setShowCreateModal(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Author Motion
          </Button>
        )}
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="relative w-full sm:w-96">
          <Search className="w-4 h-4 text-arena-muted absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search motions by title..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-arena-bg-card border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-xs text-arena-parchment placeholder-arena-muted/50 focus:outline-none focus:border-arena-amber transition"
          />
        </div>

        <div className="flex gap-2 w-full sm:w-auto">
          <select
            value={selectedDifficulty}
            onChange={(e) => setSelectedDifficulty(e.target.value)}
            className="bg-arena-bg-card border border-white/10 rounded-xl px-3 py-2 text-xs text-arena-parchment focus:outline-none focus:border-arena-amber"
          >
            <option value="">All Difficulties</option>
            <option value="BEGINNER">Beginner</option>
            <option value="INTERMEDIATE">Intermediate</option>
            <option value="ADVANCED">Advanced</option>
          </select>

          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="bg-arena-bg-card border border-white/10 rounded-xl px-3 py-2 text-xs text-arena-parchment focus:outline-none focus:border-arena-amber"
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Topics Grid */}
      {isLoading ? (
        <div className="text-center py-24 text-sm text-arena-muted">Loading chamber motions...</div>
      ) : topics.length === 0 ? (
        <div className="text-center py-24 text-sm text-arena-muted">
          No motions found matching your criteria.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {topics.map((t) => (
            <Card key={t.id} glow className="flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <Badge variant="amber">{t.category}</Badge>
                  <span
                    className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${
                      t.difficulty === 'ADVANCED'
                        ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                        : t.difficulty === 'INTERMEDIATE'
                        ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20'
                        : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    }`}
                  >
                    {t.difficulty}
                  </span>
                </div>
                <h3 className="font-serif font-bold text-white text-base mb-2 leading-snug">
                  {t.title}
                </h3>
                <p className="text-xs text-arena-muted leading-relaxed line-clamp-3">
                  {t.description}
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-white/5 flex items-center justify-between">
                <span className="text-[10px] text-arena-muted font-mono">
                  Added {new Date(t.created_at).toLocaleDateString()}
                </span>
                <Button variant="secondary" size="sm">
                  Examine Motion
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Author Topic Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="w-full max-w-lg bg-arena-bg-card border-white/10 p-6">
            <h3 className="text-xl font-serif font-bold text-white mb-2">Author Chamber Motion</h3>
            <p className="text-xs text-arena-muted mb-4">
              Formulate a rigorous proposition with background context for participants.
            </p>

            {formError && (
              <div className="mb-4 p-3 rounded-xl bg-arena-opp/10 border border-arena-opp/30 flex items-center gap-2 text-arena-opp text-xs">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <Input
                label="Motion Title"
                placeholder="e.g. Autonomous AI Systems Should Have Legal Personhood"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-arena-muted mb-1.5">
                  Motion Background & Core Deliberation
                </label>
                <textarea
                  rows={4}
                  placeholder="Detail the ethical, societal, or economic conflict to be resolved..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                  className="w-full bg-arena-bg-elevated border border-white/10 rounded-xl p-3 text-xs text-arena-parchment focus:outline-none focus:border-arena-amber transition"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-arena-muted mb-1.5">
                    Category
                  </label>
                  <input
                    type="text"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    required
                    className="w-full bg-arena-bg-elevated border border-white/10 rounded-xl px-3 py-2 text-xs text-arena-parchment focus:outline-none focus:border-arena-amber"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-arena-muted mb-1.5">
                    Difficulty
                  </label>
                  <select
                    value={difficulty}
                    onChange={(e) => setDifficulty(e.target.value)}
                    className="w-full bg-arena-bg-elevated border border-white/10 rounded-xl px-3 py-2 text-xs text-arena-parchment focus:outline-none focus:border-arena-amber"
                  >
                    <option value="BEGINNER">Beginner</option>
                    <option value="INTERMEDIATE">Intermediate</option>
                    <option value="ADVANCED">Advanced</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowCreateModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  isLoading={createTopicMutation.isPending}
                >
                  Publish Motion
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
};
