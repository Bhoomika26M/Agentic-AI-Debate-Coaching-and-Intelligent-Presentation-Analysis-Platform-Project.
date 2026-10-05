import { useState } from "react";
import { api, setToken } from "../api";

export default function Auth({ onAuthed }) {
  const [mode, setMode] = useState("login");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("learner");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const result =
        mode === "login"
          ? await api.login(email, password)
          : await api.register({ full_name: fullName, email, password, role });
      setToken(result.access_token);
      onAuthed(result.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="content" style={{ maxWidth: 420 }}>
      <div className="panel">
        <p className="section-title">
          {mode === "login" ? "Sign in" : "Create an account"}
        </p>
        <form onSubmit={submit}>
          {mode === "register" && (
            <>
              <label>Full name</label>
              <input value={fullName} onChange={(e) => setFullName(e.target.value)} required />

              <label>Role</label>
              <select value={role} onChange={(e) => setRole(e.target.value)}>
                <option value="learner">Learner</option>
                <option value="debate_coach">Debate Coach</option>
                <option value="educator">Educator</option>
                <option value="administrator">Administrator</option>
              </select>
            </>
          )}

          <label>Email</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />

          <label>Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
          />

          {error && <p className="error-text">{error}</p>}

          <button className="primary" type="submit" disabled={busy}>
            {busy ? "Please wait…" : mode === "login" ? "Sign in" : "Create account"}
          </button>
        </form>

        <p className="sans" style={{ fontSize: "0.85rem", marginTop: "1.2rem" }}>
          {mode === "login" ? (
            <>
              New here?{" "}
              <button className="link" onClick={() => setMode("register")}>
                Create an account
              </button>
            </>
          ) : (
            <>
              Already registered?{" "}
              <button className="link" onClick={() => setMode("login")}>
                Sign in
              </button>
            </>
          )}
        </p>
      </div>
    </div>
  );
}
