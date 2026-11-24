import { useState } from "react";
import { Link, redirect } from "react-router";
import { TotpQrCode } from "../components/totp-qr";
import { requireStaffSession } from "../lib/session.server";
import { manualSetupKeyFromUri } from "../lib/totp-setup";
import { AdminPageHeader } from "../components/admin-ui";
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

type Step = "password" | "enroll" | "recovery";

type EnableResponse = {
  totpURI?: string;
  backupCodes?: string[];
  message?: string;
  error?: string;
};

/**
 * Parse Better Auth JSON without logging sensitive fields.
 * Never console.log totpURI, secrets, or backup codes.
 */
function readAuthError(data: EnableResponse, fallback: string): string {
  return data.message || data.error || fallback;
}

export default function AdminMfaSetupPage({ loaderData }: Route.ComponentProps) {
  const [step, setStep] = useState<Step>("password");
  const [password, setPassword] = useState("");
  const [totpURI, setTotpURI] = useState<string | null>(null);
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedCodes, setCopiedCodes] = useState(false);

  const manualKey = totpURI ? manualSetupKeyFromUri(totpURI) : null;

  async function startEnrollment(e?: React.FormEvent) {
    e?.preventDefault();
    if (!password) {
      setError("Enter your account password to continue.");
      return;
    }
    setBusy(true);
    setError(null);
    setCopiedKey(false);
    try {
      // Calling enable again replaces any unverified pending secret.
      const res = await fetch("/api/auth/two-factor/enable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ password, method: "totp" }),
      });
      const data = (await res.json().catch(() => ({}))) as EnableResponse;
      if (!res.ok) {
        setError(readAuthError(data, "Could not start MFA setup."));
        return;
      }
      if (!data.totpURI) {
        setError("Authenticator setup data was missing. Try again.");
        return;
      }
      setTotpURI(data.totpURI);
      setBackupCodes(Array.isArray(data.backupCodes) ? data.backupCodes : []);
      setCode("");
      setStep("enroll");
    } catch {
      setError("Network error starting MFA.");
    } finally {
      setBusy(false);
    }
  }

  async function regenerateSecret() {
    await startEnrollment();
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
      const data = (await res.json().catch(() => ({}))) as EnableResponse;
      if (!res.ok) {
        setError(readAuthError(data, "Invalid code. Try again."));
        return;
      }
      // Clear provisioning material from memory once verified.
      setTotpURI(null);
      setPassword("");
      setCode("");
      setStep("recovery");
    } catch {
      setError("Network error verifying code.");
    } finally {
      setBusy(false);
    }
  }

  async function copyText(value: string, kind: "key" | "codes") {
    try {
      await navigator.clipboard.writeText(value);
      if (kind === "key") {
        setCopiedKey(true);
        window.setTimeout(() => setCopiedKey(false), 2000);
      } else {
        setCopiedCodes(true);
        window.setTimeout(() => setCopiedCodes(false), 2000);
      }
    } catch {
      setError("Could not copy to clipboard. Select the text and copy manually.");
    }
  }

  return (
    <div className="adm-page adm-page--narrow">
      <AdminPageHeader
        kicker="Security"
        title="Set up staff MFA"
        lead={`Platform staff must enable two-factor authentication before using the admin panel. Signed in as ${loaderData.email}.`}
      />

      {error ? (
        <p className="adm-alert adm-alert--error" role="alert">
          {error}
        </p>
      ) : null}

      {step === "password" ? (
        <section className="adm-sheet" aria-labelledby="adm-mfa-pw">
          <div className="adm-sheet__head">
            <h2 id="adm-mfa-pw">Confirm your password</h2>
          </div>
          <form onSubmit={startEnrollment} className="adm-form">
            <label className="adm-field">
              <span>Account password</span>
              <input
                className="adm-input"
                type="password"
                name="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(ev) => setPassword(ev.target.value)}
                disabled={busy}
              />
            </label>
            <p className="adm-note">
              We generate a new authenticator secret each time you start setup. Any
              previous pending secret is replaced and cannot be reused.
            </p>
            <button type="submit" className="adm-btn adm-btn--go" disabled={busy}>
              {busy ? "Starting…" : "Continue to authenticator setup"}
            </button>
          </form>
        </section>
      ) : null}

      {step === "enroll" && totpURI ? (
        <section className="adm-sheet" aria-labelledby="adm-mfa-scan">
          <div className="adm-sheet__head">
            <h2 id="adm-mfa-scan">Scan and verify</h2>
          </div>

          <ol className="adm-mfa-steps">
            <li>
              Open <strong>Google Authenticator</strong> or{" "}
              <strong>Microsoft Authenticator</strong> on your phone.
            </li>
            <li>
              Choose <strong>Add account</strong> / <strong>+</strong>, then{" "}
              <strong>Scan a QR code</strong>.
            </li>
            <li>
              If you cannot scan, choose <strong>Enter a setup key</strong> and paste the
              key below.
            </li>
            <li>Enter the 6-digit code shown in the app to finish.</li>
          </ol>

          <div className="adm-mfa-qr">
            <TotpQrCode totpURI={totpURI} />
            <p className="adm-note">
              Point your camera at this code. Do not screenshot and share it.
            </p>
          </div>

          {manualKey ? (
            <div className="adm-mfa-box">
              <div className="adm-mfa-box__head">
                <span>Manual setup key</span>
                <button
                  type="button"
                  className="adm-btn adm-btn--sm"
                  onClick={() => copyText(manualKey.replace(/\s+/g, ""), "key")}
                  disabled={busy}
                >
                  {copiedKey ? "Copied" : "Copy"}
                </button>
              </div>
              <code className="adm-mfa-key" data-testid="mfa-manual-key">
                {manualKey}
              </code>
              <p className="adm-hint">
                Account name: iwantfreewebsite · Type: Time-based
              </p>
            </div>
          ) : null}

          <form onSubmit={verifyTotp} className="adm-form">
            <label className="adm-field">
              <span>6-digit authenticator code</span>
              <input
                className="adm-input"
                inputMode="numeric"
                pattern="[0-9]{6}"
                maxLength={6}
                required
                value={code}
                onChange={(ev) => setCode(ev.target.value.replace(/\D/g, ""))}
                autoComplete="one-time-code"
                disabled={busy}
              />
            </label>
            <button
              type="submit"
              className="adm-btn adm-btn--go"
              disabled={busy || code.length !== 6}
            >
              {busy ? "Verifying…" : "Verify & activate MFA"}
            </button>
          </form>

          <div className="adm-mfa-regen">
            <p className="adm-note">
              Seen this key elsewhere, or need a fresh QR? Generate a new secret before
              verifying — the previous pending secret will stop working.
            </p>
            <button
              type="button"
              className="adm-btn"
              onClick={regenerateSecret}
              disabled={busy || !password}
            >
              {busy ? "Regenerating…" : "Generate a new setup key"}
            </button>
          </div>
        </section>
      ) : null}

      {step === "recovery" ? (
        <section
          className="adm-sheet"
          data-testid="mfa-recovery"
          aria-labelledby="adm-mfa-done"
        >
          <div className="adm-sheet__head">
            <h2 id="adm-mfa-done">MFA activated</h2>
          </div>
          <p className="adm-alert adm-alert--ok" role="status">
            Two-factor authentication is on for your staff account.
          </p>
          {backupCodes.length > 0 ? (
            <>
              <p className="adm-note">
                Save these recovery codes somewhere safe. Each code can be used once if
                you lose access to your authenticator app.
              </p>
              <div className="adm-mfa-box">
                <div className="adm-mfa-box__head">
                  <span>Recovery codes</span>
                  <button
                    type="button"
                    className="adm-btn adm-btn--sm"
                    onClick={() => copyText(backupCodes.join("\n"), "codes")}
                  >
                    {copiedCodes ? "Copied" : "Copy all"}
                  </button>
                </div>
                <ul className="adm-mfa-codes">
                  {backupCodes.map((c) => (
                    <li key={c}>
                      <code>{c}</code>
                    </li>
                  ))}
                </ul>
              </div>
            </>
          ) : (
            <p className="adm-note">
              Recovery codes were not returned by the auth service. You can continue to
              the admin panel.
            </p>
          )}
          <a className="adm-btn adm-btn--go" href="/admin">
            Continue to admin
          </a>
        </section>
      ) : null}

      <p className="adm-note">
        <Link to="/dashboard">Back to customer dashboard</Link>
      </p>
    </div>
  );
}
