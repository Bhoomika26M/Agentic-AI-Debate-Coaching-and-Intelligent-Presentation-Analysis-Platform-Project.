import React, { useState, useEffect } from 'react';
import { Users, Award, BookOpen, Search, Filter, ArrowRight } from 'lucide-react';
import api from '../../services/api';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';

export const CoachStudentsPage = () => {
  const [students, setStudents] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/dashboards/coach')
      .then(res => setStudents(res.data.students_list || []))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const filteredStudents = students.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="max-w-5xl mx-auto space-y-6 py-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">Student Directory & Profiles</h1>
          <p className="text-xs text-slate-400 mt-1">Track individual student mastery, debate scores, and practice drills.</p>
        </div>
        <div className="relative w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search students..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
          />
        </div>
      </div>

      <Card>
        {loading ? (
          <div className="py-12 text-center text-xs text-slate-400">Loading student profiles...</div>
        ) : filteredStudents.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-400">No students match your query.</div>
        ) : (
          <div className="divide-y divide-slate-700/50">
            {filteredStudents.map(s => (
              <div key={s.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-white">{s.name}</span>
                    <Badge variant="warning" size="sm">{s.experience}</Badge>
                    <Badge variant="success" size="sm">{s.status}</Badge>
                  </div>
                  <p className="text-xs text-slate-400">
                    {s.email} • Debates Completed: <span className="text-white font-semibold">{s.debates_count}</span>
                  </p>
                </div>

                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <span className="text-[11px] text-slate-400 block">Performance Avg</span>
                    <span className="text-base font-black text-amber-400">{s.average_score}/100</span>
                  </div>
                  <Button size="sm" variant="secondary">
                    View Progress File <ArrowRight className="w-3.5 h-3.5 ml-1" />
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
