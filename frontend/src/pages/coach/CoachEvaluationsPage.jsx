import React, { useState } from 'react';
import { MessageSquare, Award, CheckCircle2, AlertCircle, Send } from 'lucide-react';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';

export const CoachEvaluationsPage = () => {
  const [evaluations, setEvaluations] = useState([
    {
      id: 1,
      student: 'Alex Rivera',
      session: 'Should artificial intelligence replace traditional education?',
      format: 'Oxford Debate',
      score: 78.8,
      status: 'Reviewed',
      coachNote: 'Alex presented strong points on personalized pacing. I advise dedicating the next drill to evidence grounding before the opposing bench exploits statistical variances.'
    },
    {
      id: 2,
      student: 'Jordan Lee',
      session: 'Universal Basic Income at National Scale',
      format: 'Policy Debate',
      score: 81.2,
      status: 'Pending Notes',
      coachNote: ''
    }
  ]);

  const [activeNote, setActiveNote] = useState('');
  const [selectedId, setSelectedId] = useState(2);

  const handleSaveNote = (e) => {
    e.preventDefault();
    if (!activeNote.trim()) return;
    setEvaluations(prev => prev.map(item => {
      if (item.id === selectedId) {
        return { ...item, coachNote: activeNote, status: 'Reviewed' };
      }
      return item;
    }));
    setActiveNote('');
    alert('Coach evaluation feedback saved and dispatched to student!');
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 py-6">
      <div>
        <h1 className="text-2xl font-black text-white tracking-tight">Debate Evaluations & Qualitative Feedback</h1>
        <p className="text-xs text-slate-400 mt-1">Review student simulation recordings and append qualitative coaching mentorship.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-6 space-y-3">
          {evaluations.map(ev => (
            <div
              key={ev.id}
              onClick={() => { setSelectedId(ev.id); setActiveNote(ev.coachNote || ''); }}
              className={`p-4 rounded-xl border text-xs cursor-pointer transition-all ${
                selectedId === ev.id
                  ? 'bg-amber-950/20 border-amber-500 ring-1 ring-amber-500/30'
                  : 'bg-slate-800/80 border-slate-700/60 hover:border-slate-600'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-white text-sm">{ev.student}</span>
                <Badge variant={ev.status === 'Reviewed' ? 'success' : 'warning'} size="sm">
                  {ev.status}
                </Badge>
              </div>
              <p className="text-slate-300 font-medium mt-1">{ev.session}</p>
              <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-700/40 text-[11px] text-slate-400">
                <span>Format: {ev.format}</span>
                <span className="text-amber-400 font-bold">Score: {ev.score}/100</span>
              </div>
            </div>
          ))}
        </div>

        <div className="lg:col-span-6">
          <Card title="Coach Feedback Composer">
            <form onSubmit={handleSaveNote} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Qualitative Feedback & Pedagogical Guidance
                </label>
                <textarea
                  rows={6}
                  required
                  value={activeNote}
                  onChange={(e) => setActiveNote(e.target.value)}
                  placeholder="Provide concrete rhetorical, logical, or delivery advice for this student..."
                  className="w-full p-3 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex justify-end">
                <Button type="submit" size="md" variant="primary">
                  <Send className="w-3.5 h-3.5 mr-1.5" /> Save & Send Feedback
                </Button>
              </div>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
};
