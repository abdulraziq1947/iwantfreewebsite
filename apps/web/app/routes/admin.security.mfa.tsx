import { useState } from "react";
import { Link, redirect } from "react-router";
import { requireStaffSession } from "../lib/session.server";
import type { Route } from "./+types/admin.security.mfa";

export function meta(_args: Route.MetaArgs) {
  return [{ title: "Staff MFA — Admin" }];
}

export async function loader({ request, context }: Route.LoaderArgs) {
  const auth = await requireStaffSession(request, context);
  if (auth.twoFactorEnabled) {
    throw redirect("/admin");
  }
  return { email: auth.email };
}

export default function AdminMfaSetupPage({ loaderData }: Route.ComponentProps) {
  const [password, setPassword] = useState("");
  const [totpURI, setTotpURI] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  async function enableTotp(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/two-factor/enable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ password }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        totpURI?: string;
        message?: string;
        error?: string;
      };
      if (!res.ok) {
        setError(data.message || data.error || "Could not start MFA setup.");
        return;
      }
      setTotpURI(data.totpURI || null);
    } catch {
      setError("Network error starting MFA.");
    } finally {
      setBusy(false);
    }
  }

  async function verifyTotp(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/two-factor/verify-totp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ code }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        message?: string;
        error?: string;
      };
      if (!res.ok) {
        setError(data.message || data.error || "Invalid code. Try again.");
        return;
      }
      setDone(true);
      window.location.href = "/admin";
    } catch {
      setError("Network error verifying code.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="iwfw-admin-page" style={{ maxWidth: "32rem" }}>
      <header className="iwfw-admin-page__header">
        <div>
          <p className="iwfw-admin-page__eyebrow">Security</p>
          <h1>Set up staff MFA</h1>
          <p>
            Platform staff must enable two-factor authentication before using
            the admin panel. Signed in as {loaderData.email}.
          </p>
        </div>
      </header>

      {error ? (
        <p className="iwfw-start__error" role="alert">
          {error}
        </p>
      ) : null}

      {!totpURI ? (
        <FormCard
          title="Confirm your password"
          onSubmit={enableTotp}
          busy={busy}
          submitLabel={busy ? "Starting…" : "Generate authenticator QR"}
        >
          <label className="iwfw-field">
            <span>Account password</span>
            <input
              className="iwfw-control"
              type="password"
              name="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(ev) => setPassword(ev.target.value)}
            />
          </label>
        </FormCard>
      ) : (
        <FormCard
          title="Scan and verify"
          onSubmit={verifyTotp}
          busy={busy || done}
          submitLabel={done ? "Redirecting…" : busy ? "Verifying…" : "Verify & continue"}
        >
          <p className="iwfw-admin-muted">
            Add this account in your authenticator app, then enter the 6-digit
            code.
          </p>
          {totpURI ? (
            <p className="iwfw-dash-fine" style={{ wordBreak: "break-all" }}>
              <code>{totpURI}</code>
            </p>
          ) : null}
          <label className="iwfw-field">
            <span>Authenticator code</span>
            <input
              className="iwfw-control"
              inputMode="numeric"
              pattern="[0-9]{6}"
              maxLength={6}
              required
              value={code}
              onChange={(ev) => setCode(ev.target.value)}
              autoComplete="one-time-code"
            />
          </label>
        </FormCard>
      )}

      <p className="iwfw-admin-muted" style={{ marginTop: "1rem" }}>
        <Link to="/dashboard">Back to customer dashboard</Link>
      </p>
    </div>
  );
}

function FormCard({
  title,
  children,
  onSubmit,
  busy,
  submitLabel,
}: {
  title: string;
  children: React.ReactNode;
  onSubmit: (e: React.FormEvent) => void;
  busy: boolean;
  submitLabel: string;
}) {
  return (
    <section className="iwfw-admin-panel">
      <div className="iwfw-admin-panel__head">
        <h2>{title}</h2>
      </div>
      <form onSubmit={onSubmit} className="iwfw-start__form">
        {children}
        <button
          type="submit"
          className="iwfw-btn iwfw-btn--green"
          disabled={busy}
        >
          {submitLabel}
        </button>
      </form>
    </section>
  );
}
