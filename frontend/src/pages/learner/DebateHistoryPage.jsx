import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { History, PlusCircle, ArrowRight, Award, MessageSquare } from 'lucide-react';
import api from '../../services/api';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';

export const DebateHistoryPage = () => {
  const [debates, setDebates] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/debates')
      .then(res => setDebates(res.data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-5xl mx-auto space-y-6 py-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">Debate Simulation History</h1>
          <p className="text-xs text-slate-400 mt-1">Review previous rounds, scorecards, and AI coaching evaluations.</p>
        </div>
        <Link to="/learner/debates/new">
          <Button size="sm" icon={PlusCircle}>New Debate</Button>
        </Link>
      </div>

      <Card>
        {loading ? (
          <div className="py-12 text-center text-xs text-slate-400">Loading debate archives...</div>
        ) : debates.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-400">
            No debate sessions recorded yet. Start a new debate to build your archive.
          </div>
        ) : (
          <div className="divide-y divide-slate-700/50">
            {debates.map(d => (
              <div key={d.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-white">{d.topic}</span>
                    <Badge variant={d.position === 'For' ? 'success' : 'danger'} size="sm">{d.position}</Badge>
                    <Badge variant="secondary" size="sm">{d.format}</Badge>
                  </div>
                  <p className="text-xs text-slate-400">
                    Difficulty: {d.difficulty} • Rounds: {d.current_round}/{d.rounds_count} • Status: <span className="capitalize text-slate-200">{d.status}</span>
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  {d.overall_score && (
                    <div className="text-right">
                      <span className="text-xs text-slate-400 block">Overall Score</span>
                      <span className="text-base font-black text-primary-400">{d.overall_score}/100</span>
                    </div>
                  )}
                  <Link to={d.status === 'completed' ? `/learner/debates/${d.id}/report` : `/learner/debates/${d.id}/room`}>
                    <Button size="sm" variant={d.status === 'completed' ? 'secondary' : 'primary'}>
                      {d.status === 'completed' ? 'View Scorecard' : 'Resume Debate'} <ArrowRight className="w-3.5 h-3.5 ml-1" />
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};
