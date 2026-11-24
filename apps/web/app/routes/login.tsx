import { Form, Link, redirect, useNavigation } from "react-router";
import { createAuth } from "@iwfw/auth";
import { createDb, eq, platformRoles } from "@iwfw/db";
import { getConfig, getEnv } from "../lib/env.server";
import {
  getOptionalAuth,
  homePathForAuth,
} from "../lib/session.server";
import {
  readAuthJson,
  redirectWithAuthCookies,
} from "../lib/auth-response.server";
import { newId } from "../lib/ids";
import { log } from "../lib/logger";
import { FormAlert, StepHeader } from "../components/start-funnel";
import { QuestionnaireField } from "../components/questionnaire-field";
import type { Route } from "./+types/login";
import "../start.css";

export function meta(_args: Route.MetaArgs) {
  return [{ title: "Log in — iwantfreewebsite" }];
}

export async function loader({ request, context }: Route.LoaderArgs) {
  const auth = await getOptionalAuth(request, context);
  if (auth) throw redirect(homePathForAuth(auth));
  const url = new URL(request.url);
  if (!url.searchParams.has("legacy")) {
    throw redirect("/get-started/account?mode=login");
  }
  return null;
}

export async function action({ request, context }: Route.ActionArgs) {
  const form = await request.formData();
  const email = String(form.get("email") ?? "");
  const password = String(form.get("password") ?? "");

  try {
    const env = getEnv(context);
    const config = getConfig(context);
    const auth = createAuth(env.DB, config);
    const result = await auth.api.signInEmail({
      body: { email, password },
      asResponse: true,
    });

    if (!result.ok) {
      return { error: "Invalid email or password." };
    }

    const payload = await readAuthJson<{ user?: { id: string; email?: string } }>(
      result,
    );
    const userId = payload?.user?.id;
    const userEmail = (payload?.user?.email ?? email).toLowerCase();

    // Local/staging bootstrap: grant platform_owner if email matches and no role yet.
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
        log("info", "bootstrap_owner_granted_on_login", { userId });
      }
    }

    let next = "/dashboard";
    if (userId) {
      const db = createDb(env.DB);
      const roles = await db
        .select()
        .from(platformRoles)
        .where(eq(platformRoles.userId, userId))
        .all();
      next = homePathForAuth({ staffRoles: roles.map((r) => r.role) });
    }

    return redirectWithAuthCookies(result, next);
  } catch (error) {
    log("error", "login_failed", {
      error: error instanceof Error ? error.message : "unknown",
    });
    return { error: "Unable to log in. Please try again." };
  }
}

export default function Login({ actionData }: Route.ComponentProps) {
  const navigation = useNavigation();
  const busy = navigation.state !== "idle";

  return (
    <main className="st-auth">
      <div className="st-wrap">
        <StepHeader
          kicker="Account"
          title="Log in"
          lead="Prefer the guided path? Start from Get started — this page is kept for bookmarks."
        />
        <Form method="post" className="st-sheet st-form">
          <QuestionnaireField
            label="Email"
            name="email"
            type="email"
            required
            autoComplete="email"
            markOptional={false}
          />
          <QuestionnaireField
            label="Password"
            name="password"
            type="password"
            required
            minLength={10}
            autoComplete="current-password"
            markOptional={false}
          />
          {actionData?.error ? (
            <FormAlert tone="error">{actionData.error}</FormAlert>
          ) : null}
          <button
            type="submit"
            className="st-btn st-btn--go st-btn--block"
            disabled={busy}
          >
            {busy ? "Signing in…" : "Log in"}
          </button>
        </Form>
        <p className="st-fine">
          <Link to="/forgot-password">Forgot password?</Link>
          {" · "}
          No account? <Link to="/get-started">Get started</Link>
          {" · "}
          Staff? <Link to="/admin/login">Operations sign in</Link>
        </p>
      </div>
    </main>
  );
}
