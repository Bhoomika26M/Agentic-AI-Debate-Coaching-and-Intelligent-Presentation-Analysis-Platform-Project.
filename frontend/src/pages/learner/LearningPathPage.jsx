import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, CheckCircle2, Circle, Clock, ArrowRight, Sparkles, Award } from 'lucide-react';
import api from '../../services/api';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';

export const LearningPathPage = () => {
  const [learningPath, setLearningPath] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/exercises/learning-path')
      .then(res => setLearningPath(res.data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  if (loading || !learningPath) {
    return <div className="py-12 text-center text-xs text-slate-400">Loading personalized syllabus...</div>;
  }

  const { title, current_week, total_weeks, weekly_modules = [] } = learningPath;

  return (
    <div className="max-w-4xl mx-auto space-y-8 py-6">
      <div className="bg-gradient-to-r from-primary-950/40 via-slate-900 to-slate-900 border border-primary-500/30 rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-1">
          <BookOpen className="w-5 h-5 text-primary-400" />
          <h1 className="text-2xl font-black text-white tracking-tight">{title}</h1>
        </div>
        <p className="text-xs text-slate-400 mt-1">
          Dynamically tailored weekly curriculum adapting to your specific fallacy rates and evidence gaps.
        </p>
        <div className="mt-4 flex items-center gap-4 text-xs font-semibold">
          <Badge variant="primary">Week {current_week} of {total_weeks} Active</Badge>
          <span className="text-slate-400">{Math.round((current_week / total_weeks) * 100)}% Coursework Complete</span>
        </div>
      </div>

      <div className="space-y-4">
        {weekly_modules.map((mod, idx) => {
          const isCurrent = mod.week === current_week;
          const isDone = mod.status === 'Completed';

          return (
            <Card 
              key={idx} 
              className={`transition-all ${
                isCurrent ? 'border-primary-500/80 bg-primary-950/15 ring-1 ring-primary-500/30' : ''
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="mt-0.5">
                    {isDone ? (
                      <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                    ) : isCurrent ? (
                      <Clock className="w-6 h-6 text-primary-400 animate-pulse" />
                    ) : (
                      <Circle className="w-6 h-6 text-slate-600" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-primary-400">
                        Week {mod.week}
                      </span>
                      <Badge variant={isDone ? 'success' : (isCurrent ? 'primary' : 'secondary')} size="sm">
                        {mod.status}
                      </Badge>
                    </div>
                    <h3 className="text-sm font-bold text-white mt-0.5">{mod.topic}</h3>
                    <p className="text-xs text-slate-400 mt-1">
                      {isDone 
                        ? `Mastered with score: ${mod.score}/100` 
                        : (isCurrent ? 'Current focus: Complete exercises and Oxford simulation round.' : 'Unlocks upon completing current week milestones.')}
                    </p>
                  </div>
                </div>

                <div>
                  {isCurrent && (
                    <Link to="/learner/exercises">
                      <Button size="sm">
                        Practice Drills <ArrowRight className="w-3.5 h-3.5 ml-1" />
                      </Button>
                    </Link>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
};
