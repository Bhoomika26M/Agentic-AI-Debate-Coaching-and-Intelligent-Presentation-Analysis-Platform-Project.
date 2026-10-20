import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import {
  User,
  Mail,
  Shield,
  Award,
  Clock,
  Swords,
  Mic,
  Scale,
  Presentation,
  CheckCircle2
} from 'lucide-react';

export const ProfilePage = () => {
  const { user } = useAuth();

  return (
    <div className="space-y-8 max-w-4xl mx-auto pb-12">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-[#0F172A] tracking-tight">
          User Profile
        </h2>
        <p className="text-sm text-slate-500 mt-1">
          Manage your account credentials and review cumulative practice activity statistics.
        </p>
      </div>

      {/* Main Profile Info Card */}
      <Card className="border-slate-200">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5 pb-6 border-b border-slate-100">
          <div className="w-16 h-16 rounded-2xl bg-[#172554] text-white font-extrabold text-2xl flex items-center justify-center shadow-xs">
            {user?.username?.charAt(0).toUpperCase() || 'U'}
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h3 className="text-xl font-bold text-[#0F172A]">{user?.username || 'Alex Debater'}</h3>
              <Badge variant="blue" size="sm">
                {user?.role || 'Learner'}
              </Badge>
            </div>
            <p className="text-xs text-slate-500 flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-slate-400" />
              <span>{user?.email || 'alex.debater@college.edu'}</span>
            </p>
          </div>
        </div>

        {/* Core Attributes: Name, Email, Role, Skill Level */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-6 text-sm">
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
              Account Name
            </span>
            <div className="font-semibold text-slate-800">{user?.username || 'Alex Debater'}</div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
              Registered Email
            </span>
            <div className="font-semibold text-slate-800">{user?.email || 'alex.debater@college.edu'}</div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
              Platform Role
            </span>
            <div className="font-semibold text-slate-800 capitalize">
              {user?.role?.toLowerCase() || 'Learner (Debater / Speaker)'}
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-blue-50/50 border border-blue-100">
            <span className="text-xs font-semibold text-blue-900 uppercase tracking-wider block mb-1">
              Assessed Skill Level
            </span>
            <div className="font-bold text-[#172554] flex items-center gap-1.5">
              <Award className="w-4 h-4 text-blue-700" />
              <span>Collegiate Varsity (Level 4)</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Practice Statistics */}
      <div className="space-y-4">
        <h3 className="text-lg font-bold text-[#0F172A] tracking-tight">
          Practice Statistics
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Card padding="sm" className="text-center">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center mx-auto mb-2">
              <Swords className="w-4 h-4" />
            </div>
            <div className="text-2xl font-extrabold text-[#172554]">12</div>
            <span className="text-xs text-slate-500">Debates Completed</span>
          </Card>

          <Card padding="sm" className="text-center">
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-700 flex items-center justify-center mx-auto mb-2">
              <Scale className="w-4 h-4" />
            </div>
            <div className="text-2xl font-extrabold text-purple-800">26</div>
            <span className="text-xs text-slate-500">Arguments Analyzed</span>
          </Card>

          <Card padding="sm" className="text-center">
            <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center mx-auto mb-2">
              <Mic className="w-4 h-4" />
            </div>
            <div className="text-2xl font-extrabold text-teal-800">8</div>
            <span className="text-xs text-slate-500">Speeches Evaluated</span>
          </Card>

          <Card padding="sm" className="text-center">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center mx-auto mb-2">
              <Clock className="w-4 h-4" />
            </div>
            <div className="text-2xl font-extrabold text-emerald-800">14.5</div>
            <span className="text-xs text-slate-500">Practice Hours</span>
          </Card>
        </div>
      </div>
    </div>
  );
};
