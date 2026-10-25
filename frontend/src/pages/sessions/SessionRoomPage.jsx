import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../context/AuthContext';
import { apiClient } from '../../api/client';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import {
  Mic,
  Square,
  Play,
  RotateCcw,
  Sparkles,
  Users,
  Clock,
  ArrowLeft,
  Upload,
  CheckCircle2,
  Send,
  FileCheck
} from 'lucide-react';
import { AIAnalysisPanel } from '../../components/analysis/AIAnalysisPanel';
import { PresentationAnalyticsWidget } from '../../components/presentation/PresentationAnalyticsWidget';
import { FullReportModal } from '../../components/presentation/FullReportModal';

export const SessionRoomPage = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Timer state
  const [secondsLeft, setSecondsLeft] = useState(240); // 4-minute speech round
  const [timerRunning, setTimerRunning] = useState(false);
  const [currentTurn, setCurrentTurn] = useState('PROPOSITION');

  // Speech text & AI Analysis state
  const [speechText, setSpeechText] = useState('');
  const [analysisResult, setAnalysisResult] = useState(null);
  const [presentationMetrics, setPresentationMetrics] = useState(null);
  const [fullReport, setFullReport] = useState(null);
  const [showReportModal, setShowReportModal] = useState(false);

  const runAnalysisMutation = useMutation({
    mutationFn: async () => {
      const textToAnalyze = speechText || "We must ban autonomous weapon systems because lethal decision making requires human moral accountability. According to research published by the UN Institute for Disarmament, over 74% of international legal scholars argue that algorithms cannot satisfy international humanitarian law. You are naive to believe that algorithms alone can govern warfare.";
      
      // Run Argument Analysis
      const res = await apiClient.post(`/analysis/session/${id}/evaluate`, {
        transcript_text: textToAnalyze,
        motion_context: session?.topic?.title
      });

      // Run Presentation & Speech Dynamics Analytics
      const presRes = await apiClient.post('/presentation/analyze', {
        speech_text: textToAnalyze,
        speech_duration_sec: 240 - secondsLeft > 5 ? 240 - secondsLeft : 35.0
      });

      return { analysis: res.data, presentation: presRes.data };
    },
    onSuccess: (data) => {
      setAnalysisResult(data.analysis);
      setPresentationMetrics(data.presentation);
    }
  });

  const generateReportMutation = useMutation({
    mutationFn: async () => {
      const textToAnalyze = speechText || "We must ban autonomous weapon systems because lethal decision making requires human moral accountability. According to research published by the UN Institute for Disarmament, over 74% of international legal scholars argue that algorithms cannot satisfy international humanitarian law.";
      const res = await apiClient.post(`/presentation/session/${id}/report`, {
        motion: session?.topic?.title || "Chamber Motion",
        transcript_text: textToAnalyze,
        speech_duration_sec: 240 - secondsLeft > 5 ? 240 - secondsLeft : 45.0
      });
      return res.data;
    },
    onSuccess: (data) => {
      setFullReport(data);
      setShowReportModal(true);
    }
  });

  // MediaRecorder state
  const [isRecording, setIsRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  // Fetch session data
  const { data: session, isLoading } = useQuery({
    queryKey: ['session', id],
    queryFn: async () => {
      const res = await apiClient.get(`/sessions/${id}`);
      return res.data;
    },
  });

  // Timer ticker
  useEffect(() => {
    let interval = null;
    if (timerRunning && secondsLeft > 0) {
      interval = setInterval(() => {
        setSecondsLeft((prev) => prev - 1);
      }, 1000);
    } else if (secondsLeft === 0) {
      setTimerRunning(false);
    }
    return () => clearInterval(interval);
  }, [timerRunning, secondsLeft]);

  // Join session mutation
  const joinMutation = useMutation({
    mutationFn: async (position) => {
      const res = await apiClient.post(`/sessions/${id}/join?position=${position}`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['session', id]);
    },
  });

  // MediaRecorder controls
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setRecordedBlob(audioBlob);
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      setTimerRunning(true);
    } catch (err) {
      console.warn('Microphone access unavailable or denied in browser:', err);
      // Fallback simulation blob for environment testing
      setIsRecording(true);
      setTimerRunning(true);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
    } else {
      // Mock dummy blob if browser mic not available
      setRecordedBlob(new Blob(['mock-audio'], { type: 'audio/webm' }));
    }
    setIsRecording(false);
    setTimerRunning(false);
  };

  const uploadRecordingMutation = useMutation({
    mutationFn: async () => {
      const formData = new FormData();
      const fileToUpload = recordedBlob || new File(['sample'], 'speech.webm', { type: 'audio/webm' });
      formData.append('file', fileToUpload, 'debate_speech.webm');
      const res = await apiClient.post(`/sessions/${id}/recordings?type=AUDIO`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['session', id]);
      setUploadSuccess(true);
      setTimeout(() => setUploadSuccess(false), 4000);
    },
  });

  if (isLoading) {
    return <div className="p-12 text-center text-sm text-arena-muted">Entering debate chamber...</div>;
  }

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const timeFormatted = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  const propParticipants = session?.participants?.filter((p) => p.position === 'PROPOSITION') || [];
  const oppParticipants = session?.participants?.filter((p) => p.position === 'OPPOSITION') || [];

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Chamber Top Navigation Bar */}
      <div className="flex items-center justify-between pb-4 border-b border-white/5">
        <Link to="/sessions" className="flex items-center gap-2 text-xs text-arena-muted hover:text-white transition">
          <ArrowLeft className="w-4 h-4" />
          <span>Exit Chamber</span>
        </Link>
        <div className="flex items-center gap-3">
          <Badge variant="amber">{session?.format?.replace('_', ' ')}</Badge>
          <span className="text-xs font-mono text-arena-muted">Rostrum Session #{session?.id?.substring(0, 8)}</span>
        </div>
      </div>

      {/* Motion Banner */}
      <div className="text-center max-w-3xl mx-auto space-y-2">
        <span className="text-xs font-semibold uppercase tracking-widest text-arena-amber">
          Active Parliamentary Motion
        </span>
        <h1 className="text-2xl sm:text-3xl font-serif font-bold text-white leading-tight">
          "{session?.topic?.title}"
        </h1>
        <p className="text-xs text-arena-muted max-w-xl mx-auto leading-relaxed">
          {session?.topic?.description}
        </p>
      </div>

      {/* Chamber Arena Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Column: Proposition Podium */}
        <Card className="border-arena-prop/30 bg-arena-prop/5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-arena-prop/20 mb-4">
              <span className="font-serif font-bold text-arena-prop-glow text-base">Proposition</span>
              <Badge variant="prop">{propParticipants.length} Benches</Badge>
            </div>

            <div className="space-y-3">
              {propParticipants.map((p, idx) => (
                <div key={idx} className="p-3 rounded-xl bg-arena-bg-card border border-arena-prop/20 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-arena-prop/20 text-arena-prop font-bold text-xs flex items-center justify-center">
                    P{p.speaker_order}
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-white">{p.user?.full_name}</p>
                    <span className="text-[10px] text-arena-muted">Speaker #{p.speaker_order}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-4 border-t border-arena-prop/20">
            <Button
              variant="prop"
              size="sm"
              className="w-full"
              onClick={() => joinMutation.mutate('PROPOSITION')}
            >
              Take Proposition Seat
            </Button>
          </div>
        </Card>

        {/* Center 2 Columns: Circular Timer & Speaker Controls */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="flex flex-col items-center justify-center p-8 relative overflow-hidden">
            {/* Speaker Turn Indicator */}
            <div className="mb-6 flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-arena-muted">
                Floor Recognition:
              </span>
              <button
                onClick={() => setCurrentTurn(currentTurn === 'PROPOSITION' ? 'OPPOSITION' : 'PROPOSITION')}
                className={`px-3 py-1 rounded-full text-xs font-bold transition ${
                  currentTurn === 'PROPOSITION'
                    ? 'bg-arena-prop text-white shadow-prop-glow'
                    : 'bg-arena-opp text-white shadow-opp-glow'
                }`}
              >
                {currentTurn} SPEAKING
              </button>
            </div>

            {/* Circular Countdown Timer */}
            <div className="relative w-48 h-48 rounded-full border-4 border-arena-amber/20 flex items-center justify-center shadow-spotlight bg-arena-bg-card">
              <div className="text-center">
                <span className="text-4xl font-mono font-bold text-white tracking-wider block">
                  {timeFormatted}
                </span>
                <span className="text-[10px] font-mono text-arena-muted uppercase tracking-widest mt-1 block">
                  Round Clock
                </span>
              </div>
            </div>

            {/* Clock Controls */}
            <div className="flex items-center gap-3 mt-6">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setTimerRunning(!timerRunning)}
              >
                {timerRunning ? <Square className="w-4 h-4 mr-1.5" /> : <Play className="w-4 h-4 mr-1.5" />}
                {timerRunning ? 'Pause Clock' : 'Start Clock'}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setTimerRunning(false);
                  setSecondsLeft(240);
                }}
              >
                <RotateCcw className="w-4 h-4 mr-1.5" /> Reset
              </Button>
            </div>

            {/* Speech Recorder Controls (MediaRecorder API) */}
            <div className="mt-8 pt-6 border-t border-white/5 w-full flex flex-col items-center gap-3">
              <div className="flex items-center gap-3">
                {!isRecording ? (
                  <Button variant="opp" size="md" onClick={startRecording}>
                    <Mic className="w-4 h-4 mr-2 animate-pulse" />
                    Record Speech (Microphone)
                  </Button>
                ) : (
                  <Button variant="secondary" size="md" onClick={stopRecording} className="border-red-500 text-red-400">
                    <Square className="w-4 h-4 mr-2" />
                    Stop Recording
                  </Button>
                )}

                {recordedBlob && (
                  <Button
                    variant="primary"
                    size="md"
                    onClick={() => uploadRecordingMutation.mutate()}
                    isLoading={uploadRecordingMutation.isPending}
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Save Recording
                  </Button>
                )}
              </div>

              {uploadSuccess && (
                <span className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
                  <CheckCircle2 className="w-4 h-4" /> Speech recording metadata saved to chamber archive!
                </span>
              )}
            </div>
          </Card>

          {/* Speech Text Input for Analysis */}
          <Card className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold uppercase tracking-wider text-arena-amber flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                Live Speech Transcript / Speech Notes
              </label>
              <button
                type="button"
                onClick={() => setSpeechText("We must ban autonomous weapon systems because lethal decision making requires human moral accountability. According to research published by the UN Institute for Disarmament, over 74% of international legal scholars argue that algorithms cannot satisfy international humanitarian law. You are naive to believe that algorithms alone can govern warfare.")}
                className="text-[10px] text-arena-muted hover:text-arena-amber transition underline"
              >
                Insert Sample Speech with Fallacy
              </button>
            </div>
            <textarea
              rows={3}
              value={speechText}
              onChange={(e) => setSpeechText(e.target.value)}
              placeholder="Paste or type speech arguments here for immediate Toulmin claim extraction, fallacy detection, and performance scoring..."
              className="w-full bg-arena-bg-elevated border border-white/10 rounded-xl p-3 text-xs text-arena-parchment placeholder-arena-muted/50 focus:outline-none focus:border-arena-amber"
            />
            <div className="flex justify-between items-center">
              <Button
                variant="outline"
                size="sm"
                onClick={() => generateReportMutation.mutate()}
                isLoading={generateReportMutation.isPending}
              >
                <FileCheck className="w-3.5 h-3.5 mr-1.5" />
                Generate Full Forensics Certificate
              </Button>

              <Button
                variant="primary"
                size="sm"
                onClick={() => runAnalysisMutation.mutate()}
                isLoading={runAnalysisMutation.isPending}
              >
                <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                Run Forensic & Presentation AI
              </Button>
            </div>
          </Card>

          {/* Presentation & Speech Dynamics Widget (Milestone 4) */}
          <PresentationAnalyticsWidget
            metrics={presentationMetrics}
            isAnalyzing={runAnalysisMutation.isPending}
          />

          {/* AI Coach Live Panel (Milestone 2) */}
          <AIAnalysisPanel
            analysisData={analysisResult}
            isAnalyzing={runAnalysisMutation.isPending}
          />

          {/* Full Adjudication Certificate Modal (Milestone 4) */}
          {showReportModal && (
            <FullReportModal
              report={fullReport}
              onClose={() => setShowReportModal(false)}
            />
          )}
        </div>

        {/* Right Column: Opposition Podium */}
        <Card className="border-arena-opp/30 bg-arena-opp/5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-arena-opp/20 mb-4">
              <span className="font-serif font-bold text-arena-opp-glow text-base">Opposition</span>
              <Badge variant="opp">{oppParticipants.length} Benches</Badge>
            </div>

            <div className="space-y-3">
              {oppParticipants.map((p, idx) => (
                <div key={idx} className="p-3 rounded-xl bg-arena-bg-card border border-arena-opp/20 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-arena-opp/20 text-arena-opp font-bold text-xs flex items-center justify-center">
                    O{p.speaker_order}
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-white">{p.user?.full_name}</p>
                    <span className="text-[10px] text-arena-muted">Speaker #{p.speaker_order}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-4 border-t border-arena-opp/20">
            <Button
              variant="opp"
              size="sm"
              className="w-full"
              onClick={() => joinMutation.mutate('OPPOSITION')}
            >
              Take Opposition Seat
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
};
