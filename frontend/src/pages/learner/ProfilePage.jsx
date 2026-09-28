import React, { useState } from 'react';
import { User, Mail, Award, BookOpen, Target, CheckCircle2, Shield } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';

export const ProfilePage = () => {
  const { user } = useAuth();
  const profile = user?.profile || {};

  const [formData, setFormData] = useState({
    full_name: user?.full_name || '',
    experience_level: profile.experience_level || 'Beginner',
    preferred_topics: profile.preferred_topics || 'Technology, Ethics, Education',
    presentation_domains: profile.presentation_domains || 'Academic, Business, Keynote',
    learning_goals: profile.learning_goals || 'Improve rebuttal speed, eliminate fallacies',
    coaching_preferences: profile.coaching_preferences || 'Direct, Analytical',
    bio: profile.bio || 'Debater on DebateAI platform'
  });
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSavedSuccess(false);
    try {
      await api.put('/auth/me', formData);
      setSavedSuccess(true);
    } catch (err) {
      alert(err.message || 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 py-6">
      {/* Header Profile Summary */}
      <div className="flex flex-col sm:flex-row items-center gap-6 bg-slate-800/80 border border-slate-700/60 rounded-2xl p-6">
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-primary-600 to-indigo-600 flex items-center justify-center text-3xl font-black text-white shadow-xl shadow-primary-500/25 uppercase">
          {user?.full_name?.charAt(0) || 'U'}
        </div>
        <div className="space-y-1 text-center sm:text-left flex-1">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <h1 className="text-xl font-black text-white">{user?.full_name}</h1>
            <Badge variant="primary" size="sm" className="capitalize">{user?.role}</Badge>
          </div>
          <p className="text-xs text-slate-400">{user?.email}</p>
          <p className="text-xs text-slate-300 italic mt-1">{formData.bio}</p>
        </div>
      </div>

      {/* Profile Edit Form */}
      <Card title="Profile & Coaching Preferences">
        {savedSuccess && (
          <div className="mb-4 p-3 bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-300 rounded-lg flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" /> Profile preferences updated successfully.
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Full Name</label>
              <input
                type="text"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-primary-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Experience Level</label>
              <select
                value={formData.experience_level}
                onChange={(e) => setFormData({ ...formData, experience_level: e.target.value })}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-primary-500"
              >
                <option>Beginner</option>
                <option>Intermediate</option>
                <option>Advanced</option>
                <option>Expert</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Preferred Debate Topics</label>
            <input
              type="text"
              value={formData.preferred_topics}
              onChange={(e) => setFormData({ ...formData, preferred_topics: e.target.value })}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-primary-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Presentation Domains</label>
            <input
              type="text"
              value={formData.presentation_domains}
              onChange={(e) => setFormData({ ...formData, presentation_domains: e.target.value })}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-primary-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Learning Goals</label>
            <textarea
              rows={2}
              value={formData.learning_goals}
              onChange={(e) => setFormData({ ...formData, learning_goals: e.target.value })}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-primary-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Coaching Preferences</label>
            <input
              type="text"
              value={formData.coaching_preferences}
              onChange={(e) => setFormData({ ...formData, coaching_preferences: e.target.value })}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-primary-500"
            />
          </div>

          <div className="flex justify-end pt-4">
            <Button type="submit" loading={saving} size="md">Save Profile Settings</Button>
          </div>
        </form>
      </Card>
    </div>
  );
};
