import { z } from "zod";
import { useState, type FormEvent } from "react";
import { ArrowLeft, ArrowRight, BookOpenText, Eye, EyeOff, LoaderCircle, RotateCcw, ShieldCheck } from "lucide-react";
import { supabase, supabaseConfigured } from "./supabase";
import "./auth.css";

type AuthMode = "sign-in" | "sign-up";

const emailSchema = z.string().trim().min(1, "Enter your email address.").max(254, "Email addresses must be 254 characters or fewer.").email("Enter a valid email address.");
const passwordSchema = z.string()
  .min(12, "Use at least 12 characters.")
  .max(72, "Use 72 characters or fewer.")
  .regex(/[a-z]/, "Add a lowercase letter.")
  .regex(/[A-Z]/, "Add an uppercase letter.")
  .regex(/[0-9]/, "Add a number.");

function getAuthMessage(message: string) {
  const normalized = message.toLowerCase();
  if (normalized.includes("invalid login credentials")) return "That email and password do not match. Check them and try again.";
  if (normalized.includes("email not confirmed")) return "Verify your email from the link we sent, then sign in.";
  if (normalized.includes("already registered") || normalized.includes("already been registered")) return "If this email already has an account, sign in instead. You can also check your inbox for a verification link.";
  if (normalized.includes("rate limit") || normalized.includes("too many requests")) return "Too many attempts in a short time. Wait a little, then try again.";
  return "We could not complete that request. Check your connection and try again.";
}

function GoogleMark() {
  return (
    <svg className="google-mark" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#4285F4" d="M43.6 24.5c0-1.5-.1-3-.4-4.4H24v8.3h11a9.4 9.4 0 0 1-4.1 6.1v5.1h6.7c3.9-3.6 6-8.9 6-15.1Z" />
      <path fill="#34A853" d="M24 44c5.5 0 10.1-1.8 13.5-4.9l-6.7-5.1c-1.8 1.2-4 2-6.8 2-5.2 0-9.6-3.5-11.2-8.2H5.9v5.3A20 20 0 0 0 24 44Z" />
      <path fill="#FBBC05" d="M12.8 27.8a12 12 0 0 1 0-7.6v-5.3H5.9a20 20 0 0 0 0 18.2l6.9-5.3Z" />
      <path fill="#EA4335" d="M24 12c3 0 5.7 1.1 7.8 3.1l5.9-5.9C34.1 5.9 29.5 4 24 4A20 20 0 0 0 5.9 14.9l6.9 5.3c1.6-4.7 6-8.2 11.2-8.2Z" />
    </svg>
  );
}

export function AuthView({
  onContinueAsGuest,
  onAuthenticated,
}: {
  onContinueAsGuest: () => void;
  onAuthenticated: () => void;
}) {
  const [mode, setMode] = useState<AuthMode>("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [visiblePassword, setVisiblePassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");
    const emailResult = emailSchema.safeParse(email);
    const passwordResult = mode === "sign-up"
      ? passwordSchema.safeParse(password)
      : z.string().min(1, "Enter your password.").safeParse(password);
    const validEmail = emailResult.success ? emailResult.data : "";
    const validPassword = passwordResult.success ? passwordResult.data : "";
    const nextErrors: Record<string, string> = {};

    if (!emailResult.success) nextErrors.email = emailResult.error.issues[0].message;
    if (!passwordResult.success) nextErrors.password = passwordResult.error.issues[0].message;
    if (mode === "sign-up" && passwordResult.success && confirmation !== password) {
      nextErrors.confirmation = "The passwords do not match.";
    }
    setFieldErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    if (!supabase) {
      setError("Account access is not connected yet. You can still continue as a guest.");
      return;
    }

    setSubmitting(true);
    try {
      if (mode === "sign-up") {
        const { data, error: authError } = await supabase.auth.signUp({
          email: validEmail,
          password: validPassword,
          options: { emailRedirectTo: window.location.origin },
        });
        if (authError) throw authError;
        if (data.session) {
          onAuthenticated();
        } else {
          setNotice("Check your inbox for a verification link. After you confirm your email, return here to sign in.");
          setMode("sign-in");
          setPassword("");
          setConfirmation("");
        }
      } else {
        const { error: authError } = await supabase.auth.signInWithPassword({
          email: validEmail,
          password: validPassword,
        });
        if (authError) throw authError;
        onAuthenticated();
      }
    } catch (authError) {
      setError(getAuthMessage(authError instanceof Error ? authError.message : "unknown"));
    } finally {
      setSubmitting(false);
    }
  }

  async function continueWithGoogle() {
    setError("");
    setNotice("");
    if (!supabase) {
      setError("Account access is not connected yet. You can still continue as a guest.");
      return;
    }
    setSubmitting(true);
    try {
      const { error: authError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: window.location.origin },
      });
      if (authError) throw authError;
    } catch (authError) {
      setError(getAuthMessage(authError instanceof Error ? authError.message : "unknown"));
      setSubmitting(false);
    }
  }

  function changeMode(nextMode: AuthMode) {
    setMode(nextMode);
    setError("");
    setNotice("");
    setFieldErrors({});
    setPassword("");
    setConfirmation("");
  }

  return (
    <main className="auth-page">
      <section className="auth-welcome">
        <h1>Keep your<br /><em>practice close.</em></h1>
        <p>Save your debate sessions, return to the arguments that matter, and keep building your next point.</p>
        <div className="auth-benefits">
          <div><BookOpenText size={16} /><p>Revisit your debate transcript</p></div>
          <div><RotateCcw size={16} /><p>Pick up where your practice left off</p></div>
          <div><ShieldCheck size={16} /><p>Keep your words in your own account</p></div>
        </div>
        <button className="auth-guest-link" onClick={onContinueAsGuest}>
          <ArrowLeft size={15} /> Continue to practice as a guest
        </button>
      </section>

      <section className="auth-workspace" aria-labelledby="auth-heading">
        <div className="auth-form-head">
          <div className="auth-tabs" role="group" aria-label="Account access">
            <button type="button" className={mode === "sign-in" ? "active" : ""} onClick={() => changeMode("sign-in")} aria-pressed={mode === "sign-in"}>Sign in</button>
            <button type="button" className={mode === "sign-up" ? "active" : ""} onClick={() => changeMode("sign-up")} aria-pressed={mode === "sign-up"}>Create account</button>
          </div>
          <h2 id="auth-heading">{mode === "sign-in" ? "Welcome back." : "Start your record."}</h2>
          <p>{mode === "sign-in" ? "Return to your learner account." : "Create a learner account for your debate practice."}</p>
        </div>

        <button className="auth-google-button" type="button" onClick={() => void continueWithGoogle()} disabled={submitting}>
          {submitting ? <LoaderCircle className="spin" size={16} /> : <GoogleMark />}
          Continue with Google
        </button>
        <div className="auth-divider"><span>OR USE YOUR EMAIL</span></div>

        <form className="auth-form" onSubmit={(event) => void submit(event)} noValidate>
          <label htmlFor="auth-email">Email address</label>
          <input
            id="auth-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            aria-invalid={Boolean(fieldErrors.email)}
            aria-describedby={fieldErrors.email ? "auth-email-error" : undefined}
            placeholder="you@example.com"
          />
          {fieldErrors.email && <span className="auth-field-error" id="auth-email-error">{fieldErrors.email}</span>}

          <div className="auth-password-label"><label htmlFor="auth-password">Password</label>{mode === "sign-up" && <span>12+ characters</span>}</div>
          <div className="auth-password-field">
            <input
              id="auth-password"
              type={visiblePassword ? "text" : "password"}
              autoComplete={mode === "sign-in" ? "current-password" : "new-password"}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              aria-invalid={Boolean(fieldErrors.password)}
              aria-describedby={fieldErrors.password ? "auth-password-error" : undefined}
              placeholder={mode === "sign-in" ? "Enter your password" : "Create a strong password"}
            />
            <button type="button" className="auth-password-toggle" aria-label={visiblePassword ? "Hide password" : "Show password"} onClick={() => setVisiblePassword((visible) => !visible)}>
              {visiblePassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {fieldErrors.password && <span className="auth-field-error" id="auth-password-error">{fieldErrors.password}</span>}

          {mode === "sign-up" && (
            <>
              <label htmlFor="auth-confirmation">Confirm password</label>
              <input
                id="auth-confirmation"
                type={visiblePassword ? "text" : "password"}
                autoComplete="new-password"
                value={confirmation}
                onChange={(event) => setConfirmation(event.target.value)}
                aria-invalid={Boolean(fieldErrors.confirmation)}
                aria-describedby={fieldErrors.confirmation ? "auth-confirmation-error" : undefined}
                placeholder="Enter your password again"
              />
              {fieldErrors.confirmation && <span className="auth-field-error" id="auth-confirmation-error">{fieldErrors.confirmation}</span>}
            </>
          )}

          {error && <div className="auth-feedback is-error" role="alert">{error}</div>}
          {notice && <div className="auth-feedback is-success" role="status">{notice}</div>}
          {!supabaseConfigured && (
            <div className="auth-config-note" role="status">Account service needs Supabase setup. Guest practice is ready now.</div>
          )}
          <button className="auth-submit" type="submit" disabled={submitting}>
            {submitting ? <LoaderCircle className="spin" size={16} /> : null}
            {submitting ? "Connecting..." : mode === "sign-in" ? "Sign in to Verdict" : "Create learner account"}
            {!submitting && <ArrowRight size={16} />}
          </button>
        </form>

        <p className="auth-privacy">Your password is handled by Supabase Auth. Verdict never sees or stores it.</p>
      </section>
    </main>
  );
}
