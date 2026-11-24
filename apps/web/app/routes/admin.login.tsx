import { Form, Link, redirect, useNavigation } from "react-router";
import { createAuth } from "@iwfw/auth";
import { createDb, eq, platformRoles } from "@iwfw/db";
import { BrandLogo } from "../components/brand-logo";
import {
  readAuthJson,
  redirectWithAuthCookies,
} from "../lib/auth-response.server";
import { getConfig, getEnv } from "../lib/env.server";
import { newId } from "../lib/ids";
import { log } from "../lib/logger";
import {
  getOptionalAuth,
  homePathForAuth,
} from "../lib/session.server";
import type { Route } from "./+types/admin.login";

export function meta(_args: Route.MetaArgs) {
  return [{ title: "Staff sign in — iwantfreewebsite" }];
}

export function headers() {
  return {
    "X-Robots-Tag": "noindex, nofollow",
  };
}

export async function loader({ request, context }: Route.LoaderArgs) {
  const auth = await getOptionalAuth(request, context);
  if (auth?.staffRoles.length) {
    throw redirect(homePathForAuth(auth));
  }
  if (auth) {
    // Customer session on the staff portal — send them to their dashboard.
    throw redirect("/dashboard");
  }
  return null;
}

export async function action({ request, context }: Route.ActionArgs) {
  const form = await request.formData();
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");

  try {
    const env = getEnv(context);
    const config = getConfig(context);
    const authApi = createAuth(env.DB, config);
    const result = await authApi.api.signInEmail({
      body: { email, password },
      asResponse: true,
    });

    if (!result.ok) {
      return { error: "Invalid email or password." };
    }

    const payload = await readAuthJson<{
      user?: { id: string; email?: string };
    }>(result);
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
      return { error: "Unable to complete staff sign-in." };
    }

    const db = createDb(env.DB);
    const roles = await db
      .select()
      .from(platformRoles)
      .where(eq(platformRoles.userId, userId))
      .all();

    if (roles.length === 0) {
      // Do not leave a customer session cookie on the staff portal response.
      await authApi.api.signOut({
        headers: result.headers,
        asResponse: true,
      });
      return {
        error:
          "This portal is for staff only. Customers should use the customer log in page.",
      };
    }

    return redirectWithAuthCookies(
      result,
      homePathForAuth({ staffRoles: roles.map((r) => r.role) }),
    );
  } catch (error) {
    log("error", "admin_login_failed", {
      error: error instanceof Error ? error.message : "unknown",
    });
    return { error: "Unable to log in. Please try again." };
  }
}

export default function AdminLogin({ actionData }: Route.ComponentProps) {
  const navigation = useNavigation();
  const busy = navigation.state !== "idle";

  return (
    <main className="iwfw-admin-login">
      <div className="iwfw-admin-login__card">
        <p className="iwfw-admin-login__eyebrow">Operations · staff only</p>
        <Link to="/admin/login" className="iwfw-admin-login__brand" aria-label="Staff sign in">
          <BrandLogo size={32} withWordmark variant="admin" />
        </Link>
        <h1>Staff sign in</h1>
        <p className="iwfw-admin-login__lead">
          Sign in to the operations console. Customer accounts use a different
          log in page.
        </p>

        <Form method="post" className="iwfw-admin-login__form">
          <label className="iwfw-field">
            <span>Email</span>
            <input
              className="iwfw-control"
              name="email"
              type="email"
              required
              autoComplete="username"
            />
          </label>
          <label className="iwfw-field">
            <span>Password</span>
            <input
              className="iwfw-control"
              name="password"
              type="password"
              required
              minLength={10}
              autoComplete="current-password"
            />
          </label>
          {actionData?.error ? (
            <p className="iwfw-admin-login__error" role="alert">
              {actionData.error}
            </p>
          ) : null}
          <button
            type="submit"
            className="iwfw-btn iwfw-btn--primary"
            disabled={busy}
          >
            {busy ? "Signing in…" : "Sign in to admin"}
          </button>
        </Form>

        <p className="iwfw-admin-login__fine">
          <Link to="/forgot-password">Forgot password?</Link>
          {" · "}
          <Link to="/get-started/account?mode=login">Customer log in</Link>
        </p>
      </div>
    </main>
  );
}
