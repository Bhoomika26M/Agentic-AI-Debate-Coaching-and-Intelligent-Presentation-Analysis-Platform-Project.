import { useEffect, useRef, useState } from "react";
import { LoaderCircle, Mic, RotateCcw, Sparkles, Square, Upload } from "lucide-react";
import { useAuth } from "../auth/AuthProvider";
import { MicCueArt } from "../../components/CueArt";
import { analyzePresentation, type PresentationResult } from "../../services/presentation-api";
import { savePresentationFeedback, uploadPresentationAudio } from "../../services/presentation-records";
import { loadProfile } from "../../services/profiles";
import "./presentation.css";

const MAX_SEC = 180;

function formatStamp(seconds: number) {
  const m = Math.floor(seconds / 60).toString().padStart(2, "0");
  const s = Math.floor(seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

export function PresentationRoom({ topic, sessionId, compact, onResult }: { topic?: string; sessionId?: string | null; compact?: boolean; onResult?: (result: PresentationResult | null) => void }) {
  const { session, user } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [recording, setRecording] = useState(false);
  const [recSecs, setRecSecs] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [result, setResult] = useState<PresentationResult | null>(null);
  const [retain, setRetain] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef(0);

  useEffect(() => () => {
    window.clearInterval(timerRef.current);
    recorderRef.current?.stream.getTracks().forEach((t) => t.stop());
  }, []);

  useEffect(() => () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  useEffect(() => {
    if (!user) {
      setRetain(false);
      return;
    }
    let active = true;
    void loadProfile(user.id)
      .then((profile) => { if (active && profile) setRetain(profile.retain_audio); })
      .catch(() => {});
    return () => { active = false; };
  }, [user]);

  function pick(next: File | null) {
    setError(""); setNotice(""); setResult(null);
    onResult?.(null);
    if (next) {
      const okType = /audio\/(webm|wav|x-wav|mp3|mpeg)/.test(next.type) || /\.(webm|wav|mp3)$/i.test(next.name);
      if (!okType) {
        setError("Use webm, wav, or mp3 audio.");
        return;
      }
      if (next.size === 0) {
        setError("That file is empty. Choose another recording.");
        return;
      }
      if (next.size > 10 * 1024 * 1024) {
        setError("Audio is over 10MB. Trim under 3 minutes.");
        return;
      }
    }
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(next ? URL.createObjectURL(next) : "");
    setFile(next);
  }

  function pickMimeType() {
    const candidates = ["audio/webm", "audio/mp4", ""];
    for (const mime of candidates) {
      if (!mime) return "";
      try {
        if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(mime)) return mime;
      } catch {
        continue;
      }
    }
    return "";
  }

  async function startRecording() {
    setError(""); setNotice(""); setResult(null);
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setError("Recording is not available in this browser. Upload a file instead.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = pickMimeType();
      const recorder = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
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
      onResult?.(out);
      if (session && user) {
        try {
          const feedbackId = await savePresentationFeedback({ sessionId, topic, transcript: out.transcript, signals: out.signals, report: out.report });
          if (retain) {
            try {
              await uploadPresentationAudio(user.id, feedbackId, file);
              setNotice("Saved to your learner archive with its recording.");
            } catch {
              setNotice("Saved to your learner archive, but the recording could not be kept. Audio is discarded by default.");
            }
          } else {
            setNotice("Saved to your learner archive. Audio discarded.");
          }
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
    <section className={`present-room ${compact ? "present-compact" : ""}`} role="region" aria-label="Delivery review">
      <div className="present-controls">
        <div className="present-buttons">
          {recording
            ? <button className="button button-dark" onClick={() => void stopRecording()}><Square size={15} /> Stop ({formatStamp(recSecs)})</button>
            : <button className="button button-dark" onClick={() => void startRecording()}><Mic size={15} /> Record</button>}
          <label className="button button-light present-upload">
            <Upload size={15} /> Upload
            <input type="file" accept="audio/webm,audio/wav,audio/mp3,audio/mpeg" className="visually-hidden" aria-label="Upload audio file" onChange={(e) => { pick(e.target.files?.[0] ?? null); e.target.value = ""; }} />
          </label>
          <button className="button button-dark" onClick={() => void analyze()} disabled={!file || loading || recording}>
            {loading ? <><LoaderCircle className="spin" size={15} /> Reviewing delivery</> : <><Sparkles size={15} /> Review delivery</>}
          </button>
        </div>
        <p className="present-hint">Record up to 3:00 or upload webm/wav/mp3 under 10MB. Audio is discarded by default.</p>
        {user && (
          <label className="present-check" htmlFor={`retain-${compact ? "compact" : "full"}`}>
            <input
              id={`retain-${compact ? "compact" : "full"}`}
              type="checkbox"
              checked={retain}
              onChange={(event) => setRetain(event.target.checked)}
            />
            Keep this recording in my archive
          </label>
        )}
        {!file && !result && !recording && <MicCueArt label="Record or upload a take to begin" />}
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
        {result.transcript && <p className="present-transcript">{result.transcript}</p>}
        {result.signals.events.length === 0 && (
          <p className="present-empty" role="status">Steady take — no flagged patches. Try a faster or longer passage to surface more coaching.</p>
        )}
        <div className="present-events">
          {result.signals.events.map((e, i) => (
            <button key={`${e.start}-${i}`} className={`present-event kind-${e.kind}`} onClick={() => seek(e.start)} aria-label={`Replay ${formatStamp(e.start)} to ${formatStamp(e.end)}, ${e.label}`}>
              <span>{formatStamp(e.start)}–{formatStamp(e.end)} · {e.label.toUpperCase()}</span>
              <p>{e.detail}</p>
            </button>
          ))}
        </div>
        <div className="present-drills">
          {result.report.drills.map((d, i) => (
            <article key={i}>
              <button onClick={() => seek(d.start)} aria-label={`Replay drill ${i + 1} at ${formatStamp(d.start)}`}>{formatStamp(d.start)}–{formatStamp(d.end)} · {d.pattern.toUpperCase()} — replay</button>
              <p>{d.what_happened}</p>
              <small>TRY THIS: {d.try_this}</small>
              <p className="present-example">SAY: {d.example}</p>
            </article>
          ))}
        </div>
        <p className="analysis-limit">Coaching estimate from an AI model, based on this recording only. Delivery states are observable patterns, not diagnoses. Audio discarded after review{result.retained ? "" : " — not retained"}.</p>
        <button className="button button-light" onClick={() => { pick(null); setRecSecs(0); }}><RotateCcw size={15} /> Try another take</button>
      </>}
    </section>
  );
}
