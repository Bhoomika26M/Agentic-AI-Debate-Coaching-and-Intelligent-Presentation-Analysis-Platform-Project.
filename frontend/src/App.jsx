
import { useEffect, useState } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import "./App.css";

const API_URL = "http://127.0.0.1:8000";



function App() {
  const [mode, setMode] = useState("login");
  const [page, setPage] = useState("Dashboard");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(null);
  const [learningProfile, setLearningProfile] = useState({
  experience_level: "",
  preferred_topics: "",
  presentation_domains: "",
  learning_goals: "",
  coaching_preferences: "",
});

const [profileLoading, setProfileLoading] = useState(false);
const [profileSaving, setProfileSaving] = useState(false);
const [profileMessage, setProfileMessage] = useState("");
const [profileError, setProfileError] = useState("");

const [debateTopic, setDebateTopic] = useState("");
const [debateFormat, setDebateFormat] = useState("Oxford");
const [debatePosition, setDebatePosition] = useState("For");
const [debateSessions, setDebateSessions] = useState([]);
const [debateLoading, setDebateLoading] = useState(false);
const [debateError, setDebateError] = useState("");
const [debateMessage, setDebateMessage] = useState("");

const [skillAssessments, setSkillAssessments] = useState([]);
const [skillsLoading, setSkillsLoading] = useState(false);
const [skillsError, setSkillsError] = useState("");

const [presentations, setPresentations] = useState([]);
const [presentationTitle, setPresentationTitle] = useState("");
const [presentationDomain, setPresentationDomain] = useState("");
const [presentationDuration, setPresentationDuration] = useState("");
const [presentationTranscript, setPresentationTranscript] = useState("");
const [presentationLoading, setPresentationLoading] = useState(false);
const [presentationSaving, setPresentationSaving] = useState(false);
const [presentationError, setPresentationError] = useState("");
const [presentationMessage, setPresentationMessage] = useState("");

const [argumentText, setArgumentText] = useState("");
const [argumentLoading, setArgumentLoading] = useState(false);
const [argumentError, setArgumentError] = useState("");
const [argumentResult, setArgumentResult] = useState(null);



function getAverageSkillScore(field) {
  if (skillAssessments.length === 0) return 0;

  const validScores = skillAssessments
    .map((item) => item[field])
    .filter((score) => score !== null && score !== undefined);

  if (validScores.length === 0) return 0;

  return Number(
    (
      validScores.reduce((total, score) => total + score, 0) /
      validScores.length
    ).toFixed(1)
  );
}


const skillChartData = [
  {
    skill: "Reasoning",
    score: getAverageSkillScore("reasoning_quality"),
  },
  {
    skill: "Evidence",
    score: getAverageSkillScore("evidence_strength"),
  },
  {
    skill: "Logic",
    score: getAverageSkillScore("logical_consistency"),
  },
  {
    skill: "Persuasiveness",
    score: getAverageSkillScore("persuasiveness"),
  },
  {
    skill: "Overall",
    score: getAverageSkillScore("argument_score"),
  },
];



  async function handleSubmit(event) {
    event.preventDefault();
    setMessage("");
    setError("");
    setLoading(true);

    const endpoint =
      mode === "register" ? "/auth/register" : "/auth/login";

    const body =
      mode === "register"
        ? { name, email, password, role: "Learner" }
        : { email, password };

    try {
      const response = await fetch(`${API_URL}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Something went wrong.");
      }

      if (mode === "register") {
        setMessage("Account created! Please log in.");
        setMode("login");
        setPassword("");
      } else {
        sessionStorage.setItem("access_token", data.access_token);

        const profileResponse = await fetch(`${API_URL}/auth/me`, {
          headers: {
            Authorization: `Bearer ${data.access_token}`,
          },
        });

        if (!profileResponse.ok) {
          sessionStorage.removeItem("access_token");
          throw new Error("Could not load your profile.");
        }

        const profile = await profileResponse.json();
setUser(profile);

const dashboardByRole = {
  Learner: "Dashboard",
  "Debate Coach": "Coach Dashboard",
  Educator: "Educator Dashboard",
  Administrator: "Admin Dashboard",
};

setPage(dashboardByRole[profile.role] || "Dashboard");
setPassword("");
      }
    } catch (err) {
      setError(
        err.message === "Failed to fetch"
          ? "Cannot connect to the backend. Check that FastAPI is running."
          : err.message
      );
    } finally {
      setLoading(false);
    }
  }

  function logout() {
    sessionStorage.removeItem("access_token");
    setUser(null);
    setEmail("");
    setPassword("");
    setMessage("");
    setError("");
    setMode("login");
    setPage("Dashboard");
  }

  
useEffect(() => {
  if (!user || page !== "My Profile") return;

  async function loadLearningProfile() {
    setProfileLoading(true);
    setProfileError("");
    setProfileMessage("");

    try {
      const token = sessionStorage.getItem("access_token");

      const response = await fetch(`${API_URL}/profile`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.status === 404) {
        setLearningProfile({
          experience_level: "",
          preferred_topics: "",
          presentation_domains: "",
          learning_goals: "",
          coaching_preferences: "",
        });
        return;
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Could not load learning profile.");
      }

      setLearningProfile({
        experience_level: data.experience_level || "",
        preferred_topics: data.preferred_topics || "",
        presentation_domains: data.presentation_domains || "",
        learning_goals: data.learning_goals || "",
        coaching_preferences: data.coaching_preferences || "",
      });
    } catch (err) {
      setProfileError(err.message);
    } finally {
      setProfileLoading(false);
    }
  }

  loadLearningProfile();
}, [user, page]);


useEffect(() => {
  if (!user || page !== "My Progress") return;

  loadSkillAssessments();
}, [user, page]);


useEffect(() => {
  if (!user || page !== "Presentation Analysis") return;

  loadPresentations();
}, [user, page]);


useEffect(() => {
  if (!user || page !== "Practice Debate") return;

  loadDebateSessions();
}, [user, page]);


async function saveLearningProfile(event) {
  event.preventDefault();
  setProfileSaving(true);
  setProfileError("");
  setProfileMessage("");

  try {
    const token = sessionStorage.getItem("access_token");

    const response = await fetch(`${API_URL}/profile`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(learningProfile),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.detail || "Could not save profile.");
    }

    setLearningProfile({
      experience_level: data.experience_level || "",
      preferred_topics: data.preferred_topics || "",
      presentation_domains: data.presentation_domains || "",
      learning_goals: data.learning_goals || "",
      coaching_preferences: data.coaching_preferences || "",
    });

    setProfileMessage("Learning profile saved successfully!");
  } catch (err) {
    setProfileError(err.message);
  } finally {
    setProfileSaving(false);
  }
}


async function createDebateSession(event) {
  event.preventDefault();

  setDebateError("");
  setDebateMessage("");
  setDebateLoading(true);

  try {
    const token = sessionStorage.getItem("access_token");

    const response = await fetch(`${API_URL}/debates`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        topic: debateTopic.trim(),
        debate_format: debateFormat,
        position: debatePosition,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.detail || "Could not create debate session."
      );
    }

    setDebateMessage("Debate session created successfully!");
    setDebateTopic("");

    await loadDebateSessions();
  } catch (err) {
    setDebateError(
      err.message === "Failed to fetch"
        ? "Cannot connect to the backend. Check that FastAPI is running."
        : err.message
    );
  } finally {
    setDebateLoading(false);
  }
}


async function loadDebateSessions() {
  setDebateError("");

  try {
    const token = sessionStorage.getItem("access_token");

    const response = await fetch(`${API_URL}/debates`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.detail || "Could not load debate sessions."
      );
    }

    setDebateSessions(data);
  } catch (err) {
    setDebateError(
      err.message === "Failed to fetch"
        ? "Cannot connect to the backend. Check that FastAPI is running."
        : err.message
    );
  }
}


async function loadSkillAssessments() {
  setSkillsLoading(true);
  setSkillsError("");

  try {
    const token = sessionStorage.getItem("access_token");

    const response = await fetch(`${API_URL}/skills/assessments`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.detail || "Could not load skill assessments."
      );
    }

    setSkillAssessments(data);
  } catch (err) {
    setSkillsError(
      err.message === "Failed to fetch"
        ? "Cannot connect to the backend. Check that FastAPI is running."
        : err.message
    );
  } finally {
    setSkillsLoading(false);
  }
}


async function loadPresentations() {
  setPresentationLoading(true);
  setPresentationError("");

  try {
    const token = sessionStorage.getItem("access_token");

    const response = await fetch(`${API_URL}/presentations`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.detail || "Could not load presentation history.");
    }

    setPresentations(data);
  } catch (err) {
    setPresentationError(
      err.message === "Failed to fetch"
        ? "Cannot connect to the backend. Check that FastAPI is running."
        : err.message
    );
  } finally {
    setPresentationLoading(false);
  }
}


async function createPresentation(event) {
  event.preventDefault();
  setPresentationSaving(true);
  setPresentationError("");
  setPresentationMessage("");

  try {
    const token = sessionStorage.getItem("access_token");

    const response = await fetch(`${API_URL}/presentations`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        title: presentationTitle.trim(),
        presentation_domain: presentationDomain.trim() || null,
        duration_seconds:
          presentationDuration === ""
            ? null
            : Number(presentationDuration),
        transcript: presentationTranscript.trim() || null,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.detail || "Could not save presentation.");
    }

    setPresentationTitle("");
    setPresentationDomain("");
    setPresentationDuration("");
    setPresentationTranscript("");
    setPresentationMessage("Presentation saved successfully!");

    await loadPresentations();
  } catch (err) {
    setPresentationError(
      err.message === "Failed to fetch"
        ? "Cannot connect to the backend. Check that FastAPI is running."
        : err.message
    );
  } finally {
    setPresentationSaving(false);
  }
}


async function analyzeArgument(event) {
  event.preventDefault();

  setArgumentError("");
  setArgumentResult(null);
  setArgumentLoading(true);

  try {
    const token = sessionStorage.getItem("access_token");

    const response = await fetch(`${API_URL}/arguments/analyze`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        text: argumentText.trim(),
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.detail || "Could not analyze the argument."
      );
    }

    setArgumentResult(data);
  } catch (err) {
    setArgumentError(
      err.message === "Failed to fetch"
        ? "Cannot connect to the backend. Check that FastAPI is running."
        : err.message
    );
  } finally {
    setArgumentLoading(false);
  }
}



  const navigation = [
    { name: "Dashboard", icon: "⌂" },
    { name: "Practice Debate", icon: "⚖" },
    { name: "Argument Analysis", icon: "✦" },
    { name: "Presentation Analysis", icon: "▤" },
    { name: "My Progress", icon: "↗" },
    { name: "My Profile", icon: "◎" },
  ];

  if (user) {
    return (
      <div className="dashboard-layout">
        <aside className="sidebar">
          <div className="sidebar-brand">
            <div className="brand-icon">DC</div>
            <div>
              <strong>Debate Coach</strong>
              <span>AI Learning Platform</span>
            </div>
          </div>

          <p className="sidebar-label">WORKSPACE</p>

          <nav className="sidebar-nav">
            {navigation.map((item) => (
              <button
                key={item.name}
                className={`nav-item ${page === item.name ? "nav-active" : ""}`}
                onClick={() => setPage(item.name)}
              >
                <span className="nav-icon">{item.icon}</span>
                {item.name}
              </button>
            ))}
          </nav>

          <div className="sidebar-bottom">
            <div className="sidebar-user">
              <div className="avatar">
                {(user.name || "U").charAt(0).toUpperCase()}
              </div>
              <div className="sidebar-user-info">
                <strong>{user.name}</strong>
                <span>{user.role}</span>
              </div>
            </div>

            <button className="logout-button" onClick={logout}>
              ↪ Log out
            </button>
          </div>
        </aside>

        <main className="dashboard-main">
          <header className="dashboard-header">
            <div>
              <p className="eyebrow">AI DEBATE COACH</p>
              <h1>{page}</h1>
            </div>
            <div className="header-user">
              <div className="avatar">
                {(user.name || "U").charAt(0).toUpperCase()}
              </div>
              <span>{user.name}</span>
            </div>
          </header>

          {page === "Dashboard" && (
            <section className="dashboard-content">
              <div className="welcome-banner">
                <div>
                  <p className="banner-label">YOUR LEARNING SPACE</p>
                  <h2>Welcome back, {user.name}!</h2>
                  <p>
                    Build stronger arguments. Speak with confidence.
                    Improve with every practice session.
                  </p>
                </div>
                <div className="banner-symbol">✦</div>
              </div>

              <div className="section-heading">
                <div>
                  <h2>Practice and improve</h2>
                  <p>Choose what you would like to work on today.</p>
                </div>
              </div>

              <div className="feature-grid">
                <button
                  className="feature-card"
                  onClick={() => setPage("Practice Debate")}
                >
                  <span className="feature-icon purple">⚖</span>
                  <h3>Practice Debate</h3>
                  <p>
                    Prepare arguments, explore a topic, and practise
                    defending your position.
                  </p>
                  <span className="feature-link">Open debate practice →</span>
                </button>

                <button
                  className="feature-card"
                  onClick={() => setPage("Presentation Analysis")}
                >
                  <span className="feature-icon blue">▤</span>
                  <h3>Presentation Analysis</h3>
                  <p>
                    Work towards clearer delivery, better structure,
                    and more confident presentations.
                  </p>
                  <span className="feature-link">Open presentation tools →</span>
                </button>

                <button
                  className="feature-card"
                  onClick={() => setPage("My Progress")}
                >
                  <span className="feature-icon green">↗</span>
                  <h3>My Progress</h3>
                  <p>
                    Access your learning progress and review results
                    as tracking features become available.
                  </p>
                  <span className="feature-link">View progress →</span>
                </button>
              </div>

              <div className="info-panel">
                <div className="info-icon">✦</div>
                <div>
                  <h3>Your next step</h3>
                  <p>
                    Choose a practice activity to begin building your
                    debate and presentation skills.
                  </p>
                </div>
              </div>
            </section>
          )}

          
{page === "My Profile" && (
  <section className="content-panel">
    <h2>Account information</h2>
    <p className="panel-description">
      Your account details and learning preferences.
    </p>

    <div className="profile-details">
      <p><strong>Name</strong><span>{user.name}</span></p>
      <p><strong>Email</strong><span>{user.email}</span></p>
      <p><strong>Role</strong><span>{user.role}</span></p>
      <p><strong>User ID</strong><span>{user.id}</span></p>
    </div>

    <hr />

    <h2>Learning profile</h2>
    <p className="panel-description">
      Tell us about your experience and what you want to improve.
    </p>

    {profileLoading ? (
      <p>Loading your learning profile...</p>
    ) : (
      <form onSubmit={saveLearningProfile}>
        <label>
          Experience level
          <select
            value={learningProfile.experience_level}
            onChange={(event) =>
              setLearningProfile({
                ...learningProfile,
                experience_level: event.target.value,
              })
            }
          >
            <option value="">Select experience level</option>
            <option value="Beginner">Beginner</option>
            <option value="Intermediate">Intermediate</option>
            <option value="Advanced">Advanced</option>
          </select>
        </label>

        <label>
          Preferred debate topics
          <textarea
            value={learningProfile.preferred_topics}
            onChange={(event) =>
              setLearningProfile({
                ...learningProfile,
                preferred_topics: event.target.value,
              })
            }
            placeholder="e.g. Technology, education, environment"
          />
        </label>

        <label>
          Presentation domains
          <textarea
            value={learningProfile.presentation_domains}
            onChange={(event) =>
              setLearningProfile({
                ...learningProfile,
                presentation_domains: event.target.value,
              })
            }
            placeholder="e.g. Academic presentations, public speaking"
          />
        </label>

        <label>
          Learning goals
          <textarea
            value={learningProfile.learning_goals}
            onChange={(event) =>
              setLearningProfile({
                ...learningProfile,
                learning_goals: event.target.value,
              })
            }
            placeholder="What skills do you want to improve?"
          />
        </label>

        <label>
          Coaching preferences
          <textarea
            value={learningProfile.coaching_preferences}
            onChange={(event) =>
              setLearningProfile({
                ...learningProfile,
                coaching_preferences: event.target.value,
              })
            }
            placeholder="e.g. Detailed feedback, practical examples"
          />
        </label>

        {profileError && (
          <p className="error-message">{profileError}</p>
        )}

        {profileMessage && (
          <p className="success-message">{profileMessage}</p>
        )}

        <button
          className="primary-button"
          type="submit"
          disabled={profileSaving}
        >
          {profileSaving ? "Saving..." : "Save learning profile"}
        </button>
      </form>
    )}
  </section>
)}


          
{page === "Practice Debate" && (
  <section className="content-panel">
    <h2>Start a Debate</h2>
    <p className="panel-description">
      Create a debate session and track your practice.
    </p>

    <form onSubmit={createDebateSession}>
      <label>
        Debate topic
        <input
          type="text"
          value={debateTopic}
          onChange={(event) => setDebateTopic(event.target.value)}
          placeholder="e.g. Should AI be used in education?"
          minLength={3}
          maxLength={255}
          required
        />
      </label>

      <label>
        Debate format
        <select
          value={debateFormat}
          onChange={(event) => setDebateFormat(event.target.value)}
          required
        >
          <option value="Oxford">Oxford</option>
          <option value="Lincoln-Douglas">Lincoln-Douglas</option>
          <option value="Parliamentary">Parliamentary</option>
        </select>
      </label>

      <label>
        Your position
        <select
          value={debatePosition}
          onChange={(event) => setDebatePosition(event.target.value)}
          required
        >
          <option value="For">For</option>
          <option value="Against">Against</option>
        </select>
      </label>

      {debateError && (
        <p className="error-message">{debateError}</p>
      )}

      {debateMessage && (
        <p className="success-message">{debateMessage}</p>
      )}

      <button
        className="primary-button"
        type="submit"
        disabled={debateLoading}
      >
        {debateLoading ? "Creating..." : "Start Debate"}
      </button>
    </form>

    <hr />

    <h2>Your Debate Sessions</h2>

    {debateSessions.length === 0 ? (
      <p className="panel-description">
        No debate sessions yet. Create your first one above.
      </p>
    ) : (
      <div className="debate-session-list">
        {debateSessions.map((session) => (
          <article className="debate-session-card" key={session.id}>
            <h3>{session.topic}</h3>
            <p>Format: {session.debate_format}</p>
            <p>Position: {session.position}</p>
            <p>Status: {session.status}</p>
            <p>Session ID: {session.id}</p>
          </article>
        ))}
      </div>
    )}
  </section>
)}


{page === "Argument Analysis" && (
  <section className="content-panel">
    <h2>Analyze Your Argument</h2>
    <p className="panel-description">
      Enter an argument to evaluate its claim, evidence relevance,
      possible fallacies, and reasoning.
    </p>

    <form onSubmit={analyzeArgument}>
      <label>
        Your argument
        <textarea
          value={argumentText}
          onChange={(event) => setArgumentText(event.target.value)}
          placeholder="Example: School uniforms should be compulsory because..."
          rows={6}
          minLength={1}
          maxLength={10000}
          required
        />
      </label>

      {argumentError && (
        <p className="error-message">{argumentError}</p>
      )}

      <button
        className="primary-button"
        type="submit"
        disabled={argumentLoading}
      >
        {argumentLoading ? "Analyzing..." : "Analyze Argument"}
      </button>
    </form>

    
{argumentResult && (
  <div className="argument-results">
    <div className="results-heading">
      <div>
        <h2>Analysis Report</h2>
        <p>Review your argument and see where you can improve.</p>
      </div>
      <span className="analysis-status">Analysis complete</span>
    </div>

    <div className="argument-score-card">
      <div>
        <p className="result-label">Overall Argument Score</p>
        <p className="score-description">Based on the current analysis rules</p>
      </div>
      <div className="score-circle">
        {argumentResult.argument_score}
        <span>/100</span>
      </div>
    </div>


    <div className="result-card">
      <h3>Evaluation Criteria</h3>

      <div className="criteria-grid">
        {[
          { key: "clarity", label: "Clarity" },
          { key: "relevance", label: "Relevance" },
          {
            key: "evidence_strength",
            label: "Evidence Strength",
          },
          {
            key: "logical_consistency",
            label: "Logical Consistency",
          },
          {
            key: "persuasiveness",
            label: "Persuasiveness",
          },
        ].map((criterion) => {
          const score =
            argumentResult.evaluation_criteria?.[criterion.key] ?? 0;

          return (
            <div className="criterion-item" key={criterion.key}>
              <div className="criterion-heading">
                <span>{criterion.label}</span>
                <strong>{score}/100</strong>
              </div>

              <div
                className="criterion-track"
                role="progressbar"
                aria-label={criterion.label}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={score}
              >
                <div
                  className="criterion-fill"
                  style={{ width: `${score}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>

    <div className="result-card">
      <h3>Reasoning Quality Analysis</h3>
      <ul className="result-list">
       {Array.isArray(argumentResult.reasoning_analysis)
        ? argumentResult.reasoning_analysis.map((item, index) => (
            <li key={index}>{item}</li>
         ))
        : (
           <li>
             {argumentResult.reasoning_analysis ||
               "No reasoning analysis available."}
           </li>
          )}
      </ul>
    </div>


    <div className="result-card">
      <h3>1. Main Claim</h3>
      <p>{argumentResult.claim || "No claim identified."}</p>
    </div>

    <div className="result-card">
      <h3>2. Supporting Evidence</h3>
      {argumentResult.evidence?.length ? (
        <ul className="result-list">
          {argumentResult.evidence.map((item, index) => (
            <li key={index}>{item}</li>
          ))}
        </ul>
      ) : (
        <p>No supporting evidence was identified. Try adding facts, examples, or reliable sources.</p>
      )}
    </div>

    <div className="result-card">
      <h3>3. Evidence Relevance</h3>
      {argumentResult.evidence_analysis?.length ? (
        argumentResult.evidence_analysis.map((item, index) => (
          <div className="evidence-item" key={index}>
            <div className="similarity-row">
              <span>Semantic similarity</span>
              <strong>
                {(item.similarity_score * 100).toFixed(1)}%
              </strong>
            </div>
          </div>
        ))
      ) : (
        <p>No evidence relevance scores are available.</p>
      )}
      <p className="result-note">
        Similarity measures how closely the wording relates in meaning.
        It does not prove that evidence is true or reliable.
      </p>
    </div>

<div className="result-card">
  <h3>4. Possible Logical Fallacies</h3>

  {argumentResult.fallacy_details?.length ? (
    <ul className="result-list">
      {argumentResult.fallacy_details.map((item, index) => (
        <li key={index}>
          <strong>{item.name}:</strong>
          <p>{item.explanation}</p>

          {item.correction && (
            <p>
              <strong>How to improve:</strong> {item.correction}
            </p>
          )}
        </li>
      ))}
    </ul>
  ) : (
    <p>No fallacies were identified by the current detection rules.</p>
  )}
</div>


    <div className="result-card feedback-card">
      <h3>5. Coaching Feedback</h3>
      {argumentResult.feedback?.length ? (
        <ul className="result-list">
          {argumentResult.feedback.map((item, index) => (
            <li key={index}>{item}</li>
          ))}
        </ul>
      ) : (
        <p>No additional feedback is available.</p>
      )}
    </div>

    <p className="saved-result">
      Analysis saved successfully · Argument ID: {argumentResult.argument_id}
    </p>
  </div>
)}


    <button
      className="primary-button back-button"
      type="button"
      onClick={() => setPage("Dashboard")}
    >
      Back to dashboard
    </button>
  </section>
)}


{page === "Presentation Analysis" && (
  <section className="content-panel">
    <div className="feature-icon blue">▤</div>
    <h2>Presentation Analysis</h2>
    <p className="panel-description">
      Record your presentation details and review your presentation history.
      Speech and delivery analysis will be added in a later milestone.
    </p>

    <form onSubmit={createPresentation}>
      <label>
        Presentation title
        <input
          type="text"
          value={presentationTitle}
          onChange={(event) => setPresentationTitle(event.target.value)}
          placeholder="e.g. Introduction to Artificial Intelligence"
          maxLength={255}
          required
        />
      </label>

      <label>
        Presentation domain
        <input
          type="text"
          value={presentationDomain}
          onChange={(event) => setPresentationDomain(event.target.value)}
          placeholder="e.g. Technology, Education"
          maxLength={100}
        />
      </label>

      <label>
        Duration (seconds)
        <input
          type="number"
          min="0"
          step="1"
          value={presentationDuration}
          onChange={(event) => setPresentationDuration(event.target.value)}
          placeholder="e.g. 180"
        />
      </label>

      <label>
        Transcript (optional)
        <textarea
          value={presentationTranscript}
          onChange={(event) => setPresentationTranscript(event.target.value)}
          placeholder="Enter your presentation transcript..."
          rows={5}
        />
      </label>

      {presentationError && (
        <p className="error-message">{presentationError}</p>
      )}

      {presentationMessage && (
        <p className="success-message">{presentationMessage}</p>
      )}

      <button
        className="primary-button"
        type="submit"
        disabled={presentationSaving}
      >
        {presentationSaving ? "Saving..." : "Save Presentation"}
      </button>
    </form>

    <hr />

    <h2>Presentation History</h2>

    {presentationLoading ? (
      <p>Loading presentation history...</p>
    ) : presentationError ? (
      <p className="error-message">{presentationError}</p>
    ) : presentations.length === 0 ? (
      <p className="panel-description">
        No presentations yet. Save your first presentation above.
      </p>
    ) : (
      <div className="debate-session-list">
        {presentations.map((item) => (
          <article className="debate-session-card" key={item.id}>
            <h3>{item.title}</h3>
            <p>
              <strong>Domain:</strong> {item.presentation_domain || "Not specified"}
            </p>
            <p>
              <strong>Duration:</strong>{" "}
              {item.duration_seconds == null
                ? "Not specified"
                : `${Math.floor(item.duration_seconds / 60)} min ${
                    item.duration_seconds % 60
                  } sec`}
            </p>
            <p><strong>Status:</strong> {item.status}</p>
            <p>
              <strong>Created:</strong>{" "}
              {item.created_at
                ? new Date(item.created_at).toLocaleString()
                : "Not available"}
            </p>
            {item.transcript && (
              <details>
                <summary>View transcript</summary>
                <p>{item.transcript}</p>
              </details>
            )}
            <p><strong>Presentation ID:</strong> {item.id}</p>
          </article>
        ))}
      </div>
    )}

    <button
      className="primary-button back-button"
      type="button"
      onClick={() => setPage("Dashboard")}
    >
      Back to dashboard
    </button>
  </section>
)}



{page === "My Progress" && (
  <section className="content-panel">
    <h2>My Skill Progress</h2>
    <p className="panel-description">
      Review your argument assessment scores and identify areas to improve.
    </p>

    {skillsLoading ? (
      <p>Loading your skill assessments...</p>
    ) : skillsError ? (
      <p className="error-message">{skillsError}</p>
    ) : skillAssessments.length === 0 ? (
      <p className="panel-description">
        No assessments yet. Complete an assessment to start tracking your skills.
      </p>
    ) : (
      <>
        <div className="feature-grid">
          <article className="content-panel">
            <h3>Total Assessments</h3>
            <h2>{skillAssessments.length}</h2>
          </article>

          <article className="content-panel">
            <h3>Average Argument Score</h3>
            <h2>
              {(
                skillAssessments.reduce(
                  (total, item) => total + (item.argument_score ?? 0),
                  0
                ) / skillAssessments.length
              ).toFixed(1)}
              /100
            </h2>
          </article>
        </div>


<h2>Skill Comparison</h2>
<p className="panel-description">
  Average scores across your saved assessments (out of 100).
</p>

<div style={{ width: "100%", height: 320 }}>
  <ResponsiveContainer width="100%" height="100%">
    <BarChart
      data={skillChartData}
      margin={{ top: 12, right: 20, left: 0, bottom: 12 }}
    >
      <CartesianGrid strokeDasharray="3 3" />
      <XAxis dataKey="skill" />
      <YAxis domain={[0, 100]} />
      <Tooltip
        formatter={(value) => [`${value}/100`, "Average score"]}
      />
      <Bar
        dataKey="score"
        fill="#7656d6"
        radius={[6, 6, 0, 0]}
      />
    </BarChart>
  </ResponsiveContainer>
</div>


        <h2>Assessment History</h2>

        {skillAssessments.map((item) => (
          <article className="content-panel" key={item.id}>
            <h3>{item.claim || item.text}</h3>

            <p><strong>Argument score:</strong> {item.argument_score ?? "Not scored"}/100</p>
            <p><strong>Reasoning quality:</strong> {item.reasoning_quality ?? "Not scored"}/100</p>
            <p><strong>Evidence strength:</strong> {item.evidence_strength ?? "Not scored"}/100</p>
            <p><strong>Logical consistency:</strong> {item.logical_consistency ?? "Not scored"}/100</p>
            <p><strong>Persuasiveness:</strong> {item.persuasiveness ?? "Not scored"}/100</p>

            {item.feedback && (
              <p><strong>Feedback:</strong> {item.feedback}</p>
            )}

            {item.fallacies && (
              <p><strong>Fallacies:</strong> {item.fallacies}</p>
            )}

            <p><strong>Assessment ID:</strong> {item.id}</p>
          </article>
        ))}
      </>
    )}

    <button
      className="primary-button back-button"
      onClick={() => setPage("Dashboard")}
    >
      Back to dashboard
    </button>
  </section>
)}


{page === "Coach Dashboard" && (
  <section className="content-panel">
    <h2>Coach Dashboard</h2>
    <p className="panel-description">
      Coach tools will be implemented in a later development step.
    </p>
  </section>
)}

{page === "Educator Dashboard" && (
  <section className="content-panel">
    <h2>Educator Dashboard</h2>
    <p className="panel-description">
      Educator tools will be implemented in a later development step.
    </p>
  </section>
)}

{page === "Admin Dashboard" && (
  <section className="content-panel">
    <h2>Admin Dashboard</h2>
    <p className="panel-description">
      Administration tools will be implemented in a later development step.
    </p>
  </section>
)}

        </main>
      </div>
    );
  }

  return (
    <main className="app-shell">
      <section className="auth-card">
        <div className="brand-icon">DC</div>
        <p className="eyebrow">AI DEBATE COACH</p>
        <h1>
          {mode === "register" ? "Create your account" : "Welcome back"}
        </h1>
        <p className="subtitle">
          {mode === "register"
            ? "Start building stronger arguments and presentation skills."
            : "Sign in to continue your learning journey."}
        </p>

        <div className="mode-switch">
          <button
            className={mode === "login" ? "mode-active" : ""}
            onClick={() => {
              setMode("login");
              setMessage("");
              setError("");
            }}
            type="button"
          >
            Log in
          </button>
          <button
            className={mode === "register" ? "mode-active" : ""}
            onClick={() => {
              setMode("register");
              setMessage("");
              setError("");
            }}
            type="button"
          >
            Register
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {mode === "register" && (
            <label>
              Full name
              <input
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Enter your name"
                minLength={2}
                maxLength={100}
                required
              />
            </label>
          )}

          <label>
            Email address
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              required
            />
          </label>

          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter your password"
              minLength={mode === "register" ? 8 : 1}
              maxLength={72}
              required
            />
          </label>

          {error && <p className="error-message">{error}</p>}
          {message && <p className="success-message">{message}</p>}

          <button className="primary-button" type="submit" disabled={loading}>
            {loading
              ? "Please wait..."
              : mode === "register"
                ? "Create account"
                : "Log in"}
          </button>
        </form>

        <p className="footer-note">
          Practice your arguments. Improve your delivery.
        </p>
      </section>
    </main>
  );
}

export default App;
