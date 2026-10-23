
import { useState } from "react";
import "./App.css";

const API_URL = "http://127.0.0.1:8000";

function App() {
  const [activeTab, setActiveTab] = useState("argument");
  const [argument, setArgument] = useState("");
  const [opposingArgument, setOpposingArgument] = useState("");
  const [presentationText, setPresentationText] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [coachingScores, setCoachingScores] = useState({
    argument_score: 80,
    rebuttal_score: 55,
    presentation_score: 90,
    clarity_score: 75,
  });

  // Send a request to the backend API.
  async function callApi(endpoint, body, errorMessage) {
    setLoading(true);
    setError("");
    setResult(null);

    try {
      const response = await fetch(`${API_URL}${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok) {
        const detail = Array.isArray(data.detail)
          ? data.detail.map((item) => item.msg).join(", ")
          : data.detail;

        throw new Error(detail || errorMessage);
      }

      setResult(data);
    } catch (err) {
      setError(
        err.message ||
          "Could not connect to the backend. Make sure FastAPI is running."
      );
    } finally {
      setLoading(false);
    }
  }

  // Analyze an argument.
  function analyzeArgument() {
    if (argument.trim().length < 10) {
      setError("Please enter at least 10 characters.");
      setResult(null);
      return;
    }

    callApi(
      "/api/v1/arguments/analyze",
      { text: argument.trim() },
      "Argument analysis failed."
    );
  }

  // Generate an AI-powered rebuttal.
  function generateRebuttal() {
    if (opposingArgument.trim().length < 10) {
      setError(
        "Please enter an opposing argument of at least 10 characters."
      );
      setResult(null);
      return;
    }

    callApi(
      "/api/v1/rebuttals/generate",
      { argument: opposingArgument.trim() },
      "Rebuttal generation failed."
    );
  }

  // Analyze a presentation script.
  function analyzePresentationScript() {
    if (!presentationText.trim()) {
      setError("Please enter your presentation script.");
      setResult(null);
      return;
    }

    callApi(
      "/api/v1/presentations/analyze",
      { text: presentationText.trim() },
      "Presentation analysis failed."
    );
  }

  // Generate personalized coaching.
  function generateCoaching() {
    callApi(
      "/api/v1/coaching/generate",
      coachingScores,
      "Coaching generation failed."
    );
  }

  // Change tabs and clear previous results.
  function changeTab(tab) {
    setActiveTab(tab);
    setResult(null);
    setError("");
  }

  // Format API keys as readable headings.
  function formatKey(key) {
    return key
      .replaceAll("_", " ")
      .replace(/\b\w/g, (character) =>
        character.toUpperCase()
      );
  }

  // Format ordinary API values.
  function formatValue(value) {
    if (Array.isArray(value)) {
      return value.length
        ? value
            .map((item) =>
              typeof item === "object" && item !== null
                ? JSON.stringify(item)
                : String(item)
            )
            .join(", ")
        : "None identified";
    }

    if (typeof value === "object" && value !== null) {
      return JSON.stringify(value, null, 2);
    }

    return String(value ?? "Not available");
  }

  // Display detected fallacies.
  function renderFallacies(fallacies) {
    if (!Array.isArray(fallacies) || fallacies.length === 0) {
      return <p>None identified.</p>;
    }

    return (
      <div className="fallacy-list">
        {fallacies.map((fallacy, index) => (
          <div
            className="fallacy-card"
            key={`${fallacy.name || "fallacy"}-${index}`}
          >
            <strong className="fallacy-name">
              {fallacy.name || "Possible fallacy"}
            </strong>

            <p className="fallacy-explanation">
              {fallacy.explanation ||
                "No explanation available."}
            </p>

            {fallacy.evidence && (
              <div className="fallacy-evidence">
                <strong>Evidence</strong>
                <p>“{fallacy.evidence}”</p>
              </div>
            )}
          </div>
        ))}
      </div>
    );
  }

  // Display filler word counts.
  function renderFillerWords(fillerWords) {
    if (
      !fillerWords ||
      typeof fillerWords !== "object" ||
      Array.isArray(fillerWords)
    ) {
      return <p>No filler-word data available.</p>;
    }

    const entries = Object.entries(fillerWords);

    if (entries.length === 0) {
      return <p>No common filler words detected.</p>;
    }

    return (
      <ul className="feedback-list filler-word-list">
        {entries.map(([word, count]) => (
          <li key={word}>
            <strong>{word}</strong>
            <span>
              {count} {count === 1 ? "occurrence" : "occurrences"}
            </span>
          </li>
        ))}
      </ul>
    );
  }

  // Display feedback lists.
  function renderFeedback(feedback) {
    if (Array.isArray(feedback)) {
      if (feedback.length === 0) {
        return <p>No additional feedback available.</p>;
      }

      return (
        <ul className="feedback-list">
          {feedback.map((item, index) => (
            <li key={index}>{String(item)}</li>
          ))}
        </ul>
      );
    }

    if (typeof feedback === "string" && feedback.trim()) {
      return <p>{feedback}</p>;
    }

    return <p>No additional feedback available.</p>;
  }

  // Display presentation score.
  function renderPresentationScore(value) {
    const score = Math.max(
      0,
      Math.min(100, Number(value) || 0)
    );

    return (
      <div className="presentation-score-card">
        <div className="presentation-score-top">
          <span className="presentation-score-number">
            {score}
          </span>

          <span className="presentation-score-total">
            / 100
          </span>
        </div>

        <div
          className="presentation-score-track"
          role="progressbar"
          aria-label="Presentation script score"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={score}
        >
          <div
            className="presentation-score-fill"
            style={{ width: `${score}%` }}
          />
        </div>

        <p className="presentation-score-caption">
          Rule-based script score. Review the score notes
          to understand the deductions.
        </p>
      </div>
    );
  }

  // Choose the correct display for each API response field.
  function renderResultValue(key, value) {
    if (key === "possible_fallacies") {
      return renderFallacies(value);
    }

    if (key === "filler_words") {
      return renderFillerWords(value);
    }

    if (key === "feedback" || key === "score_notes") {
      return renderFeedback(value);
    }

    if (key === "presentation_score") {
      return renderPresentationScore(value);
    }

    return <p>{formatValue(value)}</p>;
  }

  // Display the rebuttal in a dedicated layout.
  function renderRebuttalResult() {
    return (
      <>
        <div className="result-item">
          <h4>Original Argument</h4>
          <p>{result.original_argument || "Not available"}</p>
        </div>

        <div className="result-item">
          <h4>Debate Strategy</h4>
          <p>{result.strategy || "Not available"}</p>
        </div>

        <div className="result-item">
          <h4>Generated Rebuttal</h4>
          <p className="rebuttal-text">
            {result.rebuttal || "No rebuttal was returned."}
          </p>
        </div>

        <div className="result-item">
          <h4>AI Model</h4>
          <p>
            {result.analysis_method === "ollama"
              ? "Ollama — local AI model"
              : result.analysis_method === "rule_based_fallback"
                ? "Rule-based fallback"
                : result.analysis_method || "Not specified"}
          </p>
        </div>

        <div className="result-item">
          <h4>Important Note</h4>
          <p>
            {result.limitations ||
              "Review the rebuttal and verify factual claims before relying on them."}
          </p>
        </div>
      </>
    );
  }

  return (
    <div className="app-shell">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-icon">D</div>

          <div>
            <h2>DebateIQ</h2>
            <span>AI COACHING STUDIO</span>
          </div>
        </div>

        <div className="nav-label">WORKSPACE</div>

        <button
          className={`nav-item ${
            activeTab === "argument" ? "active" : ""
          }`}
          onClick={() => changeTab("argument")}
        >
          <span className="nav-icon">◈</span>
          Argument Analysis
        </button>

        <button
          className={`nav-item ${
            activeTab === "rebuttal" ? "active" : ""
          }`}
          onClick={() => changeTab("rebuttal")}
        >
          <span className="nav-icon">↗</span>
          Rebuttal Generator
        </button>

        <button
          className={`nav-item ${
            activeTab === "presentation" ? "active" : ""
          }`}
          onClick={() => changeTab("presentation")}
        >
          <span className="nav-icon">▤</span>
          Presentation Coach
        </button>

        <button
          className={`nav-item ${
            activeTab === "coaching" ? "active" : ""
          }`}
          onClick={() => changeTab("coaching")}
        >
          <span className="nav-icon">✦</span>
          Personalized Coaching
        </button>

        <div className="sidebar-bottom">
          <div className="coach-card">
            <div className="coach-symbol">✦</div>

            <h3>Your personal debate coach</h3>

            <p>
              Build stronger arguments, think critically,
              and speak with confidence.
            </p>
          </div>

          <div className="profile">
            <div className="avatar">O</div>

            <div>
              <strong>Debate Learner</strong>
              <span>Personal workspace</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="main-content">
        <header className="topbar">
          <div className="breadcrumb">
            Workspace <span>/</span> Coaching Studio
          </div>

          <div className="status">
            <span className="status-dot"></span>
            Local workspace
          </div>
        </header>

        {/* Welcome section */}
        <section className="welcome">
          <div className="eyebrow">
            <span>✦</span> THINK CLEARER. SPEAK STRONGER.
          </div>

          <h1>
            Turn your ideas into{" "}
            <span>strong arguments.</span>
          </h1>

          <p>
            Your AI-powered space to sharpen reasoning,
            develop rebuttals, and become a more confident
            communicator.
          </p>
        </section>

        {/* Feature cards */}
        <section className="feature-grid">
          <button
            className={`feature-card ${
              activeTab === "argument" ? "selected" : ""
            }`}
            onClick={() => changeTab("argument")}
          >
            <div className="feature-icon purple">◈</div>

            <div className="feature-title">
              Argument Analysis <span>↗</span>
            </div>

            <p>
              Examine your reasoning and uncover possible
              logical fallacies.
            </p>

            <div className="feature-link">
              Analyze an argument →
            </div>
          </button>

          <button
            className={`feature-card ${
              activeTab === "rebuttal" ? "selected" : ""
            }`}
            onClick={() => changeTab("rebuttal")}
          >
            <div className="feature-icon orange">↗</div>

            <div className="feature-title">
              Rebuttal Generator <span>↗</span>
            </div>

            <p>
              Explore ways to challenge opposing claims
              with clear reasoning.
            </p>

            <div className="feature-link">
              Build a rebuttal →
            </div>
          </button>

          <button
            className={`feature-card ${
              activeTab === "presentation" ? "selected" : ""
            }`}
            onClick={() => changeTab("presentation")}
          >
            <div className="feature-icon green">▤</div>

            <div className="feature-title">
              Presentation Coach <span>↗</span>
            </div>

            <p>
              Prepare to communicate your ideas clearly
              and confidently.
            </p>

            <div className="feature-link">
              Explore coaching →
            </div>
          </button>

          <button
            className={`feature-card ${
              activeTab === "coaching" ? "selected" : ""
            }`}
            onClick={() => changeTab("coaching")}
          >
            <div className="feature-icon purple">✦</div>

            <div className="feature-title">
              Personalized Coaching <span>↗</span>
            </div>

            <p>
              Discover your strengths and get a
              personalized improvement plan.
            </p>

            <div className="feature-link">
              Get coaching →
            </div>
          </button>
        </section>

        {/* Workspace panel */}
        <section className="workspace-panel">
          <div className="panel-heading">
            <div>
              <div className="eyebrow">YOUR WORKSPACE</div>

              <h2>
                {activeTab === "argument" &&
                  "Analyze your argument"}

                {activeTab === "rebuttal" &&
                  "Build your rebuttal"}

                {activeTab === "presentation" &&
                  "Presentation coaching"}

                {activeTab === "coaching" &&
                  "Your personalized coaching plan"}
              </h2>
            </div>

            <span className="beta-badge">BETA</span>
          </div>

          {/* Argument Analysis */}
          {activeTab === "argument" && (
            <>
              <label htmlFor="argument">
                YOUR ARGUMENT
              </label>

              <textarea
                id="argument"
                value={argument}
                onChange={(event) =>
                  setArgument(event.target.value)
                }
                placeholder="Enter your argument here... For example: Schools should start later because students need enough sleep to concentrate and learn effectively."
                maxLength={10000}
              />

              <div className="input-footer">
                <span>
                  {argument.length} / 10,000 characters
                </span>

                <span>✦ Critical reasoning</span>
              </div>

              <button
                className="primary-button"
                onClick={analyzeArgument}
                disabled={loading}
              >
                {loading
                  ? "Analyzing..."
                  : "✦ Analyze argument"}
              </button>
            </>
          )}

          {/* Rebuttal Generator */}
          {activeTab === "rebuttal" && (
            <>
              <label htmlFor="opposing">
                OPPOSING ARGUMENT
              </label>

              <textarea
                id="opposing"
                value={opposingArgument}
                onChange={(event) =>
                  setOpposingArgument(event.target.value)
                }
                placeholder="Enter the argument you want to respond to..."
                maxLength={10000}
              />

              <div className="input-footer">
                <span>
                  {opposingArgument.length} / 10,000 characters
                </span>

                <span>✦ Constructive reasoning</span>
              </div>

              <button
                className="primary-button"
                onClick={generateRebuttal}
                disabled={loading}
              >
                {loading
                  ? "Generating..."
                  : "✦ Generate rebuttal"}
              </button>
            </>
          )}

          {/* Presentation Coach */}
          {activeTab === "presentation" && (
            <>
              <label htmlFor="presentation">
                YOUR PRESENTATION SCRIPT
              </label>

              <textarea
                id="presentation"
                value={presentationText}
                onChange={(event) =>
                  setPresentationText(event.target.value)
                }
                placeholder="Paste your speech or presentation script here..."
                maxLength={10000}
              />

              <div className="input-footer">
                <span>
                  {presentationText.length} / 10,000 characters
                </span>

                <span>✦ Speaking practice</span>
              </div>

              <button
                className="primary-button"
                onClick={analyzePresentationScript}
                disabled={loading}
              >
                {loading
                  ? "Analyzing presentation..."
                  : "✦ Analyze presentation"}
              </button>
            </>
          )}

          {/* Personalized Coaching */}
          {activeTab === "coaching" && (
            <>
              <p>
                Rate your current performance from 0 to 100
                in each category to receive tailored feedback.
              </p>

              {[
                {
                  key: "argument_score",
                  label: "Argument Quality",
                },
                {
                  key: "rebuttal_score",
                  label: "Rebuttal Effectiveness",
                },
                {
                  key: "presentation_score",
                  label: "Presentation Delivery",
                },
                {
                  key: "clarity_score",
                  label: "Structure and Clarity",
                },
              ].map((item) => (
                <div className="coaching-input" key={item.key}>
                  <label htmlFor={item.key}>
                    {item.label}: {coachingScores[item.key]}/100
                  </label>

                  <input
                    id={item.key}
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={coachingScores[item.key]}
                    onChange={(event) =>
                      setCoachingScores((previous) => ({
                        ...previous,
                        [item.key]: Number(event.target.value),
                      }))
                    }
                  />
                </div>
              ))}

              <button
                className="primary-button"
                onClick={generateCoaching}
                disabled={loading}
              >
                {loading
                  ? "Generating coaching..."
                  : "✦ Generate Coaching"}
              </button>
            </>
          )}

          {/* Error message */}
          {error && (
            <div className="error-message" role="alert">
              {error}
            </div>
          )}

          {/* API results */}
          {result && (
            <div className="result-panel">
              <div className="result-heading">
                <span className="result-check">✓</span>

                <div>
                  <h3>
                    {activeTab === "rebuttal"
                      ? "Your AI-generated rebuttal"
                      : "Analysis results"}
                  </h3>

                  <p>
                    {result.analysis_method === "ollama"
                      ? "Generated using your local AI model"
                      : "Generated by your current backend"}
                  </p>
                </div>
              </div>

              {activeTab === "rebuttal" ? (
                renderRebuttalResult()
              ) : (
                Object.entries(result).map(([key, value]) => (
                  <div className="result-item" key={key}>
                    <h4>{formatKey(key)}</h4>
                    {renderResultValue(key, value)}
                  </div>
                ))
              )}
            </div>
          )}
        </section>

        {/* Footer */}
        <footer className="footer">
          <span>
            DebateIQ · Agentic AI Debate Coaching Platform
          </span>

          <span>
            Built for clearer thinking{" "}
            <span className="footer-star">✦</span>
          </span>
        </footer>
      </main>
    </div>
  );
}

export default App;
