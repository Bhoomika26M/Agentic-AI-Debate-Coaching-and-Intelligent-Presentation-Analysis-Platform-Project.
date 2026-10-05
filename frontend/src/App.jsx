import { useEffect, useState } from "react";
import { api, setToken } from "./api";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Sessions from "./pages/Sessions";
import SessionDetail from "./pages/SessionDetail";

export default function App() {
  const [user, setUser] = useState(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [view, setView] = useState("dashboard"); // dashboard | sessions | session-detail
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [sessionsCache, setSessionsCache] = useState([]);

  useEffect(() => {
    api
      .me()
      .then(setUser)
      .catch(() => setToken(null))
      .finally(() => setCheckingAuth(false));
  }, []);

  useEffect(() => {
    if (user) {
      api.listSessions().then(setSessionsCache).catch(() => {});
    }
  }, [user, view]);

  function logout() {
    setToken(null);
    setUser(null);
  }

  function openSession(id) {
    setActiveSessionId(id);
    setView("session-detail");
  }

  if (checkingAuth) {
    return <div className="content empty-state">Loading…</div>;
  }

  if (!user) {
    return (
      <div className="app-shell">
        <header className="masthead">
          <div>
            <div className="kicker">INTERNSHIP BUILD · FREE / LOCAL AI</div>
            <h1>The Debate Coach</h1>
          </div>
        </header>
        <Auth onAuthed={setUser} />
      </div>
    );
  }

  return (
    <div className="app-shell">
      <header className="masthead">
        <div>
          <div className="kicker">AGENTIC AI DEBATE COACH &amp; PRESENTATION ANALYSIS</div>
          <h1>The Debate Coach</h1>
        </div>
        <nav>
          <button
            className={view === "dashboard" ? "active" : ""}
            onClick={() => setView("dashboard")}
          >
            Dashboard
          </button>
          <button
            className={view === "sessions" || view === "session-detail" ? "active" : ""}
            onClick={() => setView("sessions")}
          >
            Debate Sessions
          </button>
          <span className="user-chip">
            {user.full_name} · {user.role.replace("_", " ")}
          </span>
          <button onClick={logout}>Sign out</button>
        </nav>
      </header>

      {view === "dashboard" && <Dashboard user={user} />}
      {view === "sessions" && <Sessions onOpenSession={openSession} />}
      {view === "session-detail" && (
        <SessionDetail
          sessionId={activeSessionId}
          sessions={sessionsCache}
          onBack={() => setView("sessions")}
        />
      )}
    </div>
  );
}
