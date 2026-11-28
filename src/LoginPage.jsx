import { useId, useState } from "react";
import { Eye, EyeOff, LogIn } from "lucide-react";
import { signIn } from "./auth.js";

export default function LoginPage({ onSignIn }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const emailId = useId();
  const passwordId = useId();
  const errorId = useId();

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const user = await signIn(email, password);
      if (user) {
        onSignIn(user);
        return;
      }
      setError("That email and password don't match. Check them and try again.");
    } catch (err) {
      setError(err.message);
    }
    setBusy(false);
  };

  return (
    <main className="login-page">
      <div className="login-card animate-hero-1">
        <div className="login-brand">
          <img
            className="brand-mark"
            src="/images/aakar-realities-logo.png"
            alt="Aakar Realities Logo"
          />
          <div className="brand-copy">
            <span className="brand-name">
              Aakar <strong>Realities</strong>
            </span>
            <span className="brand-tagline">Corporate Workspace</span>
          </div>
        </div>

        <h1 className="login-title">Sign in</h1>
        <p className="login-subtitle">Use your work email to open your tools.</p>

        <form className="login-form" onSubmit={submit} noValidate>
          <label className="login-label" htmlFor={emailId}>
            Email
          </label>
          <input
            id={emailId}
            className="login-input"
            type="email"
            inputMode="email"
            autoComplete="username"
            autoCapitalize="none"
            spellCheck="false"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-describedby={error ? errorId : undefined}
            aria-invalid={Boolean(error)}
          />

          <label className="login-label" htmlFor={passwordId}>
            Password
          </label>
          <div className="login-password">
            <input
              id={passwordId}
              className="login-input"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              aria-describedby={error ? errorId : undefined}
              aria-invalid={Boolean(error)}
            />
            <button
              type="button"
              className="login-reveal"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              aria-pressed={showPassword}
            >
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>

          {error && (
            <p id={errorId} className="login-error" role="alert">
              {error}
            </p>
          )}

          <button
            type="submit"
            className="login-submit"
            disabled={busy || !email.trim() || !password}
          >
            <LogIn size={20} aria-hidden="true" />
            {busy ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>
    </main>
  );
}
