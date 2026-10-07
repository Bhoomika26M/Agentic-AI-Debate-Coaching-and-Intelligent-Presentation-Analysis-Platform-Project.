import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const FEATURES = [
  { icon: '🧠', title: 'AI Argument Analysis',      desc: 'Get your arguments evaluated for clarity, evidence strength, and logical consistency using advanced NLP.' },
  { icon: '🔍', title: 'Fallacy Detection',          desc: 'Spot ad hominem, straw man, slippery slope, and 8+ other logical fallacies in real-time.' },
  { icon: '⚡', title: 'Counterargument Engine',     desc: 'Generate powerful rebuttals and counterpoints against any position to sharpen your debate edge.' },
  { icon: '🎤', title: 'Presentation Analytics',     desc: 'Analyze speech pace, filler words, confidence, and audience engagement scores.' },
  { icon: '🤖', title: 'AI Debate Simulation',       desc: 'Practice against an AI opponent in 6 debate formats with dynamic, adaptive challenges.' },
  { icon: '📈', title: 'Personalized Coaching',      desc: 'Receive tailored skill development plans and coaching insights based on your performance.' },
]

const STATS = [
  { value: '6+',    label: 'Debate Formats' },
  { value: '8',     label: 'Fallacy Types Detected' },
  { value: '4',     label: 'User Roles' },
  { value: '100%',  label: 'AI Powered' },
]

export default function Landing() {
  const { user } = useAuth()
  const navigate = useNavigate()

  return (
    <>
      {/* ── Hero ─────────────────────────────────────────────── */}
      <section className="landing-hero">
        <div className="hero-orb hero-orb-1" />
        <div className="hero-orb hero-orb-2" />
        <div className="hero-orb hero-orb-3" />

        {/* Top Nav */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '20px 40px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 24 }}>🧠</span>
            <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '1.1rem' }}>
              DebateCoach <span style={{ color: 'var(--brand-secondary)' }}>AI</span>
            </span>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            {user ? (
              <button className="btn btn-primary btn-sm" onClick={() => navigate('/dashboard')}>
                Go to Dashboard →
              </button>
            ) : (
              <>
                <Link to="/login"  className="btn btn-ghost btn-sm">Sign In</Link>
                <Link to="/signup" className="btn btn-primary btn-sm">Get Started</Link>
              </>
            )}
          </div>
        </div>

        {/* Hero Content */}
        <div className="hero-badge">
          <span>✨</span> Agentic AI-Powered Platform
        </div>

        <h1 className="hero-title">
          Master the Art of{' '}
          <span className="gradient-text">Debate & Persuasion</span>
        </h1>

        <p className="hero-subtitle">
          An AI-powered coaching platform that analyzes arguments, detects logical fallacies,
          generates counterarguments, and coaches you toward debate excellence.
        </p>

        <div className="hero-actions">
          {user ? (
            <button className="btn btn-primary btn-lg" onClick={() => navigate('/dashboard')}>
              Open Dashboard →
            </button>
          ) : (
            <>
              <Link to="/signup" className="btn btn-primary btn-lg animate-pulse-glow">
                Start for Free
              </Link>
              <Link to="/login" className="btn btn-secondary btn-lg">
                Sign In
              </Link>
            </>
          )}
        </div>

        {/* Stats */}
        <div style={{
          display: 'flex', gap: 40, marginTop: 60, flexWrap: 'wrap', justifyContent: 'center',
          animation: 'fadeIn 0.7s ease 0.4s both',
        }}>
          {STATS.map(({ value, label }) => (
            <div key={label} style={{ textAlign: 'center' }}>
              <div style={{ fontFamily: 'var(--font-heading)', fontSize: '2rem', fontWeight: 800, color: 'var(--text-primary)' }}>{value}</div>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: 2 }}>{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features ─────────────────────────────────────────── */}
      <section className="features-section">
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <h2>Everything you need to <span className="gradient-text">win any debate</span></h2>
          <p style={{ marginTop: 10, color: 'var(--text-secondary)' }}>
            From AI-powered analysis to real-time coaching — all in one platform.
          </p>
        </div>
        <div className="grid-3">
          {FEATURES.map(({ icon, title, desc }) => (
            <div key={title} className="feature-card">
              <div className="feature-icon">{icon}</div>
              <h3 className="feature-title">{title}</h3>
              <p className="feature-desc">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────── */}
      <section style={{ textAlign: 'center', padding: '80px 24px 60px' }}>
        <div style={{
          display: 'inline-block', padding: '60px 80px',
          background: 'linear-gradient(135deg, rgba(108,99,255,0.1), rgba(167,139,250,0.05))',
          border: '1px solid var(--border-medium)', borderRadius: 'var(--radius-xl)',
        }}>
          <h2 style={{ marginBottom: 12 }}>Ready to debate smarter?</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 28 }}>
            Join as a Learner, Coach, Educator, or Admin.
          </p>
          <Link to="/signup" className="btn btn-primary btn-lg">
            Create Your Account →
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ padding: '24px', textAlign: 'center', borderTop: '1px solid var(--border-subtle)', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
        © {new Date().getFullYear()} DebateCoach AI — Internship Project
      </footer>
    </>
  )
}
