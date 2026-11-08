import { useEffect, useMemo, useState } from "react";
import { ArrowUpRight, Check, Cpu, Download, LoaderCircle, LogOut, Trash2 } from "lucide-react";
import { buildArchiveCsv, deleteAccount, deleteAllPracticeData, downloadCsvFile } from "../../services/account-data";
import { cacheApplicationSettings, LOCAL_MODEL_OPTIONS, type ApplicationSettings, type ThemePreference } from "../../services/app-settings";
import { emptyProfile, loadProfile, saveProfile, type LearnerProfile } from "../../services/profiles";
import {
  FOCUS_OPTIONS,
  GOAL_OPTIONS,
  PURPOSE_OPTIONS,
  buildRecommendation,
  emptyPrefs,
  hasAnswers,
  loadPrefs,
  markOnboardingDone,
  prefsFromProfile,
  prefsToProfileFields,
  savePrefs,
  stampPrefs,
  type FocusKey,
  type LearnerPrefs,
} from "../../services/learner-prefs";
import { difficultyFor, personaFor } from "../debate-catalog";
import { useAuth } from "../auth/AuthProvider";
import "./settings.css";

type SettingsViewProps = {
  settings: ApplicationSettings;
  onChange: (next: ApplicationSettings) => void;
  onSignIn: () => void;
  onSignOut: () => Promise<void>;
};

const EXPERIENCE_OPTIONS: { value: NonNullable<LearnerProfile["experience"]>; label: string }[] = [
  { value: "new", label: "New to debating" },
  { value: "developing", label: "Developing" },
  { value: "confident", label: "Confident" },
];

export function SettingsView({ settings, onChange, onSignIn, onSignOut }: SettingsViewProps) {
  const { user } = useAuth();
  const [profile, setProfile] = useState<LearnerProfile>(emptyProfile);
  const [prefs, setPrefs] = useState<LearnerPrefs>(emptyPrefs);
  const [profileReady, setProfileReady] = useState(!user);
  const [saving, setSaving] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [dataBusy, setDataBusy] = useState(false);
  const [dangerConfirm, setDangerConfirm] = useState<"practice" | "account" | null>(null);
  const [notice, setNotice] = useState("");
  const [dataNotice, setDataNotice] = useState("");

  const recommendation = useMemo(
    () => buildRecommendation(profile.experience, prefs),
    [profile.experience, prefs],
  );

  useEffect(() => {
    if (!dangerConfirm) return;
    const timer = window.setTimeout(() => setDangerConfirm(null), 6000);
    return () => window.clearTimeout(timer);
  }, [dangerConfirm]);

  useEffect(() => {
    let active = true;
    if (!user) {
      setProfile(emptyProfile());
      setPrefs(emptyPrefs());
      setProfileReady(true);
      return () => { active = false; };
    }

    setProfileReady(false);
    setProfile(emptyProfile());
    setPrefs(loadPrefs(user.id));
    void loadProfile(user.id)
      .then((loaded) => {
        if (!active || !loaded) return;
        setProfile(loaded);
        const savedPrefs = prefsFromProfile(loaded);
        if (hasAnswers(savedPrefs)) {
          setPrefs(savedPrefs);
          savePrefs(user.id, savedPrefs);
          markOnboardingDone(user.id);
        }
      })
      .catch(() => {
        if (active) setNotice("We couldn’t reach your account settings. Your saved device copy is still available.");
      })
      .finally(() => {
        if (active) setProfileReady(true);
      });
    return () => { active = false; };
  }, [user]);

  function updateSettings(patch: Partial<ApplicationSettings>) {
    onChange({ ...settings, ...patch });
    setNotice("");
  }

  function updateProfile(patch: Partial<LearnerProfile>) {
    setProfile((current) => ({ ...current, ...patch }));
    setNotice("");
  }

  function updatePrefs(patch: Partial<LearnerPrefs>) {
    setPrefs((current) => ({ ...current, ...patch }));
    setNotice("");
  }

  function toggleFocus(key: FocusKey) {
    setPrefs((current) => ({
      ...current,
      focus: current.focus.includes(key)
        ? current.focus.filter((value) => value !== key)
        : [...current.focus, key],
    }));
    setNotice("");
  }

  async function save() {
    if (!user || saving || !profileReady) return;
    setSaving(true);
    setNotice("");
    const stamped = stampPrefs({ ...prefs, experience: profile.experience });
    const cached = cacheApplicationSettings(user.id, settings);
    savePrefs(user.id, stamped);
    markOnboardingDone(user.id);
    const nextProfile: LearnerProfile = {
      ...profile,
      display_name: profile.display_name?.trim() || null,
      goals: profile.goals?.trim().slice(0, 500) || null,
      ...prefsToProfileFields(stamped),
      app_settings: settings,
    };
    try {
      await saveProfile(user.id, nextProfile);
      setProfile(nextProfile);
      setPrefs(stamped);
      setNotice(cached
        ? "Profile, practice preferences, coach and appearance settings are saved to your account."
        : "Settings are saved to your account. Browser storage is unavailable, so they may take a moment to reach the debate room.");
    } catch {
      setNotice(cached
        ? "Saved on this device, but account sync failed. Check your connection and try again."
        : "Account sync failed and browser storage is unavailable. Check your connection and try again.");
    } finally {
      setSaving(false);
    }
  }

  async function exportArchive() {
    if (exporting) return;
    setExporting(true);
    setDataNotice("");
    try {
      downloadCsvFile(await buildArchiveCsv());
      setDataNotice("Your archive is downloading. It includes transcripts, reviews, and delivery takes.");
    } catch {
      setDataNotice("The export could not be built. Check your connection and try again.");
    } finally {
      setExporting(false);
    }
  }

  async function removePracticeData() {
    if (!user || dataBusy) return;
    if (dangerConfirm !== "practice") {
      setDangerConfirm("practice");
      return;
    }
    setDataBusy(true);
    setDataNotice("");
    try {
      await deleteAllPracticeData(user.id);
      setDangerConfirm(null);
      setDataNotice("Saved practice data was deleted. Your profile and sign-in remain.");
    } catch {
      setDataNotice("Practice data could not be fully deleted. Check your connection and try again.");
    } finally {
      setDataBusy(false);
    }
  }

  async function removeAccount() {
    if (!user || dataBusy) return;
    if (dangerConfirm !== "account") {
      setDangerConfirm("account");
      return;
    }
    setDataBusy(true);
    setDataNotice("");
    try {
      await deleteAccount();
      await onSignOut();
    } catch (error) {
      setDataNotice(error instanceof Error ? error.message : "The account could not be deleted.");
      setDangerConfirm(null);
    } finally {
      setDataBusy(false);
    }
  }

  async function signOut() {
    if (signingOut) return;
    setSigningOut(true);
    setNotice("");
    try {
      await onSignOut();
    } catch {
      setNotice("We couldn’t sign you out. Check your connection and try again.");
      setSigningOut(false);
    }
  }

  const themes: { value: ThemePreference; title: string; detail: string }[] = [
    { value: "new", title: "Matchday", detail: "Navy, warm ivory and coral, with a focused practice home." },
    { value: "classic", title: "Classic", detail: "The original dark rehearsal notebook and dashboard." },
  ];

  return (
    <main className="settings-view">
      <header className="settings-heading">
        <div>
          <span className="settings-heading-mark" aria-hidden="true">V.</span>
          <h1>Settings</h1>
          <p>Shape your practice room, coach and account in one place.</p>
        </div>
        <div className="settings-account-stamp" aria-live="polite">
          <span>{user ? "SIGNED IN" : "GUEST PRACTICE"}</span>
          <b>{user?.email ?? "Settings stay on this device"}</b>
        </div>
      </header>

      <div className="settings-layout">
        <nav className="settings-nav" aria-label="Settings sections">
          <a href="#settings-profile">Profile</a>
          <a href="#settings-practice">Your practice</a>
          <a href="#settings-coach">Debate coach</a>
          <a href="#settings-model">Local model</a>
          <a href="#settings-appearance">Appearance</a>
          <a href="#settings-data">Your data</a>
        </nav>

        <div className="settings-main">
          <section className="settings-section" id="settings-profile" aria-labelledby="profile-settings-title">
            <div className="settings-section-heading">
              <div><h2 id="profile-settings-title">Your profile</h2><p>Keep the basics and delivery privacy choice that shape your account.</p></div>
            </div>
            {!user ? (
              <div className="settings-guest-prompt">
                <div><b>Create a learner profile</b><p>Sign in to save your name, goals, experience and delivery recording preference across devices.</p></div>
                <button className="settings-inline-action" type="button" onClick={onSignIn}>Sign in <ArrowUpRight size={14} aria-hidden="true" /></button>
              </div>
            ) : profileReady ? (
              <div className="settings-profile-grid">
                <label className="settings-field">
                  <span>Name shown in Verdict</span>
                  <input type="text" value={profile.display_name ?? ""} maxLength={80} onChange={(event) => updateProfile({ display_name: event.target.value })} placeholder="Your name" />
                </label>
                <label className="settings-field">
                  <span>Debate experience</span>
                  <select value={profile.experience ?? ""} onChange={(event) => updateProfile({ experience: (event.target.value || null) as LearnerProfile["experience"] })}>
                    <option value="">Prefer not to say</option>
                    {EXPERIENCE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </select>
                </label>
                <label className="settings-field settings-field-wide">
                  <span>Personal practice goals</span>
                  <textarea value={profile.goals ?? ""} rows={3} maxLength={500} onChange={(event) => updateProfile({ goals: event.target.value })} placeholder="What would you like to get better at?" />
                </label>
                <label className="settings-audio-choice">
                  <input type="checkbox" checked={profile.retain_audio} onChange={(event) => updateProfile({ retain_audio: event.target.checked })} />
                  <span><b>Keep delivery recordings in my archive</b><small>Off by default. When off, recordings are discarded after transcription.</small></span>
                </label>
              </div>
            ) : (
              <p className="settings-loading" role="status"><LoaderCircle size={16} className="spin" /> Loading your profile…</p>
            )}
            {user && <div className="settings-account-actions"><span>Signed in as <b>{user.email}</b></span><button type="button" onClick={() => void signOut()} disabled={signingOut}>{signingOut ? <LoaderCircle size={15} className="spin" /> : <LogOut size={15} />}{signingOut ? "Signing out" : "Sign out"}</button></div>}
          </section>

          <section className="settings-section" id="settings-practice" aria-labelledby="practice-settings-title">
            <div className="settings-section-heading">
              <div><h2 id="practice-settings-title">Your practice</h2><p>These answers tune the suggested opponent, pressure and first cue. You can still change the match before it starts.</p></div>
            </div>
            {!user ? (
              <p className="settings-account-note">Practice preferences sync with a learner account. You can still use the setup page to choose a one-off debate.</p>
            ) : !profileReady ? (
              <p className="settings-loading" role="status"><LoaderCircle size={16} className="spin" /> Loading practice preferences…</p>
            ) : (
              <>
                <fieldset className="settings-choice-field">
                  <legend>Where do you practise?</legend>
                  <div className="settings-choice-list">
                    {PURPOSE_OPTIONS.map((option) => (
                      <label className="settings-choice" key={option.key}>
                        <input type="radio" name="practice-purpose" checked={prefs.purpose === option.key} onChange={() => updatePrefs({ purpose: option.key })} />
                        <span><b>{option.label}</b><small>{option.detail}</small></span>
                      </label>
                    ))}
                  </div>
                </fieldset>
                <fieldset className="settings-choice-field">
                  <legend>What are you working on?</legend>
                  <div className="settings-choice-list">
                    {GOAL_OPTIONS.map((option) => (
                      <label className="settings-choice" key={option.key}>
                        <input type="radio" name="practice-goal" checked={prefs.goal === option.key} onChange={() => updatePrefs({ goal: option.key })} />
                        <span><b>{option.label}</b><small>{option.detail}</small></span>
                      </label>
                    ))}
                  </div>
                </fieldset>
                <fieldset className="settings-choice-field">
                  <legend>Which areas should get more attention?</legend>
                  <div className="settings-focus-list">
                    {FOCUS_OPTIONS.map((option) => (
                      <label className="settings-focus" key={option.key}>
                        <input type="checkbox" checked={prefs.focus.includes(option.key)} onChange={() => toggleFocus(option.key)} />
                        <span><b>{option.label}</b><small>{option.detail}</small></span>
                      </label>
                    ))}
                  </div>
                </fieldset>
                <div className="settings-recommendation">
                  <div><span>YOUR CURRENT STARTING POINT</span><p>{recommendation.reason}</p></div>
                  <dl><div><dt>Opponent</dt><dd>{personaFor(recommendation.persona).name}</dd></div><div><dt>Pressure</dt><dd>{difficultyFor(recommendation.difficulty).label}</dd></div><div><dt>Round</dt><dd>{recommendation.duration} min</dd></div></dl>
                </div>
              </>
            )}
          </section>

          <section className="settings-section" id="settings-coach" aria-labelledby="coach-settings-title">
            <div className="settings-section-heading">
              <div><h2 id="coach-settings-title">Debate coach</h2><p>These choices apply to future replies. Saved transcripts stay in your archive either way.</p></div>
            </div>
            <div className="settings-rows">
              <div className="settings-row"><div><h3>Adaptive debate moves</h3><p>Use adaptive tactics when they are available for a turn.</p></div><label className="settings-switch"><span className="visually-hidden">Use adaptive debate moves</span><input type="checkbox" checked={settings.adaptiveTactics} onChange={(event) => updateSettings({ adaptiveTactics: event.target.checked })} /><i aria-hidden="true" /></label></div>
              <div className="settings-row"><div><h3>Use saved practice history</h3><p>Allow short summaries from earlier sessions to guide the opponent. Turn this off to keep past practice out of debate prompts.</p></div><label className="settings-switch"><span className="visually-hidden">Use saved practice history</span><input type="checkbox" checked={settings.usePracticeHistory} onChange={(event) => updateSettings({ usePracticeHistory: event.target.checked })} /><i aria-hidden="true" /></label></div>
              <div className="settings-row"><div><h3>Stream replies as they are written</h3><p>Show the opponent's reply in the exchange and voice room sentence by sentence. Turn this off to wait for the full, checked reply.</p></div><label className="settings-switch"><span className="visually-hidden">Stream replies as they are written</span><input type="checkbox" checked={settings.streamReplies} onChange={(event) => updateSettings({ streamReplies: event.target.checked })} /><i aria-hidden="true" /></label></div>
              <div className="settings-row settings-row-length"><div><h3>Opponent reply length</h3><p>Choose a concise point or a fuller response.</p></div><div className="reply-options" role="group" aria-label="Opponent reply length"><button type="button" aria-pressed={settings.replyLength === "concise"} className={settings.replyLength === "concise" ? "selected" : ""} onClick={() => updateSettings({ replyLength: "concise" })}>Short</button><button type="button" aria-pressed={settings.replyLength === "standard"} className={settings.replyLength === "standard" ? "selected" : ""} onClick={() => updateSettings({ replyLength: "standard" })}>Standard</button></div></div>
            </div>
          </section>

          <section className="settings-section" id="settings-model" aria-labelledby="model-settings-title">
            <div className="settings-section-heading">
              <div><h2 id="model-settings-title">Local model</h2><p>Choose which Ollama model answers debate turns, reviews, plans, and delivery coaching. Both run on this machine.</p></div>
            </div>
            <div className="model-options" role="radiogroup" aria-label="Local model">
              {LOCAL_MODEL_OPTIONS.map((option) => {
                const selected = settings.model === option.id;
                return (
                  <button
                    key={option.id}
                    className={`model-option${selected ? " selected" : ""}`}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => updateSettings({ model: option.id })}
                  >
                    <span className="model-option-mark" aria-hidden="true"><Cpu size={17} /></span>
                    <span className="model-option-copy">
                      <b>{option.name}</b>
                      <small>{option.detail}</small>
                      <code>ollama pull {option.id}</code>
                    </span>
                    <span className="model-option-check" aria-hidden="true">{selected && <Check size={17} />}</span>
                  </button>
                );
              })}
            </div>
            <p className="settings-model-note">Switching applies to the next turn or review; no restart is needed. Voice, delivery, and plan requests use the same choice. Pull both models once so either is ready: <code>ollama pull qwen3.5:4b</code> and <code>ollama pull gemma4:e4b</code>.</p>
          </section>

          <section className="settings-section" id="settings-appearance" aria-labelledby="appearance-title">
            <div className="settings-section-heading">
              <div><h2 id="appearance-title">Appearance</h2><p>Switch between Matchday and the original Verdict experience.</p></div>
            </div>
            <div className="theme-options" role="group" aria-label="Choose appearance">
              {themes.map((theme) => (
                <button className={`theme-option theme-option-${theme.value}${settings.theme === theme.value ? " selected" : ""}`} key={theme.value} type="button" aria-pressed={settings.theme === theme.value} onClick={() => updateSettings({ theme: theme.value })}>
                  <span className="theme-swatch" aria-hidden="true"><i /><i /><i /></span>
                  <span className="theme-option-copy"><b>{theme.title}</b><small>{theme.detail}</small></span>
                  <span className="theme-check" aria-hidden="true">{settings.theme === theme.value && <Check size={17} />}</span>
                </button>
              ))}
            </div>
          </section>

          <section className="settings-section settings-data-section" id="settings-data" aria-labelledby="data-settings-title">
            <div className="settings-section-heading">
              <div><h2 id="data-settings-title">Your data</h2><p>Download your archive or remove saved work from this account.</p></div>
            </div>
            {!user ? <p className="settings-account-note">Sign in to export or remove data saved to an account. Guest sessions remain available in this browser until the session ends.</p> : (
              <>
                <div className="settings-data-actions">
                  <button className="settings-data-export" type="button" onClick={() => void exportArchive()} disabled={exporting}><Download size={16} />{exporting ? "Building archive CSV" : "Download archive CSV"}</button>
                  <button className={`settings-data-danger${dangerConfirm === "practice" ? " armed" : ""}`} type="button" onClick={() => void removePracticeData()} disabled={dataBusy}><Trash2 size={16} />{dangerConfirm === "practice" ? "Tap again to delete practice data" : "Delete all practice data"}</button>
                  <button className={`settings-data-danger${dangerConfirm === "account" ? " armed" : ""}`} type="button" onClick={() => void removeAccount()} disabled={dataBusy}><Trash2 size={16} />{dangerConfirm === "account" ? "Tap again to delete my account" : "Delete my account"}</button>
                </div>
                <p className="settings-data-note">Practice data includes saved debates, reviews, delivery reports, plans and your topic bank. Deleting your account also removes the sign-in itself. These actions cannot be undone; download your archive first if you want a copy.</p>
                {dataNotice && <p className="settings-status" role="status">{dataNotice}</p>}
              </>
            )}
          </section>

          <footer className="settings-footer">
            <p className={notice ? "has-notice" : ""} role="status">{notice || (user ? "Save profile, practice preferences, coach and appearance changes together." : "Appearance and coach changes save on this device automatically.")}</p>
            {user && <button className="settings-save" type="button" onClick={() => void save()} disabled={saving || !profileReady}>{saving ? <LoaderCircle size={16} className="spin" /> : <Check size={16} />}{saving ? "Saving" : "Save all settings"}</button>}
          </footer>
        </div>
      </div>
    </main>
  );
}
