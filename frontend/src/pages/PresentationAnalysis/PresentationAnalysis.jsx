import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  Upload,
  Play,
  Square,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
  Award,
  Volume2,
  FileAudio
} from 'lucide-react';
import api from '../../services/api';

export default function PresentationAnalysis() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [speechTitle, setSpeechTitle] = useState("Keynote Opening Speech");
  const [textSpeech, setTextSpeech] = useState(
    "Good afternoon esteemed adjudicators. Um, today we stand at a critical juncture in our technological evolution. Like, if we fail to establish clear accountability protocols for autonomous models, you know, our institutional foundations will be permanently compromised. The empirical research clearly demonstrates that proactive oversight accelerates societal trust."
  );
  const [mode, setMode] = useState("file"); // "file" or "text" or "record"
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  // Audio recording state
  const [recording, setRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const mediaRecorderRef = useRef(null);

  useEffect(() => {
    // Load existing history on load
    fetchInitialPresentation();
  }, []);

  const fetchInitialPresentation = async () => {
    try {
      const res = await api.get('/presentation/history');
      if (res.data && res.data.length > 0) {
        setResult(res.data[0]);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleStartRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      const chunks = [];
      mediaRecorderRef.current.ondataavailable = (e) => chunks.push(e.data);
      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
      };
      mediaRecorderRef.current.start();
      setRecording(true);
    } catch (err) {
      alert("Microphone permission denied or not available. Please upload an audio file instead.");
    }
  };

  const handleStopRecording = () => {
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.stop();
      setRecording(false);
    }
  };

  const handleSubmitAnalysis = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (mode === "file" && selectedFile) {
        const formData = new FormData();
        formData.append("file", selectedFile);
        formData.append("title", speechTitle);

        const res = await api.post('/presentation/analyze-audio', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        setResult(res.data);
      } else if (mode === "record" && audioBlob) {
        const file = new File([audioBlob], "live_recording.webm", { type: "audio/webm" });
        const formData = new FormData();
        formData.append("file", file);
        formData.append("title", speechTitle || "Live Mic Recording");

        const res = await api.post('/presentation/analyze-audio', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        setResult(res.data);
      } else {
        // Text mode
        const formData = new FormData();
        formData.append("title", speechTitle);
        formData.append("transcription", textSpeech);
        formData.append("estimated_duration_seconds", 45.0);

        const res = await api.post('/presentation/analyze-text', formData);
        setResult(res.data);
      }
    } catch (err) {
      console.error('Presentation analysis error:', err);
      alert('Could not complete presentation analysis.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* HEADER */}
      <div className="bg-white rounded-2xl border border-[#ECE7DE] p-6 shadow-card flex items-center justify-between">
        <div className="flex items-center space-x-3.5">
          <div className="w-10 h-10 rounded-xl bg-[#FCF6E5] flex items-center justify-center text-[#D49B19]">
            <Mic className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-[#1E242B]">
              Presentation & Speech Analytics Engine
            </h2>
            <p className="text-xs text-gray-500">
              Whisper speech transcription, cadence pace (WPM), filler word auditing, pause profiling, and delivery scoring.
            </p>
          </div>
        </div>
      </div>

      {/* INPUT / UPLOAD CARD */}
      <div className="bg-white rounded-2xl border border-[#ECE7DE] p-6 shadow-card space-y-5">
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">
            Analysis Input Method
          </span>
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={() => setMode("file")}
              className={`text-xs px-3 py-1.5 rounded-lg border font-semibold transition-all ${
                mode === "file"
                  ? "bg-[#FCF6E5] border-[#D49B19] text-[#B87E0E]"
                  : "bg-white border-[#ECE7DE] text-gray-600"
              }`}
            >
              Upload Audio (WAV / MP3 / M4A)
            </button>
            <button
              type="button"
              onClick={() => setMode("record")}
              className={`text-xs px-3 py-1.5 rounded-lg border font-semibold transition-all ${
                mode === "record"
                  ? "bg-[#FCF6E5] border-[#D49B19] text-[#B87E0E]"
                  : "bg-white border-[#ECE7DE] text-gray-600"
              }`}
            >
              Microphone Recording
            </button>
            <button
              type="button"
              onClick={() => setMode("text")}
              className={`text-xs px-3 py-1.5 rounded-lg border font-semibold transition-all ${
                mode === "text"
                  ? "bg-[#FCF6E5] border-[#D49B19] text-[#B87E0E]"
                  : "bg-white border-[#ECE7DE] text-gray-600"
              }`}
            >
              Practice Speech Script
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmitAnalysis} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
              Speech / Presentation Title
            </label>
            <input
              type="text"
              value={speechTitle}
              onChange={(e) => setSpeechTitle(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-[#ECE7DE] bg-white focus:outline-none focus:border-[#D49B19]"
              placeholder="e.g. Oxford Union Keynote"
            />
          </div>

          {mode === "file" && (
            <div className="border-2 border-dashed border-[#ECE7DE] rounded-2xl p-6 text-center space-y-2 hover:border-[#D49B19] transition-colors bg-[#FCFBF8]">
              <Upload className="w-8 h-8 text-[#D49B19] mx-auto" />
              <div className="text-xs text-gray-600">
                <label className="font-bold text-[#D49B19] cursor-pointer hover:underline">
                  Click to select audio file
                  <input
                    type="file"
                    accept="audio/*,.wav,.mp3,.m4a,.webm"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>
                <span className="text-gray-400"> or drag and drop</span>
              </div>
              <p className="text-[11px] text-gray-400">
                Supports WAV, MP3, M4A, WEBM, AAC (up to 50MB)
              </p>
              {selectedFile && (
                <div className="pt-2">
                  <span className="inline-flex items-center space-x-1 px-3 py-1 bg-[#FCF6E5] text-[#B87E0E] text-xs font-semibold rounded-lg border border-[#F4E9C0]">
                    <FileAudio className="w-3.5 h-3.5" />
                    <span>Selected: {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)</span>
                  </span>
                </div>
              )}
            </div>
          )}

          {mode === "record" && (
            <div className="border border-[#ECE7DE] rounded-2xl p-6 text-center space-y-3 bg-[#FCFBF8]">
              <div className="w-12 h-12 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto border border-red-200">
                <Mic className={`w-6 h-6 ${recording ? 'animate-pulse text-red-600' : ''}`} />
              </div>
              <div>
                <p className="text-xs font-bold text-gray-800">
                  {recording ? "Recording speech in progress..." : "Browser Voice Recorder"}
                </p>
                <p className="text-[11px] text-gray-500">
                  Speak into your microphone to analyze cadence and fillers in real time.
                </p>
              </div>

              <div className="flex justify-center space-x-3 pt-2">
                {!recording ? (
                  <button
                    type="button"
                    onClick={handleStartRecording}
                    className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs flex items-center space-x-1.5 transition-colors"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Start Recording</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleStopRecording}
                    className="px-4 py-2 rounded-xl bg-black text-white font-bold text-xs flex items-center space-x-1.5"
                  >
                    <Square className="w-3.5 h-3.5 fill-current" />
                    <span>Stop Recording</span>
                  </button>
                )}
              </div>

              {audioUrl && (
                <div className="pt-3">
                  <audio controls src={audioUrl} className="mx-auto h-8" />
                </div>
              )}
            </div>
          )}

          {mode === "text" && (
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                Speech Script / Transcript
              </label>
              <textarea
                value={textSpeech}
                onChange={(e) => setTextSpeech(e.target.value)}
                rows={4}
                required
                className="w-full px-4 py-3 text-xs rounded-xl border border-[#ECE7DE] bg-[#FCFBF8] focus:outline-none focus:border-[#D49B19] focus:ring-1 focus:ring-[#D49B19] leading-relaxed"
              />
            </div>
          )}

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={loading || (mode === "file" && !selectedFile) || (mode === "record" && !audioBlob)}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#DF9E16] to-[#B87E0E] text-white font-bold text-xs shadow-xs hover:opacity-95 disabled:opacity-50 transition-all flex items-center space-x-2"
            >
              <Sparkles className="w-4 h-4" />
              <span>{loading ? 'Transcribing & Analyzing...' : 'Run Presentation Analytics'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* RESULTS DISPLAY */}
      {result && (
        <div className="space-y-6">
          {/* Top Metric Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* WPM & Pace */}
            <div className="bg-white rounded-2xl p-5 border border-[#ECE7DE] shadow-card">
              <span className="text-[10px] uppercase font-bold text-gray-400 block">Speaking Pace</span>
              <div className="flex items-baseline space-x-1 mt-1">
                <span className="text-2xl font-black text-[#1E242B]">{result.words_per_minute}</span>
                <span className="text-xs text-gray-400">WPM</span>
              </div>
              <span className="text-[11px] font-semibold text-[#B87E0E] block mt-1">
                {result.speech_pace_label}
              </span>
            </div>

            {/* Filler Words */}
            <div className="bg-white rounded-2xl p-5 border border-[#ECE7DE] shadow-card">
              <span className="text-[10px] uppercase font-bold text-gray-400 block">Filler Word Count</span>
              <div className="flex items-baseline space-x-1 mt-1">
                <span className="text-2xl font-black text-amber-600">{result.filler_words_count}</span>
                <span className="text-xs text-gray-400">occurrences</span>
              </div>
              <span className="text-[11px] text-gray-500 block mt-1">
                {Object.keys(result.filler_words_breakdown || {}).length > 0
                  ? Object.entries(result.filler_words_breakdown).map(([w, c]) => `${w} (${c})`).join(', ')
                  : 'Zero filler words'}
              </span>
            </div>

            {/* Inferred Confidence */}
            <div className="bg-white rounded-2xl p-5 border border-[#ECE7DE] shadow-card">
              <span className="text-[10px] uppercase font-bold text-gray-400 block">
                Confidence (Inferred*)
              </span>
              <div className="flex items-baseline space-x-1 mt-1">
                <span className="text-2xl font-black text-[#1E242B]">{result.confidence_score}</span>
                <span className="text-xs text-gray-400">/ 100</span>
              </div>
              <span className="text-[10px] text-gray-400 block mt-1 italic">
                *Inferred from cadence & assertiveness
              </span>
            </div>

            {/* Overall Presentation Score */}
            <div className="bg-white rounded-2xl p-5 border border-[#ECE7DE] shadow-card">
              <span className="text-[10px] uppercase font-bold text-[#D49B19] block">
                Composite Score
              </span>
              <div className="flex items-baseline space-x-1 mt-1">
                <span className="text-2xl font-black text-[#D49B19]">{result.overall_presentation_score}</span>
                <span className="text-xs text-gray-400">/ 100</span>
              </div>
              <span className="text-[11px] font-semibold text-emerald-700 block mt-1">
                Clarity: {result.clarity_score} | Engagement: {result.audience_engagement_score}
              </span>
            </div>
          </div>

          {/* Transcript & Feedback */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Transcript Card */}
            <div className="bg-white rounded-2xl border border-[#ECE7DE] p-6 shadow-card space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center space-x-2">
                  <Volume2 className="w-4 h-4 text-[#D49B19]" />
                  <span>Speech Transcription (Whisper)</span>
                </h3>
                <span className="text-[11px] text-gray-400 font-mono">
                  {Math.round(result.duration_seconds)}s • {result.total_words} words
                </span>
              </div>
              <p className="p-4 bg-[#FAF8F3] rounded-xl border border-[#ECE7DE] text-xs text-gray-800 leading-relaxed max-h-56 overflow-y-auto italic">
                "{result.transcription}"
              </p>
            </div>

            {/* Actionable Recommendations */}
            <div className="bg-white rounded-2xl border border-[#ECE7DE] p-6 shadow-card space-y-3">
              <h3 className="text-xs font-bold text-[#B87E0E] uppercase tracking-wider flex items-center space-x-2">
                <Sparkles className="w-4 h-4 text-[#D49B19]" />
                <span>Actionable Delivery Recommendations</span>
              </h3>
              <ul className="space-y-2 text-xs">
                {result.improvement_recommendations?.map((tip, i) => (
                  <li key={i} className="p-3 bg-[#FCF6E5] rounded-xl border border-[#F4E9C0] text-gray-800 flex items-start space-x-2">
                    <span className="text-[#D49B19] font-bold">✓</span>
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
