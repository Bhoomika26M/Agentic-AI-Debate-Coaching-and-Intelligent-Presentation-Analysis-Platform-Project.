import React, { useState, useEffect } from 'react';
import {
  User as UserIcon,
  Save,
  CheckCircle2,
  Shield,
  Layers,
  Award,
  BookOpen
} from 'lucide-react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';

export default function Profile() {
  const { user, refreshUser } = useAuth();
  const [fullName, setFullName] = useState('');
  const [institution, setInstitution] = useState('');
  const [bio, setBio] = useState('');
  const [experienceLevel, setExperienceLevel] = useState('Intermediate');
  const [topicsInput, setTopicsInput] = useState('');
  const [goalsInput, setGoalsInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (user) {
      setFullName(user.full_name || '');
      setBio(user.profile?.bio || '');
      setInstitution(user.profile?.institution || '');
      setExperienceLevel(user.profile?.experience_level || 'Intermediate');
      setTopicsInput((user.profile?.preferred_debate_topics || []).join(', '));
      setGoalsInput((user.profile?.learning_goals || []).join(', '));
    }
  }, [user]);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSuccess(false);

    try {
      await api.put('/users/profile', {
        full_name: fullName,
        institution,
        bio,
        experience_level: experienceLevel,
        preferred_debate_topics: topicsInput.split(',').map((s) => s.trim()).filter(Boolean),
        learning_goals: goalsInput.split(',').map((s) => s.trim()).filter(Boolean)
      });
      await refreshUser();
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to update profile:', err);
      alert('Could not update profile.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="bg-white rounded-2xl border border-[#ECE7DE] p-6 shadow-card flex items-center justify-between">
        <div className="flex items-center space-x-3.5">
          <div className="w-10 h-10 rounded-xl bg-[#FCF6E5] flex items-center justify-center text-[#D49B19]">
            <UserIcon className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-[#1E242B]">User Profile & Skill Settings</h2>
            <p className="text-xs text-gray-500">
              Manage your speaker credentials, target domains, and personalized coaching preferences.
            </p>
          </div>
        </div>

        {success && (
          <div className="flex items-center space-x-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-semibold">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Profile Saved</span>
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-[#ECE7DE] p-8 shadow-card">
        <form onSubmit={handleSave} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                Full Name
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                className="w-full px-3 py-2.5 text-xs rounded-xl border border-[#ECE7DE] bg-white focus:outline-none focus:border-[#D49B19]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                Email Address
              </label>
              <input
                type="text"
                value={user?.email || ''}
                disabled
                className="w-full px-3 py-2.5 text-xs rounded-xl border border-[#ECE7DE] bg-gray-50 text-gray-500 cursor-not-allowed"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                Institution / Debate Society
              </label>
              <input
                type="text"
                value={institution}
                onChange={(e) => setInstitution(e.target.value)}
                className="w-full px-3 py-2.5 text-xs rounded-xl border border-[#ECE7DE] bg-white focus:outline-none focus:border-[#D49B19]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                Experience Tier
              </label>
              <select
                value={experienceLevel}
                onChange={(e) => setExperienceLevel(e.target.value)}
                className="w-full px-3 py-2.5 text-xs font-semibold rounded-xl border border-[#ECE7DE] bg-white focus:outline-none focus:border-[#D49B19]"
              >
                <option value="Novice">Novice</option>
                <option value="Intermediate">Intermediate</option>
                <option value="Advanced">Advanced</option>
                <option value="Master">Master</option>
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
              Speaker Bio
            </label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 text-xs rounded-xl border border-[#ECE7DE] bg-white focus:outline-none focus:border-[#D49B19] leading-relaxed"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
              Preferred Debate Topics (comma-separated)
            </label>
            <input
              type="text"
              value={topicsInput}
              onChange={(e) => setTopicsInput(e.target.value)}
              className="w-full px-3 py-2.5 text-xs rounded-xl border border-[#ECE7DE] bg-white focus:outline-none focus:border-[#D49B19]"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
              Active Learning Goals (comma-separated)
            </label>
            <input
              type="text"
              value={goalsInput}
              onChange={(e) => setGoalsInput(e.target.value)}
              className="w-full px-3 py-2.5 text-xs rounded-xl border border-[#ECE7DE] bg-white focus:outline-none focus:border-[#D49B19]"
            />
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#DF9E16] to-[#B87E0E] text-white font-bold text-xs shadow-xs hover:opacity-95 disabled:opacity-50 transition-all flex items-center space-x-2"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Saving...' : 'Save Changes'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
