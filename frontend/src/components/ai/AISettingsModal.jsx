import { useState } from 'react'
import api from '../../api/client'

/**
 * AISettingsModal Component
 * =========================
 * Provides an interactive control panel for managing the Agentic AI Engine.
 * Allows evaluators and students to:
 * 1. View the active AI Provider (Google Gemini, OpenAI, or Local Heuristic Engine)
 * 2. Test API keys with live latency & response validation
 * 3. Understand how the agent reasons on arbitrary debate questions
 */
export default function AISettingsModal({ isOpen, onClose, aiStatus, onStatusRefresh }) {
  const [apiKey, setApiKey] = useState('')
  const [provider, setProvider] = useState('gemini')
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState(null)

  if (!isOpen) return null

  const handleTestConnection = async (e) => {
    e.preventDefault()
    if (!apiKey.trim()) {
      setTestResult({ success: false, message: 'Please enter an API key to test.' })
      return
    }
    setTesting(true)
    setTestResult(null)
    try {
      const res = await api.post('/analysis/ai-test', {
        api_key: apiKey.trim(),
        provider: provider
      })
      setTestResult(res.data)
      if (res.data.success && onStatusRefresh) {
        onStatusRefresh()
      }
    } catch (err) {
      setTestResult({
        success: false,
        message: err.response?.data?.detail || 'Connection test failed. Check internet access or key validity.'
      })
    } finally {
      setTesting(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 600 }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: '1.4rem' }}>🤖</span>
            <h2>Agentic AI Configuration</h2>
          </div>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        {/* Status Banner */}
        <div style={{
          padding: '14px 16px',
          borderRadius: 'var(--radius-md)',
          background: aiStatus?.active ? 'rgba(47,125,91,0.08)' : 'rgba(179,107,50,0.08)',
          border: `1px solid ${aiStatus?.active ? 'rgba(47,125,91,0.25)' : 'rgba(179,107,50,0.25)'}`,
          marginBottom: 20
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <strong style={{ color: aiStatus?.active ? 'var(--brand-success)' : 'var(--brand-accent)' }}>
                {aiStatus?.active ? '● Agentic AI Reasoning Active' : '○ Local Heuristic Fallback Mode'}
              </strong>
              <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                {aiStatus?.active
                  ? `Active Provider: ${aiStatus?.provider?.toUpperCase()} (${aiStatus?.model})`
                  : 'Running locally with rule-based heuristics & regex patterns. Add an API key to enable live reasoning on ANY topic.'}
              </p>
            </div>
            <span className={`badge ${aiStatus?.active ? 'badge-success' : 'badge-warning'}`}>
              {aiStatus?.mode || 'Heuristic'}
            </span>
          </div>
        </div>

        {/* Explanatory Guide */}
        <div style={{ marginBottom: 20, fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
          <p style={{ margin: 0 }}>
            <strong>Why use an AI API key for demonstrations?</strong><br />
            This project is categorized under <strong>Agentic AI</strong>. When an API key (e.g. Google Gemini or OpenAI)
            is connected, the platform dynamically parses <em>any custom motion</em>, uncovers subtle rhetorical fallacies,
            adopts sparring debater personas, and generates 5 distinct rebuttal angles tailored to the exact topic.
          </p>
        </div>

        {/* API Key Tester Form */}
        <form onSubmit={handleTestConnection} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="form-group">
            <label style={{ fontSize: '0.82rem', fontWeight: 600 }}>SELECT AI PROVIDER</label>
            <div style={{ display: 'flex', gap: 12 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: '0.9rem' }}>
                <input
                  type="radio"
                  name="provider"
                  value="gemini"
                  checked={provider === 'gemini'}
                  onChange={() => setProvider('gemini')}
                />
                Google Gemini API (Recommended)
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: '0.9rem' }}>
                <input
                  type="radio"
                  name="provider"
                  value="openai"
                  checked={provider === 'openai'}
                  onChange={() => setProvider('openai')}
                />
                OpenAI API / Compatible
              </label>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="ai-key-input" style={{ fontSize: '0.82rem', fontWeight: 600 }}>
              TEST API KEY (LIVE VALIDATION)
            </label>
            <input
              id="ai-key-input"
              type="password"
              className="input"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={provider === 'gemini' ? 'AIzaSy...' : 'sk-...'}
            />
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              To persist permanently for backend services, paste into <code>backend/.env</code>: <code>GEMINI_API_KEY=...</code>
            </span>
          </div>

          {testResult && (
            <div className={`alert ${testResult.success ? 'alert-success' : 'alert-error'}`}>
              {testResult.success ? '✓ ' : '⚠ '} {testResult.message}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 6 }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Close
            </button>
            <button type="submit" className="btn btn-primary" disabled={testing}>
              {testing ? <span className="spinner" /> : '⚡ Test Connection'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

