
import { useState } from "react";
import "./Login.css";

export default function Login({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  function handleSubmit(event) {
    event.preventDefault();
    setError("");

    if (!email.trim() || !password) {
      setError("Please enter your email and password.");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Please enter a valid email address.");
      return;
    }

    if (onLogin) {
      onLogin({ email: email.trim() });
    }
  }

  return (
    <main className="login-page">
      <section className="login-visual">
        <div className="brand">
          <div className="brand-icon">D</div>
          <span>DebateIQ</span>
        </div>

        <div className="visual-content">
          <span className="eyebrow">YOUR PERSONAL AI DEBATE COACH</span>
          <h1>
            Think sharper.
            <br />
            <span>Speak smarter.</span>
          </h1>
          <p>
            Strengthen your arguments, challenge perspectives,
            and become a more confident communicator with AI.
          </p>

          <div className="feature-list">
            <div>✦ AI-powered argument analysis</div>
            <div>✦ Intelligent rebuttal generation</div>
            <div>✦ Personalized presentation coaching</div>
          </div>
        </div>

        <div className="visual-footer">
          THINK. QUESTION. CONVINCE.
        </div>
      </section>

      <section className="login-panel">
        <div className="login-card">
          <div className="mobile-brand">
            <div className="brand-icon">D</div>
            <span>DebateIQ</span>
          </div>

          <div className="welcome-label">WELCOME BACK</div>
          <h2>Sign in to DebateIQ</h2>
          <p className="login-subtitle">
            Your next great argument starts here.
          </p>

          <form onSubmit={handleSubmit}>
            <label htmlFor="email">Email address</label>
            <input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              required
            />

            <label htmlFor="password">Password</label>
            <div className="password-field">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                className="show-password"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>

            {error && <p className="login-error">{error}</p>}

            <button type="submit" className="login-button">
              Sign in <span>→</span>
            </button>
          </form>

          <div className="login-divider">
            <span>BUILT FOR BETTER THINKING</span>
          </div>

          <p className="login-note">
            Practice your reasoning. Refine your voice.
            <br />
            Make every argument count.
          </p>

          <p className="demo-note">
            Demo interface — secure authentication is not connected yet.
          </p>
        </div>
      </section>
    </main>
  );
}

