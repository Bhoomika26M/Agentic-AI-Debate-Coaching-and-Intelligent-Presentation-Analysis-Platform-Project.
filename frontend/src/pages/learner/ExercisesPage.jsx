import React, { useState, useEffect } from 'react';
import { 
  CheckSquare, Send, CheckCircle2, Award, Sparkles, 
  HelpCircle, ChevronRight, AlertCircle 
} from 'lucide-react';
import api from '../../services/api';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';

export const ExercisesPage = () => {
  const [exercises, setExercises] = useState([]);
  const [selectedExercise, setSelectedExercise] = useState(null);
  const [submissionText, setSubmissionText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [resultFeedback, setResultFeedback] = useState(null);
  const [activeCategory, setActiveCategory] = useState('All');
  const [loading, setLoading] = useState(true);

  const fetchExercises = async () => {
    try {
      const res = await api.get('/exercises');
      setExercises(res.data);
      if (res.data.length > 0 && !selectedExercise) {
        setSelectedExercise(res.data[0]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExercises();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!submissionText.trim() || !selectedExercise) return;
    setSubmitting(true);
    setResultFeedback(null);

    try {
      const res = await api.post(`/exercises/${selectedExercise.id}/submit`, {
        user_submission: submissionText
      });
      setResultFeedback(res.data);
      fetchExercises(); // Refresh completion status
    } catch (err) {
      alert(err.message || 'Submission failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const categories = ['All', 'Fallacy', 'Argument', 'Evidence', 'Rebuttal', 'Presentation'];

  const filteredExercises = activeCategory === 'All' 
    ? exercises 
    : exercises.filter(e => e.category === activeCategory);

  return (
    <div className="max-w-6xl mx-auto space-y-6 py-6">
      <div>
        <h1 className="text-2xl font-black text-white tracking-tight">Interactive Practice Drills & Exercises</h1>
        <p className="text-xs text-slate-400 mt-1">
          Targeted micro-exercises designed to strengthen fallacy remediation, argument construction, and empirical evidence attribution.
        </p>
      </div>

      {/* Category Pills */}
      <div className="flex flex-wrap gap-2">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeCategory === cat
                ? 'bg-primary-600 text-white shadow-md'
                : 'bg-slate-800 text-slate-400 hover:text-white border border-slate-700'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Split Grid: List on Left, Active Drill on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left List (5 cols) */}
        <div className="lg:col-span-5 space-y-3">
          {filteredExercises.map(ex => (
            <div
              key={ex.id}
              onClick={() => { setSelectedExercise(ex); setResultFeedback(null); setSubmissionText(''); }}
              className={`p-4 rounded-xl border text-xs cursor-pointer transition-all ${
                selectedExercise?.id === ex.id
                  ? 'bg-primary-950/20 border-primary-500 ring-1 ring-primary-500/30'
                  : 'bg-slate-800/80 border-slate-700/60 hover:border-slate-600'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <Badge variant={ex.is_completed ? 'success' : 'secondary'} size="sm">
                  {ex.category}
                </Badge>
                {ex.is_completed && (
                  <span className="flex items-center gap-1 text-[11px] text-emerald-400 font-semibold">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Completed ({ex.last_score || 85}%)
                  </span>
                )}
              </div>
              <h4 className="text-xs font-bold text-white mt-1">{ex.title}</h4>
              <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">{ex.prompt}</p>
            </div>
          ))}
        </div>

        {/* Right Active Drill Workspace (7 cols) */}
        <div className="lg:col-span-7">
          {selectedExercise ? (
            <Card className="p-6 space-y-6">
              <div className="border-b border-slate-700/60 pb-4">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="primary">{selectedExercise.category} Exercise</Badge>
                  <Badge variant="secondary">{selectedExercise.difficulty}</Badge>
                </div>
                <h2 className="text-base font-bold text-white">{selectedExercise.title}</h2>
              </div>

              {/* Prompt Box */}
              <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-700/60 space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-primary-400">Drill Prompt:</span>
                <p className="text-xs text-slate-200 leading-relaxed font-medium">
                  {selectedExercise.prompt}
                </p>
              </div>

              {/* Submission Area */}
              <form onSubmit={handleSubmit} className="space-y-3">
                <label className="block text-xs font-medium text-slate-300">Your Response & Solution:</label>
                <textarea
                  rows={4}
                  required
                  value={submissionText}
                  onChange={(e) => setSubmissionText(e.target.value)}
                  placeholder="Write your response, fallacy analysis, or revised argument here..."
                  className="w-full p-3 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-primary-500"
                />

                <div className="flex justify-end">
                  <Button type="submit" loading={submitting} size="md">
                    <Send className="w-3.5 h-3.5 mr-1.5" /> Submit to AI Adjudicator
                  </Button>
                </div>
              </form>

              {/* Instant AI Evaluation Feedback */}
              {resultFeedback && (
                <div className="p-4 bg-slate-900 border border-primary-500/40 rounded-xl space-y-3 animate-fade-in text-xs">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <span className="font-bold text-white flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-primary-400" /> AI Adjudication
                    </span>
                    <span className="text-sm font-black text-primary-400">{resultFeedback.score}/100</span>
                  </div>

                  <p className="text-slate-200 leading-relaxed">{resultFeedback.feedback}</p>

                  {resultFeedback.sample_solution && (
                    <div className="pt-2 border-t border-slate-800">
                      <span className="text-[11px] font-bold text-emerald-400 block mb-1">Exemplary Benchmark Solution:</span>
                      <p className="text-[11px] text-slate-400 italic bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                        {resultFeedback.sample_solution}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </Card>
          ) : (
            <Card className="py-16 text-center text-xs text-slate-400">
              Select an exercise on the left to begin your drill.
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};
