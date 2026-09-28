import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Mic, PlusCircle, ArrowRight, Activity, Clock } from 'lucide-react';
import api from '../../services/api';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';

export const PresentationHistoryPage = () => {
  const [presentations, setPresentations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/presentation')
      .then(res => setPresentations(res.data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-5xl mx-auto space-y-6 py-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">Speech & Presentation Archive</h1>
          <p className="text-xs text-slate-400 mt-1">Review speech pacing, filler word trends, and vocal confidence scores.</p>
        </div>
        <Link to="/learner/presentations/new">
          <Button size="sm" icon={Mic}>Analyze Speech</Button>
        </Link>
      </div>

      <Card>
        {loading ? (
          <div className="py-12 text-center text-xs text-slate-400">Loading presentations...</div>
        ) : presentations.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-400">
            No presentation analyses found. Practice or upload a speech to see your metrics here.
          </div>
        ) : (
          <div className="divide-y divide-slate-700/50">
            {presentations.map(p => (
              <div key={p.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-white">{p.title}</span>
                    <Badge variant="secondary" size="sm" className="capitalize">{p.media_type}</Badge>
                    {p.pace_classification && (
                      <Badge variant="primary" size="sm">{p.pace_classification}</Badge>
                    )}
                  </div>
                  <p className="text-xs text-slate-400">
                    Duration: {Math.round(p.duration_seconds)}s • Pacing: {p.words_per_minute || 140} WPM • Fillers: {p.filler_words_count || 0}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  {p.overall_score && (
                    <div className="text-right">
                      <span className="text-xs text-slate-400 block">Overall Score</span>
                      <span className="text-base font-black text-primary-400">{p.overall_score}/100</span>
                    </div>
                  )}
                  <Link to={`/learner/presentations/${p.id}`}>
                    <Button size="sm" variant="secondary">
                      View Analytics <ArrowRight className="w-3.5 h-3.5 ml-1" />
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
