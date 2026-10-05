import React, { useState } from 'react';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import {
  Users,
  Search,
  Filter,
  ChevronRight,
  TrendingUp,
  Award,
  AlertCircle
} from 'lucide-react';

export const StudentRosterPage = () => {
  const [searchTerm, setSearchTerm] = useState('');

  const students = [
    {
      id: 'usr-1',
      name: 'Elena Rostova',
      email: 'elena.r@college.edu',
      format: 'Oxford Parliamentary',
      debates_count: 14,
      avg_score: 88.2,
      primary_weakness: 'Slippery Slope claims in economic motions',
      status: 'Active',
    },
    {
      id: 'usr-2',
      name: 'Marcus Vance',
      email: 'm.vance@college.edu',
      format: 'Lincoln-Douglas',
      debates_count: 9,
      avg_score: 81.0,
      primary_weakness: 'Vocal pacing (>170 WPM in cross-ex)',
      status: 'Active',
    },
    {
      id: 'usr-3',
      name: 'Sarah Chen',
      email: 'schen@college.edu',
      format: 'Oxford Parliamentary',
      debates_count: 18,
      avg_score: 93.5,
      primary_weakness: 'Evidence citation precision',
      status: 'Top Debater',
    },
    {
      id: 'usr-4',
      name: 'Devon Miller',
      email: 'dmiller@college.edu',
      format: 'Lincoln-Douglas',
      debates_count: 5,
      avg_score: 72.4,
      primary_weakness: 'Warrant identification and defense',
      status: 'Needs Coaching',
    },
  ];

  const filtered = students.filter(
    (s) =>
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-12">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-[#0F172A] tracking-tight">
          Debate Cohort & Student Roster
        </h2>
        <p className="text-sm text-slate-500 mt-1">
          Review assigned debaters, monitor AI evaluation telemetry, and identify areas needing individual coaching.
        </p>
      </div>

      {/* Cohort Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card padding="sm">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Enrolled Debaters</div>
          <div className="text-3xl font-extrabold text-[#172554] mt-1">24</div>
          <div className="text-xs text-blue-700 font-medium mt-1">Varsity & Novice Squads</div>
        </Card>

        <Card padding="sm">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Cohort Mean Score</div>
          <div className="text-3xl font-extrabold text-[#172554] mt-1">83.8<span className="text-xs font-normal text-slate-400">/100</span></div>
          <div className="text-xs text-emerald-700 font-medium mt-1">+3.5% vs last tournament</div>
        </Card>

        <Card padding="sm">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Pending Submissions</div>
          <div className="text-3xl font-extrabold text-amber-600 mt-1">7</div>
          <div className="text-xs text-slate-500 mt-1">Awaiting coach review</div>
        </Card>
      </div>

      {/* Search & Roster Table */}
      <Card padding="none" className="overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search student debater..."
              className="w-full bg-slate-50 hover:bg-slate-100/70 focus:bg-white text-xs rounded-xl border border-slate-200 focus:border-[#1E3A8A] focus:ring-2 focus:ring-blue-100 pl-9 pr-3.5 py-2.5 outline-none transition-all"
            />
          </div>

          <Button variant="outline" size="sm" icon={Filter} iconPosition="left">
            Filter by Format
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-700">
            <thead className="text-xs uppercase bg-slate-50/80 text-slate-500 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 font-semibold">Student Debater</th>
                <th className="px-6 py-4 font-semibold">Format</th>
                <th className="px-6 py-4 font-semibold">Debates</th>
                <th className="px-6 py-4 font-semibold">Avg Score</th>
                <th className="px-6 py-4 font-semibold">Key Focus Area</th>
                <th className="px-6 py-4 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-semibold text-[#0F172A]">{s.name}</div>
                    <div className="text-xs text-slate-400">{s.email}</div>
                  </td>
                  <td className="px-6 py-4 text-xs text-slate-600">{s.format}</td>
                  <td className="px-6 py-4 font-semibold text-[#0F172A]">{s.debates_count}</td>
                  <td className="px-6 py-4">
                    <span className="font-bold text-[#172554]">{s.avg_score}</span>
                    <span className="text-xs text-slate-400">/100</span>
                  </td>
                  <td className="px-6 py-4 text-xs text-amber-800">{s.primary_weakness}</td>
                  <td className="px-6 py-4 text-right">
                    <button className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-800 transition-colors cursor-pointer">
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
