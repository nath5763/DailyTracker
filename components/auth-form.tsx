"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { PASSWORD_HELP, passwordIsValid } from "@/lib/auth-validation";

type ApiError = { error?: string; code?: string };
type AuthResponse = { onboarded: boolean };

async function post(path: string, body: unknown) {
  return fetch(path, {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export function AuthForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "error">("idle");
  const [message, setMessage] = useState("");
  const [code, setCode] = useState("");

  async function submit(event: React.FormEvent) {
    event.preventDefault(); setStatus("sending"); setMessage(""); setCode("");
    const response = await post("/api/v1/auth/login", { email, password });
    const data = await response.json().catch(() => ({})) as AuthResponse & ApiError;
    if (!response.ok) {
      setStatus("error"); setCode(data.code ?? ""); setMessage(data.error ?? "Could not sign in."); return;
    }
    router.replace(data.onboarded ? "/dashboard" : "/onboarding"); router.refresh();
  }

  async function resend() {
    setStatus("sending");
    const response = await post("/api/v1/auth/verification/resend", { email });
    const data = await response.json().catch(() => ({})) as ApiError & { message?: string };
    setStatus(response.ok ? "idle" : "error");
    setMessage(response.ok ? (data.message ?? "Verification email sent.") : (data.error ?? "Could not resend verification."));
  }

  return <form className="form-stack" onSubmit={submit}>
    <div className="field"><label htmlFor="email">Email address</label><input id="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" required autoComplete="username" /></div>
    <div className="field"><label htmlFor="password">Password</label><input id="password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} required autoComplete="current-password" /></div>
    <div className="auth-links"><Link href="/auth/forgot-password">Forgot password?</Link><Link href="/auth/register">Create an account</Link></div>
    <button className="button" disabled={status === "sending"} type="submit">{status === "sending" ? "Signing in…" : "Sign in"}<span>→</span></button>
    {message ? <div className={`form-message ${status === "error" ? "error" : "success"}`} role="status">{message}</div> : null}
    {code === "EMAIL_NOT_VERIFIED" ? <button className="text-button" disabled={status === "sending"} type="button" onClick={resend}>Resend verification email</button> : null}
    {code === "PASSWORD_SETUP_REQUIRED" ? <Link className="text-button" href={`/auth/forgot-password?email=${encodeURIComponent(email)}`}>Set your first password</Link> : null}
  </form>;
}

export function RegisterForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [message, setMessage] = useState("");

  async function submit(event: React.FormEvent) {
    event.preventDefault(); setMessage("");
    if (password !== confirmation) { setMessage("Passwords do not match."); return; }
    if (!passwordIsValid(password)) { setMessage(PASSWORD_HELP); return; }
    setLoading(true);
    const response = await post("/api/v1/auth/register", { email, password });
    const data = await response.json().catch(() => ({})) as ApiError & { message?: string };
    setLoading(false);
    if (!response.ok) { setMessage(data.error ?? "Could not create your account."); return; }
    setSent(true); setMessage(data.message ?? "Check your inbox to verify your email.");
  }

  async function resend() {
    setLoading(true);
    const response = await post("/api/v1/auth/verification/resend", { email });
    const data = await response.json().catch(() => ({})) as ApiError & { message?: string };
    setLoading(false); setMessage(response.ok ? (data.message ?? "Verification email sent.") : (data.error ?? "Could not resend verification."));
  }

  if (sent) return <div className="form-stack"><div className="form-message success" role="status">{message}</div><button className="text-button" disabled={loading} type="button" onClick={resend}>{loading ? "Sending…" : "Resend verification email"}</button><Link href="/auth">Back to sign in</Link><Link href={`/auth/forgot-password?email=${encodeURIComponent(email)}`}>Already registered? Reset your password</Link></div>;
  return <form className="form-stack" onSubmit={submit}>
    <div className="field"><label htmlFor="register-email">Email address</label><input id="register-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required autoComplete="username" /></div>
    <div className="field"><label htmlFor="new-password">Password</label><input id="new-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} required autoComplete="new-password" aria-describedby="password-help" /><small id="password-help">{PASSWORD_HELP}</small></div>
    <div className="field"><label htmlFor="confirm-password">Confirm password</label><input id="confirm-password" type="password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} required autoComplete="new-password" /></div>
    {message ? <div className="form-message error" role="status">{message}</div> : null}
    <button className="button" disabled={loading} type="submit">{loading ? "Creating…" : "Create account"}<span>→</span></button>
    <Link href="/auth">Already have an account? Sign in</Link>
  </form>;
}

export function ForgotPasswordForm({ initialEmail = "" }: { initialEmail?: string }) {
  const [email, setEmail] = useState(initialEmail);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState(false);
  async function submit(event: React.FormEvent) {
    event.preventDefault(); setLoading(true); setError(false);
    const response = await post("/api/v1/auth/password/forgot", { email });
    const data = await response.json().catch(() => ({})) as ApiError & { message?: string };
    setLoading(false); setError(!response.ok);
    setMessage(response.ok ? (data.message ?? "Check your inbox for a reset link.") : (data.error ?? "Could not request a reset link."));
  }
  return <form className="form-stack" onSubmit={submit}>
    <div className="field"><label htmlFor="reset-email">Email address</label><input id="reset-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required autoComplete="username" /></div>
    <button className="button" disabled={loading} type="submit">{loading ? "Sending…" : "Send reset link"}<span>→</span></button>
    {message ? <div className={`form-message ${error ? "error" : "success"}`} role="status">{message}</div> : null}
    <Link href="/auth">Back to sign in</Link>
  </form>;
}

export function ResetPasswordForm({ token }: { token: string }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  async function submit(event: React.FormEvent) {
    event.preventDefault(); setMessage("");
    if (!token) { setMessage("This reset link is missing or invalid."); return; }
    if (password !== confirmation) { setMessage("Passwords do not match."); return; }
    if (!passwordIsValid(password)) { setMessage(PASSWORD_HELP); return; }
    setLoading(true);
    const response = await post("/api/v1/auth/password/reset", { token, password });
    const data = await response.json().catch(() => ({})) as AuthResponse & ApiError;
    if (!response.ok) { setLoading(false); setMessage(data.error ?? "Could not reset your password."); return; }
    router.replace(data.onboarded ? "/dashboard" : "/onboarding"); router.refresh();
  }
  return <form className="form-stack" onSubmit={submit}>
    <div className="field"><label htmlFor="reset-password">New password</label><input id="reset-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} required autoComplete="new-password" aria-describedby="reset-password-help" /><small id="reset-password-help">{PASSWORD_HELP}</small></div>
    <div className="field"><label htmlFor="reset-confirmation">Confirm new password</label><input id="reset-confirmation" type="password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} required autoComplete="new-password" /></div>
    {message ? <div className="form-message error" role="status">{message}</div> : null}
    <button className="button" disabled={loading || !token} type="submit">{loading ? "Saving…" : "Set new password"}<span>→</span></button>
    <Link href="/auth">Back to sign in</Link>
  </form>;
}
