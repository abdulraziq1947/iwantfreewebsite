import { useEffect } from "react";
import {
  Form,
  Link,
  redirect,
  useNavigate,
  useNavigation,
  useSearchParams,
} from "react-router";
import { createAuth } from "@iwfw/auth";
import { createDb, eq, platformRoles } from "@iwfw/db";
import { BrandLogo } from "../components/brand-logo";
import {
  dataWithAuthCookies,
  readAuthJson,
  redirectWithAuthCookies,
} from "../lib/auth-response.server";
import { getConfig, getEnv } from "../lib/env.server";
import { newId } from "../lib/ids";
import { log } from "../lib/logger";
import { getOptionalAuth, homePathForAuth } from "../lib/session.server";
import type { Route } from "./+types/admin.login";
import "../admin.css";

export function meta(_args: Route.MetaArgs) {
  return [{ title: "Staff sign in — iwantfreewebsite" }];
}

export function headers() {
  return {
    "X-Robots-Tag": "noindex, nofollow",
  };
}

async function staffHomeAfterAuth(
  env: { DB: D1Database },
  userId: string,
  authResponse: Response,
): Promise<Response | { error: string }> {
  const db = createDb(env.DB);
  const roles = await db
    .select()
    .from(platformRoles)
    .where(eq(platformRoles.userId, userId))
    .all();

  if (roles.length === 0) {
    return {
      error:
        "This portal is for staff only. Customers should use the customer log in page.",
    };
  }

  return redirectWithAuthCookies(
    authResponse,
    homePathForAuth({ staffRoles: roles.map((r) => r.role) }),
  );
}

export async function loader({ request, context }: Route.LoaderArgs) {
  const auth = await getOptionalAuth(request, context);
  if (auth?.staffRoles.length) {
    throw redirect(homePathForAuth(auth));
  }
  if (auth) {
    throw redirect("/dashboard");
  }
  const step = new URL(request.url).searchParams.get("step");
  return { step: step === "mfa" ? ("mfa" as const) : ("password" as const) };
}

export async function action({ request, context }: Route.ActionArgs) {
  const form = await request.formData();
  const intent = String(form.get("intent") ?? "password");
  const env = getEnv(context);
  const config = getConfig(context);
  const authApi = createAuth(env.DB, config);

  try {
    if (intent === "verify_totp" || intent === "verify_backup") {
      const code = String(form.get("code") ?? "").trim();
      if (!code) {
        return {
          error: "Enter the code from your authenticator app.",
          step: "mfa" as const,
        };
      }

      const result =
        intent === "verify_backup"
          ? await authApi.api.verifyBackupCode({
              body: { code },
              headers: request.headers,
              asResponse: true,
            })
          : await authApi.api.verifyTOTP({
              body: { code },
              headers: request.headers,
              asResponse: true,
            });

      if (!result.ok) {
        return {
          error:
            intent === "verify_backup"
              ? "Invalid backup code. Try again."
              : "Invalid authenticator code. Try again.",
          step: "mfa" as const,
        };
      }

      const payload = await readAuthJson<{ user?: { id: string } }>(result);
      const userId = payload?.user?.id;
      if (!userId) {
        return {
          error: "Unable to complete MFA sign-in. Start again from email/password.",
          step: "password" as const,
        };
      }

      const next = await staffHomeAfterAuth(env, userId, result);
      if ("error" in next) {
        await authApi.api.signOut({
          headers: result.headers,
          asResponse: true,
        });
        return { error: next.error, step: "password" as const };
      }
      return next;
    }

    const email = String(form.get("email") ?? "")
      .trim()
      .toLowerCase();
    const password = String(form.get("password") ?? "");
    const result = await authApi.api.signInEmail({
      body: { email, password },
      asResponse: true,
    });

    if (!result.ok) {
      return { error: "Invalid email or password.", step: "password" as const };
    }

    const payload = await readAuthJson<{
      user?: { id: string; email?: string };
      twoFactorRedirect?: boolean;
    }>(result);

    // MFA enrolled: password is correct; keep the same route so the form
    // swaps to the code step immediately (same-route 302 left a stale UI).
    if (payload?.twoFactorRedirect) {
      return dataWithAuthCookies(result, { step: "mfa" as const });
    }

    const userId = payload?.user?.id;
    const userEmail = (payload?.user?.email ?? email).toLowerCase();

    if (
      config.BOOTSTRAP_OWNER_EMAIL &&
      userId &&
      userEmail === config.BOOTSTRAP_OWNER_EMAIL.toLowerCase()
    ) {
      const db = createDb(env.DB);
      const existing = await db
        .select()
        .from(platformRoles)
        .where(eq(platformRoles.userId, userId))
        .get();
      if (!existing) {
        await db.insert(platformRoles).values({
          id: newId("role"),
          userId,
          role: "platform_owner",
        });
        log("info", "bootstrap_owner_granted_on_admin_login", { userId });
      }
    }

    if (!userId) {
      return {
        error: "Unable to complete staff sign-in.",
        step: "password" as const,
      };
    }

    const next = await staffHomeAfterAuth(env, userId, result);
    if ("error" in next) {
      await authApi.api.signOut({
        headers: result.headers,
        asResponse: true,
      });
      return { error: next.error, step: "password" as const };
    }
    return next;
  } catch (error) {
    log("error", "admin_login_failed", {
      error: error instanceof Error ? error.message : "unknown",
      intent,
    });
    return {
      error: "Unable to log in. Please try again.",
      step: intent.startsWith("verify") ? ("mfa" as const) : ("password" as const),
    };
  }
}

export default function AdminLogin({ loaderData, actionData }: Route.ComponentProps) {
  const navigation = useNavigation();
  const navigate = useNavigate();
  const busy = navigation.state !== "idle";
  const [params] = useSearchParams();
  const step =
    actionData && "step" in actionData && actionData.step
      ? actionData.step
      : loaderData.step === "mfa" || params.get("step") === "mfa"
        ? "mfa"
        : "password";

  // Keep ?step=mfa in the URL so a refresh still shows the code form.
  useEffect(() => {
    if (step === "mfa" && params.get("step") !== "mfa") {
      navigate("/admin/login?step=mfa", { replace: true });
    }
  }, [navigate, params, step]);

  return (
    <main className="adm-login">
      <div className="adm-login__card">
        <p className="adm-login__kicker">Operations · staff only</p>
        <Link to="/admin/login" className="adm-login__brand" aria-label="Staff sign in">
          <BrandLogo size={32} withWordmark variant="admin" />
        </Link>
        <h1>{step === "mfa" ? "Authenticator code" : "Staff sign in"}</h1>
        <p className="adm-login__lead">
          {step === "mfa"
            ? "Enter the 6-digit code from your authenticator app, or a one-time backup code."
            : "Sign in to the operations console. Customer accounts use a different log in page."}
        </p>

        {step === "mfa" ? (
          <Form method="post" className="adm-login__form">
            <label className="adm-field">
              <span>Authentication code</span>
              <input
                className="adm-input"
                name="code"
                inputMode="numeric"
                autoComplete="one-time-code"
                required
                autoFocus
              />
            </label>
            {actionData && "error" in actionData && actionData.error ? (
              <p className="adm-alert adm-alert--error" role="alert">
                {actionData.error}
              </p>
            ) : null}
            <button
              type="submit"
              name="intent"
              value="verify_totp"
              className="adm-btn adm-btn--ink"
              disabled={busy}
            >
              {busy ? "Verifying…" : "Verify and continue"}
            </button>
            <button
              type="submit"
              name="intent"
              value="verify_backup"
              className="adm-btn"
              disabled={busy}
            >
              Use backup code
            </button>
            <p className="adm-login__fine">
              <Link to="/admin/login">← Back to email and password</Link>
            </p>
          </Form>
        ) : (
          <>
            <Form method="post" className="adm-login__form">
              <input type="hidden" name="intent" value="password" />
              <label className="adm-field">
                <span>Email</span>
                <input
                  className="adm-input"
                  name="email"
                  type="email"
                  required
                  autoComplete="username"
                />
              </label>
              <label className="adm-field">
                <span>Password</span>
                <input
                  className="adm-input"
                  name="password"
                  type="password"
                  required
                  minLength={10}
                  autoComplete="current-password"
                />
              </label>
              {actionData && "error" in actionData && actionData.error ? (
                <p className="adm-alert adm-alert--error" role="alert">
                  {actionData.error}
                </p>
              ) : null}
              <button type="submit" className="adm-btn adm-btn--ink" disabled={busy}>
                {busy ? "Signing in…" : "Sign in to admin"}
              </button>
            </Form>

            <p className="adm-login__fine">
              <Link to="/forgot-password">Forgot password?</Link>
              {" · "}
              <Link to="/get-started/account?mode=login">Customer log in</Link>
            </p>
          </>
        )}
      </div>
    </main>
  );
}
