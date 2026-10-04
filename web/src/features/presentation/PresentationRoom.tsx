import { useEffect, useRef, useState } from "react";
import { LoaderCircle, Mic, RotateCcw, Sparkles, Square, Upload } from "lucide-react";
import { useAuth } from "../auth/AuthProvider";
import { analyzePresentation, type PresentationResult } from "../../services/presentation-api";
import { savePresentationFeedback } from "../../services/presentation-records";
import "./presentation.css";

const MAX_SEC = 180;

function formatStamp(seconds: number) {
  const m = Math.floor(seconds / 60).toString().padStart(2, "0");
  const s = Math.floor(seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

export function PresentationRoom({ topic, sessionId, compact }: { topic?: string; sessionId?: string | null; compact?: boolean }) {
  const { session } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [recording, setRecording] = useState(false);
  const [recSecs, setRecSecs] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [result, setResult] = useState<PresentationResult | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef(0);

  useEffect(() => () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    window.clearInterval(timerRef.current);
    recorderRef.current?.stream.getTracks().forEach((t) => t.stop());
  }, [previewUrl]);

  function pick(next: File | null) {
    setError(""); setNotice(""); setResult(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(next ? URL.createObjectURL(next) : "");
    setFile(next);
  }

  async function startRecording() {
    setError(""); setNotice(""); setResult(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      chunksRef.current = [];
      recorder.ondataavailable = (e) => { if (e.data.size) chunksRef.current.push(e.data); };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        stream.getTracks().forEach((t) => t.stop());
        pick(new File([blob], "closing.webm", { type: "audio/webm" }));
      };
      recorderRef.current = recorder;
      recorder.start();
      setRecording(true);
      setRecSecs(0);
      timerRef.current = window.setInterval(() => setRecSecs((s) => {
        if (s + 1 >= MAX_SEC) void stopRecording();
        return s + 1;
      }), 1000);
    } catch {
      setError("Microphone access was blocked. Allow the microphone or upload a file instead.");
    }
  }

  async function stopRecording() {
    window.clearInterval(timerRef.current);
    setRecording(false);
    recorderRef.current?.stop();
  }

  function seek(seconds: number) {
    const el = audioRef.current;
    if (!el) return;
    el.currentTime = Math.max(0, seconds - 0.5);
    void el.play().catch(() => {});
  }

  async function analyze() {
    if (!file || loading) return;
    setLoading(true); setError(""); setNotice("");
    try {
      const out = await analyzePresentation(file, file.name, topic, session?.access_token);
      setResult(out);
      if (session) {
        try {
          await savePresentationFeedback({ sessionId, topic, transcript: out.transcript, signals: out.signals, report: out.report });
          setNotice("Saved to your learner archive.");
        } catch {
          setNotice("Review is ready, but saving failed. It stays in this browser session.");
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "The delivery coach could not review this audio.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className={`present-room ${compact ? "present-compact" : ""}`} aria-label="Delivery review">
      <div className="present-controls">
        <div className="present-buttons">
          {recording
            ? <button className="button button-dark" onClick={() => void stopRecording()}><Square size={15} /> Stop ({formatStamp(recSecs)})</button>
            : <button className="button button-dark" onClick={() => void startRecording()}><Mic size={15} /> Record</button>}
          <label className="button button-light present-upload">
            <Upload size={15} /> Upload
            <input type="file" accept="audio/webm,audio/wav,audio/mp3,audio/mpeg" hidden onChange={(e) => pick(e.target.files?.[0] ?? null)} />
          </label>
          <button className="button button-dark" onClick={() => void analyze()} disabled={!file || loading || recording}>
            {loading ? <><LoaderCircle className="spin" size={15} /> Reviewing delivery</> : <><Sparkles size={15} /> Review delivery</>}
          </button>
        </div>
        <p className="present-hint">Record up to 3:00 or upload webm/wav/mp3 under 10MB. Audio is discarded by default.</p>
        {previewUrl && <audio ref={audioRef} className="present-audio" controls src={previewUrl} />}
        {error && <div className="analysis-error" role="alert">{error}</div>}
        {notice && <div className="inline-notice" role="status">{notice}</div>}
      </div>
      {result && <>
        <div className="present-signals">
          <div><span>PACE</span><b>{result.signals.wpm} wpm</b></div>
          <div><span>FILLERS</span><b>{result.signals.filler_count}</b></div>
          <div><span>PAUSES</span><b>{result.signals.pause_count}</b></div>
          <div><span>DELIVERY</span><b>{result.report.communication_score} / 5</b></div>
        </div>
        <div className="present-events">
          {result.signals.events.map((e, i) => (
            <button key={`${e.start}-${i}`} className={`present-event kind-${e.kind}`} onClick={() => seek(e.start)}>
              <span>{formatStamp(e.start)}–{formatStamp(e.end)} · {e.label.toUpperCase()}</span>
              <p>{e.detail}</p>
            </button>
          ))}
        </div>
        <div className="present-drills">
          {result.report.drills.map((d, i) => (
            <article key={i}>
              <button onClick={() => seek(d.start)}>{formatStamp(d.start)}–{formatStamp(d.end)} · {d.pattern.toUpperCase()} — replay</button>
              <p>{d.what_happened}</p>
              <small>TRY THIS: {d.try_this}</small>
              <p className="present-example">SAY: {d.example}</p>
            </article>
          ))}
        </div>
        <p className="analysis-limit">Coaching estimate from an AI model, based on this recording only. Delivery states are observable patterns, not diagnoses.</p>
        <button className="button button-light" onClick={() => { pick(null); setRecSecs(0); }}><RotateCcw size={15} /> Try another take</button>
      </>}
    </section>
  );
}
