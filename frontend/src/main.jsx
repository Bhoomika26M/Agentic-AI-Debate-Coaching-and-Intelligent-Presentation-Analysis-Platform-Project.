import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import "./style.css";

const api = async (path, options = {}) => {
  const token = localStorage.getItem("token");
  const headers = options.body instanceof FormData ? {} : { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  const response = await fetch(`/api${path}`, { ...options, headers: { ...headers, ...(options.headers || {}) } });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(Array.isArray(body.detail) ? body.detail.map((item) => item.msg).join(", ") : body.detail || "Request failed");
  }
  return response.json();
};

const roleLabel = (role) => role.replaceAll("_", " ");
const nav = [
  ["dashboard", "Overview", "⌂"],
  ["debate", "New debate", "+"],
  ["simulation", "AI simulation", "◎"],
  ["presentation", "Presentation lab", "◒"],
  ["media", "Media library", "▣"],
  ["coaching", "Coaching plan", "✦"],
  ["reports", "Reports & exports", "▤"],
  ["profile", "My profile", "◉"],
];

function Auth({ onLogin }) {
  const [register, setRegister] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const submit = async (event) => {
    event.preventDefault();
    try {
      const result = await api(`/auth/${register ? "register" : "login"}`, { method: "POST", body: JSON.stringify(form) });
      localStorage.setItem("token", result.access_token);
      localStorage.setItem("user", JSON.stringify(result.user));
      onLogin(result.user);
    } catch (err) { setError(err.message); }
  };
  return <main className="auth-page"><div className="auth-decoration"><span>ARGUE</span><strong>WELL</strong><p>Think clearly. Speak confidently.</p></div><form className="auth-card" onSubmit={submit}>
    <div className="brand large">Argue<span>Well</span></div><p className="eyebrow">DEBATE COACHING STUDIO</p><h1>{register ? "Start your practice" : "Welcome back"}</h1><p className="muted">{register ? "Build stronger arguments one session at a time." : "Your next breakthrough starts here."}</p>
    {register && <input placeholder="Full name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />}
    <input type="email" placeholder="Email address" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
    <input type="password" placeholder="Password (8+ characters)" minLength="8" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
    {error && <div className="alert">{error}</div>}<button className="button primary wide">{register ? "Create account" : "Sign in"} <span>→</span></button>
    <button type="button" className="link-button" onClick={() => { setRegister(!register); setError(""); }}>{register ? "I already have an account" : "Create a new account"}</button>
  </form></main>;
}

function Layout({ user, page, setPage, onLogout, children }) {
  const [mobile, setMobile] = useState(false);
  const isStaff = ["debate_coach", "educator", "administrator"].includes(user.role);
  return <div className="app-shell"><aside className={`sidebar ${mobile ? "open" : ""}`}>
    <div className="brand">Argue<span>Well</span></div><div className="sidebar-caption">YOUR PRACTICE STUDIO</div>
    <div className="user-card"><div className="avatar">{user.name.slice(0, 1).toUpperCase()}</div><div><b>{user.name}</b><small>{roleLabel(user.role)}</small></div></div>
    <nav>{nav.map(([key, label, icon]) => <button key={key} className={page === key ? "nav-item active" : "nav-item"} onClick={() => { setPage(key); setMobile(false); }}><i>{icon}</i>{label}</button>)}{isStaff && <button className={page === "role" ? "nav-item active" : "nav-item"} onClick={() => { setPage("role"); setMobile(false); }}><i>◇</i>Role dashboard</button>}</nav>
    <div className="sidebar-bottom"><a href="/docs" target="_blank" rel="noreferrer">API documentation ↗</a><button className="nav-item signout" onClick={onLogout}><i>↪</i>Sign out</button></div>
  </aside><button className="mobile-menu" onClick={() => setMobile(!mobile)}>☰</button><main className="content">{children}</main></div>;
}

function Header({ eyebrow, title, subtitle, action }) {
  return <header className="page-header"><div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1>{subtitle && <p className="muted">{subtitle}</p>}</div>{action}</header>;
}
function Metric({ label, value }) { return <div className="metric"><div><span>{label}</span><b>{value || 0}<small>/100</small></b></div><progress max="100" value={value || 0} /></div>; }
function Notice({ children }) { return children ? <div className="notice">{children}</div> : null; }

function Dashboard({ data, user, setPage }) {
  const dashboard = data?.dashboard || {};
  const skills = dashboard.skills || {};
  return <><Header eyebrow="Practice studio" title={`Good to see you, ${user.name.split(" ")[0]}.`} subtitle="Build clearer arguments and more confident delivery." action={<button className="button primary" onClick={() => setPage("debate")}>+ New session</button>} />
    <div className="stats-grid"><div className="stat-card"><span>SESSIONS COMPLETED</span><b>{dashboard.sessions_count || 0}</b><small>Keep your momentum going</small></div><div className="stat-card"><span>AVERAGE SCORE</span><b>{dashboard.average_score || 0}</b><small>Across all practice sessions</small></div><div className="stat-card"><span>PERSONAL BEST</span><b>{dashboard.best_score || 0}</b><small>Your strongest performance</small></div><div className="stat-card accent"><span>ROLE</span><b>{roleLabel(user.role)}</b><small>Personalized workspace</small></div></div>
    <div className="dashboard-grid"><section className="panel"><div className="panel-heading"><div><p className="eyebrow">PERFORMANCE</p><h2>Skill snapshot</h2></div><button className="text-button" onClick={() => setPage("reports")}>View reports →</button></div><div className="metrics-grid">{Object.entries(skills).length ? Object.entries(skills).map(([key, value]) => <Metric key={key} label={key} value={value} />) : <div className="empty">Complete your first debate to see skill scores.</div>}</div></section><section className="panel focus-card"><p className="eyebrow">NEXT COACHING FOCUS</p><h2>{data?.learning_plan?.focus || "Clarity"}</h2><p>{data?.learning_plan?.weeks?.[0]?.goal || "Deliver a 30-second thesis with two signposted reasons."}</p><button className="button dark" onClick={() => setPage("coaching")}>Open learning plan →</button></section></div>
    <section className="panel"><div className="panel-heading"><div><p className="eyebrow">YOUR PRACTICE</p><h2>Recent sessions</h2></div><button className="text-button" onClick={() => setPage("reports")}>See all →</button></div>{(dashboard.recent_sessions || []).length ? dashboard.recent_sessions.map((session) => <div className="session-row" key={session.id}><div className="session-icon">◈</div><div className="session-info"><b>{session.title}</b><span>{session.topic}</span></div><span className="score-pill">{session.overall_score}/100</span><button className="small-button" onClick={() => setPage(`report:${session.id}`)}>View report</button></div>) : <div className="empty large-empty"><b>Your first practice session is one click away.</b><button className="button primary" onClick={() => setPage("debate")}>Start a debate</button></div>}</section>
  </>;
}

function DebatePage({ setPage }) {
  const [form, setForm] = useState({ title: "", topic: "", position: "for", transcript: "" }); const [error, setError] = useState(""); const [busy, setBusy] = useState(false);
  const submit = async (event) => { event.preventDefault(); setBusy(true); try { const result = await api("/sessions", { method: "POST", body: JSON.stringify(form) }); setPage(`report:${result.id}`); } catch (err) { setError(err.message); } finally { setBusy(false); } };
  return <><Header eyebrow="PRACTICE LAB" title="Analyze a debate" subtitle="Turn your argument into actionable coaching feedback."/><form className="panel form-panel" onSubmit={submit}><div className="form-grid"><label>Session title<input required placeholder="My policy debate" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></label><label>Topic<input required placeholder="Should cities ban single-use plastics?" value={form.topic} onChange={(e) => setForm({ ...form, topic: e.target.value })} /></label></div><label>Position<select value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })}><option value="for">I support this</option><option value="against">I oppose this</option></select></label><label>Transcript or argument notes<textarea required rows="10" placeholder="Paste your speech or argument here..." value={form.transcript} onChange={(e) => setForm({ ...form, transcript: e.target.value })} /></label><Notice>{error}</Notice><button className="button primary" disabled={busy}>{busy ? "Analyzing..." : "Analyze my argument →"}</button></form></>;
}

function Simulation() {
  const [form, setForm] = useState({ topic: "", position: "for", content: "", turn_type: "opening" }); const [session, setSession] = useState(null); const [error, setError] = useState("");
  const send = async (event) => { event.preventDefault(); try { const result = await api("/debate/turn", { method: "POST", body: JSON.stringify({ ...form, session_id: session?.session_id }) }); setSession(result); setForm({ ...form, content: "", turn_type: "rebuttal" }); } catch (err) { setError(err.message); } };
  return <><Header eyebrow="AI DEBATE ROOM" title="Practice with an AI opponent" subtitle="Make your case, handle challenges, and sharpen your rebuttals."/><div className="simulation-layout"><section className="panel"><div className="chat">{session?.turns?.map((turn, index) => <div className={`bubble ${turn.speaker}`} key={index}><small>{turn.speaker === "coach" ? "AI COACH" : "YOU"}</small><p>{turn.content}</p></div>) || <div className="empty">Start a simulation and the AI coach will challenge your strongest claim.</div>}</div><form onSubmit={send} className="sim-form">{!session && <><label>Topic<input required placeholder="Should school uniforms be mandatory?" value={form.topic} onChange={(e) => setForm({ ...form, topic: e.target.value })} /></label><label>Position<select value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })}><option value="for">I support this</option><option value="against">I oppose this</option></select></label></>}<label>Your response<textarea required rows="4" placeholder="Make your opening statement..." value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} /></label><Notice>{error}</Notice><button className="button primary">{session ? "Send rebuttal →" : "Begin simulation →"}</button></form></section></div></>;
}

function Presentation({ setPage }) {
  const [form, setForm] = useState({ title: "Presentation practice", transcript: "", duration_seconds: "" }); const [result, setResult] = useState(null); const [error, setError] = useState("");
  const submit = async (event) => { event.preventDefault(); try { setResult(await api("/presentations/analyze", { method: "POST", body: JSON.stringify({ ...form, duration_seconds: form.duration_seconds ? Number(form.duration_seconds) : null }) })); } catch (err) { setError(err.message); } };
  return <><Header eyebrow="DELIVERY LAB" title="Analyze a presentation" subtitle="Measure pace, clarity, confidence, and audience engagement."/><div className="two-column"><form className="panel form-panel" onSubmit={submit}><label>Presentation title<input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></label><label>Duration in seconds <span className="optional">optional</span><input type="number" value={form.duration_seconds} onChange={(e) => setForm({ ...form, duration_seconds: e.target.value })} /></label><label>Transcript<textarea required rows="12" placeholder="Paste your presentation transcript..." value={form.transcript} onChange={(e) => setForm({ ...form, transcript: e.target.value })} /></label><Notice>{error}</Notice><button className="button primary">Analyze delivery →</button></form>{result && <section className="panel result-panel"><p className="eyebrow">PRESENTATION REPORT</p><h2>{result.presentation.title}</h2><div className="big-score">{result.overall_score}<small>/100</small></div><div className="result-list"><div><b>{result.pacing_wpm} WPM</b><span>Speaking pace</span></div><div><b>{result.filler_words}</b><span>Filler words</span></div><div><b>{result.presentation.recommended_wpm} WPM</b><span>Recommended pace</span></div></div><h3>Coaching notes</h3><ul>{(result.recommendations || []).map((item) => <li key={item}>{item}</li>)}</ul></section>}</div></>;
}

function Coaching({ plan }) { return <><Header eyebrow="PERSONALIZED COACHING" title="Your learning plan" subtitle={`Focus area: ${plan?.focus || "clarity"}`} /><section className="plan-grid">{(plan?.weeks || []).map((week) => <article className="panel plan-card" key={week.week}><span className="week-number">0{week.week}</span><p className="eyebrow">WEEK {week.week}</p><h2>{week.goal}</h2><div className="plan-line" /></article>)}</section></>; }
function Profile({ user, setUser }) { const [form, setForm] = useState({ name: user.name, bio: user.bio || "", experience_level: user.experience_level || "beginner" }); const [saved, setSaved] = useState(false); const save = async (e) => { e.preventDefault(); const result = await api("/profile", { method: "PATCH", body: JSON.stringify(form) }); localStorage.setItem("user", JSON.stringify(result)); setUser(result); setSaved(true); }; return <><Header eyebrow="ACCOUNT" title="My profile" subtitle="Keep your coaching preferences and goals up to date."/><form className="panel form-panel narrow" onSubmit={save}><div className="profile-hero"><div className="avatar big">{user.name.slice(0, 1)}</div><div><h2>{user.name}</h2><span className="role-badge">{roleLabel(user.role)}</span></div></div><label>Display name<input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label><label>Experience level<select value={form.experience_level} onChange={(e) => setForm({ ...form, experience_level: e.target.value })}><option>beginner</option><option>intermediate</option><option>advanced</option></select></label><label>Bio<textarea rows="5" value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} /></label>{saved && <div className="success">Profile saved successfully.</div>}<button className="button primary">Save changes</button></form></>; }
function Media() { const [file, setFile] = useState(null); const [transcript, setTranscript] = useState(""); const [result, setResult] = useState(null); const upload = async (e) => { e.preventDefault(); const body = new FormData(); body.append("file", file); body.append("transcript", transcript); try { setResult(await api("/media/upload", { method: "POST", body })); } catch (err) { setResult({ error: err.message }); } }; return <><Header eyebrow="MEDIA LIBRARY" title="Presentation recordings" subtitle="Upload a recording or provide a transcript for delivery analysis."/><form className="panel upload-panel" onSubmit={upload}><div className="dropzone"><span className="upload-icon">↥</span><h2>Drop an audio or video file here</h2><p>MP3, WAV, WEBM, MP4 or MOV · Up to 100 MB</p><input required type="file" accept="audio/*,video/*" onChange={(e) => setFile(e.target.files[0])} /></div><label>Optional transcript<textarea rows="5" value={transcript} onChange={(e) => setTranscript(e.target.value)} placeholder="Add a transcript to analyze immediately..." /></label><button className="button primary" disabled={!file}>Upload and analyze →</button>{result && <div className={result.error ? "alert" : "success"}>{result.error || `Uploaded successfully using ${result.transcription_engine || "local"} analysis.`}</div>}</form></>; }
function Reports({ sessions, setPage }) { return <><Header eyebrow="REPORT CENTER" title="Reports & exports" subtitle="Review your performance and download a shareable report."/><section className="panel">{sessions.length ? sessions.map((s) => <div className="session-row" key={s.id}><div className="session-icon">▤</div><div className="session-info"><b>{s.title}</b><span>{s.topic}</span></div><span className="score-pill">{s.overall_score}/100</span><button className="small-button" onClick={() => setPage(`report:${s.id}`)}>Open report</button></div>) : <div className="empty">No reports yet. Complete a debate session first.</div>}</section></>; }
function Report({ id }) { const [data, setData] = useState(null); useEffect(() => { api(`/sessions/${id}`).then(setData); }, [id]); if (!data) return <div className="loading">Loading report...</div>; const a = data.analysis || {}; return <><Header eyebrow="SESSION REPORT" title={data.session.title} subtitle={data.session.topic} action={<div className="export-actions"><a className="button secondary" href={`/api/sessions/${id}/export?format=pdf`} target="_blank">PDF</a><a className="button secondary" href={`/api/sessions/${id}/export?format=xlsx`}>Excel</a></div>}/><div className="report-grid"><section className="panel"><p className="eyebrow">SCORECARD</p><div className="metrics-grid">{["clarity", "evidence", "persuasiveness", "delivery"].map((key) => <Metric key={key} label={key} value={a[key]} />)}</div></section><section className="panel"><p className="eyebrow">FALLACIES DETECTED</p>{(a.fallacies || []).length ? a.fallacies.map((f, i) => <div className="fallacy" key={i}><b>{f.type}</b><span>{f.explanation || f.excerpt}</span></div>) : <div className="success">No major fallacies detected.</div>}</section></div><section className="panel"><p className="eyebrow">COACHING RECOMMENDATIONS</p><ul className="recommendations">{(a.recommendations || []).map((x) => <li key={x}>{x}</li>)}</ul></section></>; }

function App() {
  const [user, setUser] = useState(() => JSON.parse(localStorage.getItem("user") || "null")); const [page, setPage] = useState("dashboard"); const [data, setData] = useState(null); const [sessions, setSessions] = useState([]);
  const refresh = () => { if (user) Promise.all([api("/role-dashboard"), api("/coaching/plan"), api("/sessions")]).then(([role, plan, list]) => { setData({ ...role, plan }); setSessions(list); }).catch(() => {}); };
  useEffect(refresh, [user]);
  if (!user) return <Auth onLogin={setUser} />;
  const logout = () => { localStorage.clear(); setUser(null); };
  const body = page === "dashboard" ? <Dashboard data={data} user={user} setPage={setPage} /> : page === "debate" ? <DebatePage setPage={(target) => { setPage(target); refresh(); }} /> : page === "simulation" ? <Simulation /> : page === "presentation" ? <Presentation /> : page === "media" ? <Media /> : page === "coaching" ? <Coaching plan={data?.plan} /> : page === "reports" ? <Reports sessions={sessions} setPage={setPage} /> : page === "profile" ? <Profile user={user} setUser={setUser} /> : page === "role" ? <RoleDashboard data={data} user={user} /> : page.startsWith("report:") ? <Report id={page.split(":")[1]} /> : <Dashboard data={data} user={user} setPage={setPage} />;
  return <Layout user={user} page={page.split(":")[0]} setPage={setPage} onLogout={logout}>{body}</Layout>;
}
function RoleDashboard({ data, user }) { return <><Header eyebrow="ROLE DASHBOARD" title={`${roleLabel(user.role)} workspace`} subtitle="Your role-specific tools and platform overview."/><div className="stats-grid">{(data?.capabilities || []).map((capability) => <div className="stat-card" key={capability}><span>CAPABILITY</span><b>{capability.replaceAll("_", " ")}</b><small>Available in your workspace</small></div>)}</div><section className="panel"><h2>Platform overview</h2><div className="result-list">{Object.entries(data?.platform || {}).map(([key, value]) => <div key={key}><b>{value}</b><span>{key.replaceAll("_", " ")}</span></div>)}</div></section></>; }

createRoot(document.getElementById("root")).render(<App />);
