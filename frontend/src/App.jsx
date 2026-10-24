
import { useState } from "react";
import "./App.css";
import Login from "./Login";

const API_URL = "http://127.0.0.1:8000";

const FEATURES = [
  {
    id: "argument",
    title: "Argument Analysis",
    description: "Evaluate reasoning and identify possible logical fallacies.",
    icon: "◈",
    color: "purple",
    action: "Analyze an argument",
  },
  {
    id: "rebuttal",
    title: "Rebuttal Generator",
    description: "Build thoughtful responses to opposing arguments.",
    icon: "↗",
    color: "orange",
    action: "Generate a rebuttal",
  },
  {
    id: "presentation",
    title: "Presentation Coach",
    description: "Review your script and improve the clarity of your message.",
    icon: "▤",
    color: "green",
    action: "Review a presentation",
  },
  {
    id: "coaching",
    title: "Personalized Coaching",
    description: "Turn your performance scores into an improvement plan.",
    icon: "✦",
    color: "blue",
    action: "Get personalized coaching",
  },
];

const INITIAL_SCORES = {
  argument_score: 80,
  rebuttal_score: 55,
  presentation_score: 90,
  clarity_score: 75,
};

function formatKey(key) {
  return key
    .replaceAll("_", " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function formatValue(value) {
  if (value === null || value === undefined) {
    return "Not available";
  }

  if (Array.isArray(value)) {
    if (value.length === 0) return "None identified";

    return value
      .map((item) =>
        typeof item === "object" && item !== null
          ? JSON.stringify(item)
          : String(item)
      )
      .join(", ");
  }

  if (typeof value === "object") {
    return JSON.stringify(value, null, 2);
  }

  return String(value);
}

function App() {
  // Login
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userEmail, setUserEmail] = useState("");

  // Dashboard
  const [activeTab, setActiveTab] = useState("argument");
  const [argument, setArgument] = useState("");
  const [opposingArgument, setOpposingArgument] = useState("");
  const [presentationText, setPresentationText] = useState("");
  const [coachingScores, setCoachingScores] = useState(INITIAL_SCORES);

  // API state
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Session statistics and activity
  const [stats, setStats] = useState({
    argument: 0,
    rebuttal: 0,
    presentation: 0,
    coaching: 0,
  });

  const [activity, setActivity] = useState([]);

  if (!isLoggedIn) {
    return (
      <Login
        onLogin={({ email }) => {
          setUserEmail(email);
          setIsLoggedIn(true);
        }}
      />
    );
  }

  function changeTab(tab) {
    setActiveTab(tab);
    setResult(null);
    setError("");
  }

  async function callApi(endpoint, body) {
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

        throw new Error(
          typeof detail === "string"
            ? detail
            : "The request could not be completed."
        );
      }

      setResult(data);

      const feature = endpoint.includes("/arguments/")
        ? "argument"
        : endpoint.includes("/rebuttals/")
          ? "rebuttal"
          : endpoint.includes("/presentations/")
            ? "presentation"
            : endpoint.includes("/coaching/")
              ? "coaching"
              : null;

      if (feature) {
        const labels = {
          argument: "Argument analysis completed",
          rebuttal: "AI rebuttal generated",
          presentation: "Presentation reviewed",
          coaching: "Coaching plan generated",
        };

        setStats((previous) => ({
          ...previous,
          [feature]: previous[feature] + 1,
        }));

        setActivity((previous) =>
          [
            {
              id: `${Date.now()}-${Math.random()}`,
              title: labels[feature],
              feature,
              time: new Date().toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              }),
            },
            ...previous,
          ].slice(0, 5)
        );
      }
    } catch (err) {
      setError(
        err.message ||
          "Could not connect to the backend. Make sure FastAPI is running."
      );
    } finally {
      setLoading(false);
    }
  }

  function analyzeArgument() {
    if (argument.trim().length < 10) {
      setError("Please enter an argument containing at least 10 characters.");
      setResult(null);
      return;
    }

    callApi("/api/v1/arguments/analyze", {
      text: argument.trim(),
    });
  }

  function generateRebuttal() {
    if (opposingArgument.trim().length < 10) {
      setError(
        "Please enter an opposing argument containing at least 10 characters."
      );
      setResult(null);
      return;
    }

    callApi("/api/v1/rebuttals/generate", {
      argument: opposingArgument.trim(),
    });
  }

  function analyzePresentation() {
    if (presentationText.trim().length < 10) {
      setError("Please enter a presentation script of at least 10 characters.");
      setResult(null);
      return;
    }

    callApi("/api/v1/presentations/analyze", {
      text: presentationText.trim(),
    });
  }

  function generateCoaching() {
    callApi("/api/v1/coaching/generate", coachingScores);
  }

  function signOut() {
    setIsLoggedIn(false);
    setUserEmail("");
    setResult(null);
    setError("");
    setActiveTab("argument");
    setArgument("");
    setOpposingArgument("");
    setPresentationText("");
    setCoachingScores(INITIAL_SCORES);
    setStats({
      argument: 0,
      rebuttal: 0,
      presentation: 0,
      coaching: 0,
    });
    setActivity([]);
  }

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

            {fallacy.explanation && <p>{fallacy.explanation}</p>}

            {fallacy.evidence && (
              <p className="fallacy-evidence">
                <strong>Evidence: </strong>
                {fallacy.evidence}
              </p>
            )}
          </div>
        ))}
      </div>
    );
  }

  function renderFeedback(value) {
    if (Array.isArray(value)) {
      if (value.length === 0) return <p>No additional feedback available.</p>;

      return (
        <ul className="feedback-list">
          {value.map((item, index) => (
            <li key={index}>
              {typeof item === "object" && item !== null
                ? JSON.stringify(item)
                : String(item)}
            </li>
          ))}
        </ul>
      );
    }

    return <p>{formatValue(value)}</p>;
  }

  function renderResultValue(key, value) {
    if (key === "possible_fallacies" || key === "fallacies") {
      return renderFallacies(value);
    }

    if (key === "feedback" || key === "score_notes") {
      return renderFeedback(value);
    }

    if (key === "filler_words" && value && typeof value === "object") {
      return (
        <div className="filler-word-list">
          {Object.entries(value).map(([word, count]) => (
            <div className="filler-word-row" key={word}>
              <span>{word}</span>
              <strong>{formatValue(count)}</strong>
            </div>
          ))}
        </div>
      );
    }

    if (key === "presentation_score" && Number.isFinite(Number(value))) {
      const score = Math.max(0, Math.min(100, Number(value)));

      return (
        <div>
          <div className="score-display">
            {score}
            <span>/ 100</span>
          </div>
          <div className="score-track">
            <div
              className="score-fill"
              style={{ width: `${score}%` }}
            />
          </div>
        </div>
      );
    }

    return <p>{formatValue(value)}</p>;
  }

  function renderRebuttalResult() {
    const fields = [
      ["original_argument", "Original Argument"],
      ["strategy", "Debate Strategy"],
      ["rebuttal", "Generated Rebuttal"],
      ["analysis_method", "AI Model"],
      ["limitations", "Limitations"],
    ];

    const shownKeys = new Set();

    return (
      <>
        {fields.map(([key, label]) => {
          if (result[key] === undefined || result[key] === null) {
            return null;
          }

          shownKeys.add(key);

          return (
            <div className="result-item" key={key}>
              <h4>{label}</h4>
              {key === "analysis_method" ? (
                <p>
                  {result[key] === "ollama"
                    ? "Ollama — local AI model"
                    : formatValue(result[key])}
                </p>
              ) : (
                renderResultValue(key, result[key])
              )}
            </div>
          );
        })}

        {Object.entries(result)
          .filter(([key]) => !shownKeys.has(key))
          .map(([key, value]) => (
            <div className="result-item" key={key}>
              <h4>{formatKey(key)}</h4>
              {renderResultValue(key, value)}
            </div>
          ))}
      </>
    );
  }

  const totalActivities = Object.values(stats).reduce(
    (total, count) => total + count,
    0
  );

  const currentFeature = FEATURES.find((feature) => feature.id === activeTab);

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-icon">D</div>
          <div className="brand-text">
            <h2>DebateIQ</h2>
            <span>AI COACHING STUDIO</span>
          </div>
        </div>

        <div className="nav-label">WORKSPACE</div>

        {FEATURES.map((feature) => (
          <button
            key={feature.id}
            className={`nav-item ${
              activeTab === feature.id ? "active" : ""
            }`}
            onClick={() => changeTab(feature.id)}
          >
            <span className="nav-icon">{feature.icon}</span>
            {feature.title}
          </button>
        ))}

        <div className="sidebar-bottom">
          <div className="coach-card">
            <div className="coach-symbol">✦</div>
            <h3>Your personal debate coach</h3>
            <p>
              Practice critical thinking and build stronger arguments, one
              session at a time.
            </p>
          </div>

          <div className="profile">
            <div className="avatar">
              {(userEmail[0] || "D").toUpperCase()}
            </div>
            <div className="profile-info">
              <strong>{userEmail}</strong>
              <span>Personal workspace</span>
            </div>
          </div>

          <button className="nav-item sign-out-button" onClick={signOut}>
            <span className="nav-icon">↪</span>
            Sign out
          </button>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div>
            <div className="breadcrumb">
              Workspace <span>/</span> Overview
            </div>
          </div>

          <div className="topbar-right">
            <div className="status">
              <span className="status-dot" />
              Local workspace
            </div>
            <div className="top-avatar">
              {(userEmail[0] || "D").toUpperCase()}
            </div>
          </div>
        </header>

        <section className="welcome">
          <div className="eyebrow">
            <span>✦</span> YOUR AI DEBATE WORKSPACE
          </div>

          <h1>
            Think sharper.
            <br />
            <span>Speak smarter.</span>
          </h1>

          <p>
            Welcome back! Strengthen your reasoning, develop compelling
            rebuttals, and become a more confident communicator.
          </p>
        </section>

        <section className="section-heading">
          <div>
            <h2>Your overview</h2>
            <p>A snapshot of your activity in this session.</p>
          </div>
          <span className="session-badge">SESSION STATS</span>
        </section>

        <section className="stats-grid">
          {[
            {
              label: "Arguments analyzed",
              value: stats.argument,
              icon: "◈",
              color: "purple",
              caption: "Successful analyses",
            },
            {
              label: "Rebuttals generated",
              value: stats.rebuttal,
              icon: "↗",
              color: "orange",
              caption: "Responses created",
            },
            {
              label: "Presentations reviewed",
              value: stats.presentation,
              icon: "▤",
              color: "green",
              caption: "Scripts reviewed",
            },
            {
              label: "Coaching sessions",
              value: stats.coaching,
              icon: "✦",
              color: "blue",
              caption: "Plans generated",
            },
          ].map((item) => (
            <div className="stat-card" key={item.label}>
              <div className="stat-top">
                <span className="stat-label">{item.label}</span>
                <span className={`stat-icon ${item.color}`}>
                  {item.icon}
                </span>
              </div>
              <div className="stat-number">{item.value}</div>
              <div className="stat-caption">{item.caption}</div>
            </div>
          ))}
        </section>

        <section className="section-heading">
          <div>
            <h2>AI tools</h2>
            <p>Choose a workspace to get started.</p>
          </div>
        </section>

        <section className="feature-grid">
          {FEATURES.map((feature) => (
            <button
              key={feature.id}
              className={`feature-card ${
                activeTab === feature.id ? "selected" : ""
              }`}
              onClick={() => changeTab(feature.id)}
            >
              <div className={`feature-icon ${feature.color}`}>
                {feature.icon}
              </div>
              <div className="feature-title">
                {feature.title}
                <span>↗</span>
              </div>
              <p>{feature.description}</p>
              <div className="feature-link">{feature.action} →</div>
            </button>
          ))}
        </section>

        <section className="workspace-panel">
          <div className="panel-heading">
            <div>
              <div className="eyebrow">YOUR WORKSPACE</div>
              <h2>{currentFeature?.title || "AI Workspace"}</h2>
              <p>{currentFeature?.description}</p>
            </div>
            <span className="beta-badge">BETA</span>
          </div>

          {activeTab === "argument" && (
            <>
              <label htmlFor="argument">YOUR ARGUMENT</label>
              <textarea
                id="argument"
                value={argument}
                onChange={(event) => setArgument(event.target.value)}
                placeholder="For example: Schools should start later because students need enough sleep to concentrate and learn effectively."
                maxLength={10000}
              />
              <div className="input-footer">
                <span>{argument.length} / 10,000 characters</span>
                <span>✦ Critical reasoning</span>
              </div>
              <button
                className="primary-button"
                onClick={analyzeArgument}
                disabled={loading}
              >
                {loading ? "Analyzing..." : "✦ Analyze argument"}
              </button>
            </>
          )}

          {activeTab === "rebuttal" && (
            <>
              <label htmlFor="opposing">OPPOSING ARGUMENT</label>
              <textarea
                id="opposing"
                value={opposingArgument}
                onChange={(event) => setOpposingArgument(event.target.value)}
                placeholder="Enter the argument you want to challenge..."
                maxLength={10000}
              />
              <div className="input-footer">
                <span>{opposingArgument.length} / 10,000 characters</span>
                <span>✦ Constructive reasoning</span>
              </div>
              <button
                className="primary-button"
                onClick={generateRebuttal}
                disabled={loading}
              >
                {loading ? "Generating..." : "✦ Generate rebuttal"}
              </button>
            </>
          )}

          {activeTab === "presentation" && (
            <>
              <label htmlFor="presentation">YOUR PRESENTATION SCRIPT</label>
              <textarea
                id="presentation"
                value={presentationText}
                onChange={(event) => setPresentationText(event.target.value)}
                placeholder="Paste your presentation or speech script here..."
                maxLength={10000}
              />
              <div className="input-footer">
                <span>{presentationText.length} / 10,000 characters</span>
                <span>✦ Speaking practice</span>
              </div>
              <button
                className="primary-button"
                onClick={analyzePresentation}
                disabled={loading}
              >
                {loading ? "Reviewing..." : "✦ Analyze presentation"}
              </button>
            </>
          )}

          {activeTab === "coaching" && (
            <>
              <p className="coaching-description">
                Rate your current performance in each category to receive
                personalized feedback. Adjust each score from 0 to 100.
              </p>

              {[
                { key: "argument_score", label: "Argument Quality" },
                { key: "rebuttal_score", label: "Rebuttal Effectiveness" },
                {
                  key: "presentation_score",
                  label: "Presentation Delivery",
                },
                { key: "clarity_score", label: "Structure and Clarity" },
              ].map((item) => (
                <div className="coaching-input" key={item.key}>
                  <div className="slider-heading">
                    <label htmlFor={item.key}>{item.label}</label>
                    <span>{coachingScores[item.key]}/100</span>
                  </div>
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
                {loading ? "Building your plan..." : "✦ Generate coaching plan"}
              </button>
            </>
          )}

          {error && (
            <div className="error-message" role="alert">
              <strong>Something went wrong</strong>
              <p>{error}</p>
            </div>
          )}

          {result && (
            <div className="result-panel">
              <div className="result-heading">
                <span className="result-check">✓</span>
                <div>
                  <h3>
                    {activeTab === "rebuttal"
                      ? "Your generated rebuttal"
                      : "Your results"}
                  </h3>
                  <p>
                    {result.analysis_method === "ollama"
                      ? "Processed using your local Ollama model"
                      : "Response received from your backend"}
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

        <section className="activity-panel">
          <div className="activity-header">
            <div>
              <div className="eyebrow">YOUR SESSION</div>
              <h2>Recent activity</h2>
              <p>Your latest successful AI operations.</p>
            </div>
            <span className="activity-count">{totalActivities} completed</span>
          </div>

          {activity.length === 0 ? (
            <div className="empty-activity">
              <div className="empty-activity-icon">✦</div>
              <strong>Your activity will appear here</strong>
              <p>
                Analyze an argument, generate a rebuttal, or try another AI
                tool to get started.
              </p>
            </div>
          ) : (
            <div className="activity-list">
              {activity.map((item) => {
                const feature = FEATURES.find(
                  (entry) => entry.id === item.feature
                );

                return (
                  <div className="activity-item" key={item.id}>
                    <div className={`activity-icon ${feature?.color || "blue"}`}>
                      {feature?.icon || "✦"}
                    </div>
                    <div className="activity-description">
                      <strong>{item.title}</strong>
                      <p>Completed successfully</p>
                    </div>
                    <time>{item.time}</time>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <footer className="footer">
          <span>DebateIQ · AI Debate Coaching Platform</span>
          <span>Think. Question. Convince. <b>✦</b></span>
        </footer>
      </main>
    </div>
  );
}

export default App;
