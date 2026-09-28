import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, Mic, MicOff, FileText, ArrowRight, Sparkles, CheckCircle } from 'lucide-react';
import api from '../../services/api';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';

export const PresentationUploadPage = () => {
  const [activeTab, setActiveTab] = useState('record'); // record | upload | text
  const [title, setTitle] = useState('Keynote Pitch Delivery');
  const [duration, setDuration] = useState(120);
  const [transcriptText, setTranscriptText] = useState('');
  const [file, setFile] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const timerRef = useRef(null);
  const recognitionRef = useRef(null);

  // Voice recording logic
  const handleToggleRecord = () => {
    if (isRecording) {
      if (recognitionRef.current) recognitionRef.current.stop();
      clearInterval(timerRef.current);
      setIsRecording(false);
    } else {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRecognition) {
        alert("Speech Recognition not supported in this browser. Please type or paste your speech text.");
        return;
      }
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onresult = (e) => {
        let text = '';
        for (let i = e.resultIndex; i < e.results.length; ++i) {
          text += e.results[i][0].transcript;
        }
        setTranscriptText(prev => prev + ' ' + text);
      };

      recognition.onerror = (err) => {
        console.error(err);
        setIsRecording(false);
      };

      recognition.onend = () => {
        setIsRecording(false);
        clearInterval(timerRef.current);
      };

      recognitionRef.current = recognition;
      recognition.start();
      setIsRecording(true);
      setRecordingSeconds(0);
      timerRef.current = setInterval(() => {
        setRecordingSeconds(s => s + 1);
      }, 1000);
    }
  };

  const handleAnalyze = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (activeTab === 'upload' && file) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('title', title);
        formData.append('duration_seconds', duration.toString());
        const res = await api.post('/presentation/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        navigate(`/learner/presentations/${res.data.id}`);
      } else {
        const textToAnalyze = transcriptText.trim() || 
          "Welcome everyone. Um, today I want to present our vision for sustainable urban technology. Basically, like, if we optimize public transit corridors, we can actually eliminate over forty percent of gridlock. So you know, this creates enormous economic and environmental value.";
        
        const effectiveDuration = activeTab === 'record' && recordingSeconds > 5 ? recordingSeconds : duration;

        const res = await api.post('/presentation/analyze', {
          title,
          transcript_text: textToAnalyze,
          duration_seconds: parseFloat(effectiveDuration)
        });
        navigate(`/learner/presentations/${res.data.id}`);
      }
    } catch (err) {
      setError(err.message || 'Failed to analyze speech presentation.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8 py-6">
      <div>
        <h1 className="text-2xl font-black text-white tracking-tight">Presentation & Speech Lab</h1>
        <p className="text-xs text-slate-400 mt-1">
          Evaluate speech pacing (WPM), detect filler words ('um', 'like', 'basically'), assess vocal confidence, and receive tailored delivery coaching.
        </p>
      </div>

      <Card className="p-6">
        {error && (
          <div className="mb-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Presentation Title *</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Investor Pitch: Clean Energy Grid"
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-primary-500"
            />
          </div>

          {/* Mode Tabs */}
          <div className="flex border-b border-slate-700/60 pb-2 gap-4 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setActiveTab('record')}
              className={`pb-1 border-b-2 transition-all ${
                activeTab === 'record' ? 'border-primary-500 text-primary-400' : 'border-transparent text-slate-400 hover:text-white'
              }`}
            >
              Live Mic Recording
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('upload')}
              className={`pb-1 border-b-2 transition-all ${
                activeTab === 'upload' ? 'border-primary-500 text-primary-400' : 'border-transparent text-slate-400 hover:text-white'
              }`}
            >
              Upload Audio/Video File
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('text')}
              className={`pb-1 border-b-2 transition-all ${
                activeTab === 'text' ? 'border-primary-500 text-primary-400' : 'border-transparent text-slate-400 hover:text-white'
              }`}
            >
              Direct Transcript Input
            </button>
          </div>

          {/* Tab 1: Live Record */}
          {activeTab === 'record' && (
            <div className="p-8 text-center bg-slate-900/60 rounded-2xl border border-slate-800 space-y-4">
              <div className="w-16 h-16 rounded-full mx-auto flex items-center justify-center bg-slate-800 border border-slate-700">
                {isRecording ? (
                  <Mic className="w-8 h-8 text-rose-500 animate-pulse" />
                ) : (
                  <Mic className="w-8 h-8 text-slate-400" />
                )}
              </div>

              {isRecording ? (
                <div>
                  <div className="text-xl font-mono font-bold text-rose-400">
                    Recording: {recordingSeconds}s
                  </div>
                  <p className="text-xs text-slate-400 mt-1">Speak into your microphone now...</p>
                  <Button 
                    variant="danger" 
                    size="sm" 
                    onClick={handleToggleRecord} 
                    className="mt-3"
                  >
                    <MicOff className="w-4 h-4 mr-1.5" /> Stop Recording
                  </Button>
                </div>
              ) : (
                <div>
                  <p className="text-xs text-slate-300 font-medium">Click below to start live speech capture</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">Deliberate pauses and natural cadence are measured in real time</p>
                  <Button 
                    variant="primary" 
                    size="sm" 
                    onClick={handleToggleRecord} 
                    className="mt-3"
                  >
                    <Mic className="w-4 h-4 mr-1.5" /> Start Recording
                  </Button>
                </div>
              )}

              {transcriptText && (
                <div className="mt-4 p-3 bg-slate-950/80 rounded-xl border border-slate-800 text-left text-xs text-slate-300 max-h-32 overflow-y-auto">
                  <span className="text-[10px] text-primary-400 font-bold uppercase block mb-1">Live Transcribed Text:</span>
                  {transcriptText}
                </div>
              )}
            </div>
          )}

          {/* Tab 2: Upload File */}
          {activeTab === 'upload' && (
            <div className="p-8 text-center bg-slate-900/60 rounded-2xl border-2 border-dashed border-slate-700/60 hover:border-primary-500/50 space-y-4 cursor-pointer">
              <Upload className="w-10 h-10 text-slate-400 mx-auto" />
              <div>
                <p className="text-xs text-slate-200 font-medium">Drag and drop audio/video file here, or click to browse</p>
                <p className="text-[11px] text-slate-500 mt-1">Supports MP3, WAV, WEBM, MP4 (max 50MB)</p>
              </div>
              <input
                type="file"
                accept="audio/*,video/*"
                onChange={(e) => setFile(e.target.files[0])}
                className="hidden"
                id="file-upload-input"
              />
              <label htmlFor="file-upload-input" className="inline-block">
                <Button variant="secondary" size="sm" type="button">
                  Choose File
                </Button>
              </label>
              {file && (
                <div className="text-xs text-primary-400 font-semibold flex items-center justify-center gap-1 mt-2">
                  <CheckCircle className="w-4 h-4" /> Selected: {file.name}
                </div>
              )}
            </div>
          )}

          {/* Tab 3: Direct Text Input */}
          {activeTab === 'text' && (
            <div className="space-y-2">
              <label className="block text-xs font-medium text-slate-300">Paste Speech Transcript</label>
              <textarea
                rows={5}
                value={transcriptText}
                onChange={(e) => setTranscriptText(e.target.value)}
                placeholder="Paste speech text here to evaluate pacing, filler words, clarity, and confidence..."
                className="w-full p-3 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-primary-500"
              />
            </div>
          )}

          <div className="pt-4 border-t border-slate-700/60 flex justify-end">
            <Button
              type="button"
              onClick={handleAnalyze}
              loading={loading}
              size="lg"
              className="px-8 shadow-xl shadow-primary-600/30"
            >
              Analyze Speech & Presentation <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};
