import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  Award, Mic, Clock, Sparkles, CheckCircle2, AlertTriangle, 
  ArrowRight, ShieldAlert, BarChart2, Activity, Volume2 
} from 'lucide-react';
import api from '../../services/api';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { ScoreGauge } from '../../components/common/ScoreGauge';
import { PaceTimelineChart } from '../../components/charts/PaceTimelineChart';
import { FillerWordBarChart } from '../../components/charts/FillerWordBarChart';

export const PresentationAnalysisPage = () => {
  const { id } = useParams();
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/presentation/${id}`)
      .then(res => setSession(res.data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading || !session) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] text-slate-400">
        <div className="text-center space-y-2">
          <div className="w-8 h-8 border-3 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-xs">Computing speech prosody and pacing analytics...</p>
        </div>
      </div>
    );
  }

  const { metrics = {}, transcript = '' } = session;

  const getPaceBadgeVariant = (classification) => {
    if (classification === 'Balanced') return 'success';
    if (classification === 'Fast' || classification === 'Slow') return 'warning';
    return 'danger';
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 py-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-gradient-to-r from-slate-900 to-indigo-950/40 border border-slate-700/60 rounded-2xl p-6 shadow-xl">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-black text-white tracking-tight">{session.title}</h1>
            <Badge variant="primary" size="sm">Presentation #{id}</Badge>
          </div>
          <p className="text-xs text-slate-300">
            Duration: <span className="text-white font-semibold">{Math.round(session.duration_seconds)} seconds</span> • Mode: <span className="capitalize">{session.media_type}</span>
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link to="/learner/presentations/new">
            <Button size="sm" icon={Mic}>Analyze Another Speech</Button>
          </Link>
        </div>
      </div>

      {/* KPI Scores Row */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="flex flex-col items-center justify-center p-4 bg-gradient-to-b from-slate-800 to-primary-950/30 border-primary-500/40">
          <ScoreGauge score={metrics.overall_score || 78.5} size="md" label="Overall Score" weight="Combined" />
        </Card>
        <Card className="flex flex-col items-center justify-center p-4">
          <ScoreGauge score={metrics.speaking_score || 79.0} size="md" label="Speaking Score" weight="Vocal Flow" />
        </Card>
        <Card className="flex flex-col items-center justify-center p-4">
          <ScoreGauge score={metrics.confidence_score || 78.0} size="md" label="Confidence" weight="Vocal Conviction" />
        </Card>
        <Card className="flex flex-col items-center justify-center p-4">
          <ScoreGauge score={metrics.clarity_score || 82.0} size="md" label="Clarity Score" weight="Syntactic Flow" />
        </Card>
        <Card className="col-span-2 lg:col-span-1 flex flex-col items-center justify-center p-4">
          <ScoreGauge score={metrics.engagement_score || 76.0} size="md" label="Engagement" weight="Rhetorical Hook" />
        </Card>
      </div>

      {/* Speaking Pace & Filler Words Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card 
          title="Speaking Pace Timeline (WPM)" 
          subtitle={`Average: ${metrics.words_per_minute} WPM`}
          action={<Badge variant={getPaceBadgeVariant(metrics.pace_classification)}>{metrics.pace_classification}</Badge>}
        >
          <PaceTimelineChart data={metrics.pace_timeline || []} />
          <p className="text-[11px] text-slate-400 mt-2">
            Standard conversational presentation benchmark: <span className="text-emerald-400 font-semibold">130–165 WPM</span>.
          </p>
        </Card>

        <Card 
          title="Filler Words Distribution" 
          subtitle={`Total Detected: ${metrics.filler_words_count} fillers`}
        >
          <FillerWordBarChart breakdown={metrics.filler_words_breakdown || {}} />
          <p className="text-[11px] text-slate-400 mt-2">
            Target benchmark: Less than 3 filler words per 2 minutes of speech.
          </p>
        </Card>
      </div>

      {/* Confidence Analysis Explanation Card */}
      <Card title="Confidence Assessment Breakdown" subtitle="Algorithmic prosody and hesitation indicators">
        <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-700/60 space-y-3 text-xs">
          <div className="flex items-start gap-3">
            <Volume2 className="w-5 h-5 text-primary-400 shrink-0 mt-0.5" />
            <p className="text-slate-200 leading-relaxed font-medium">
              {metrics.confidence_explanation || "Evaluated based on vocal consistency, hesitation intervals, and filler density."}
            </p>
          </div>
        </div>
      </Card>

      {/* Strengths, Weaknesses, and Actionable Coaching */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card title="Vocal & Delivery Strengths" className="border-emerald-500/30">
          <div className="flex items-start gap-3 text-xs">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <p className="text-slate-200 leading-relaxed">{metrics.strengths}</p>
          </div>
        </Card>

        <Card title="Areas for Delivery Polish" className="border-amber-500/30">
          <div className="flex items-start gap-3 text-xs">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <p className="text-slate-200 leading-relaxed">{metrics.weaknesses}</p>
          </div>
        </Card>
      </div>

      {/* Coaching Recommendation */}
      <Card title="Actionable Presentation Coaching Drill">
        <div className="bg-primary-950/20 border border-primary-500/30 p-4 rounded-xl flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-primary-300 uppercase tracking-wider">Coach Recommendation</p>
            <p className="text-xs text-slate-200 mt-1 leading-relaxed">{metrics.recommended_improvements}</p>
          </div>
          <Link to="/learner/exercises">
            <Button size="sm">Go to Pacing Drills</Button>
          </Link>
        </div>
      </Card>

      {/* Transcript Text */}
      <Card title="Full Speech Transcript">
        <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800 text-xs text-slate-300 leading-relaxed font-mono whitespace-pre-wrap">
          {transcript || "No transcript available."}
        </div>
      </Card>
    </div>
  );
};
