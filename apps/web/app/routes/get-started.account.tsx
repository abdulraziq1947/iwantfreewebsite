import { Form, Link, redirect, useNavigation, useSearchParams } from "react-router";
import { Button, Input } from "@iwfw/ui";
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
import { registerCustomer } from "../lib/register-customer.server";
import { getCustomerWorkspace } from "../lib/customer-org.server";
import { newId } from "../lib/ids";
import { log } from "../lib/logger";
import type { Route } from "./+types/get-started.account";

export function meta(_args: Route.MetaArgs) {
  return [{ title: "Create account — iwantfreewebsite.com" }];
}

export async function loader({ request, context }: Route.LoaderArgs) {
  const auth = await getOptionalAuth(request, context);
  if (auth) {
    if (auth.staffRoles.length > 0) {
      throw redirect(homePathForAuth(auth));
    }
    const db = createDb(getEnv(context).DB);
    const workspace = await getCustomerWorkspace(db, auth, getConfig(context));
    if (workspace.primary && !workspace.needsSubscription) {
      throw redirect("/dashboard");
    }
    throw redirect("/get-started/review");
  }
  return null;
}

export async function action({ request, context }: Route.ActionArgs) {
  const form = await request.formData();
  const intent = String(form.get("intent") ?? "signup");
  const env = getEnv(context);
  const config = getConfig(context);

  if (intent === "login") {
    const email = String(form.get("email") ?? "").trim().toLowerCase();
    const password = String(form.get("password") ?? "");
    try {
      const auth = createAuth(env.DB, config);
      const result = await auth.api.signInEmail({
        body: { email, password },
        asResponse: true,
      });
      if (!result.ok) {
        return { error: "Invalid email or password.", mode: "login" as const };
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
          log("info", "bootstrap_owner_granted_on_login", { userId });
        }
      }

      let next = "/get-started/review";
      if (userId) {
        const db = createDb(env.DB);
        const roles = await db
          .select()
          .from(platformRoles)
          .where(eq(platformRoles.userId, userId))
          .all();
        if (roles.length > 0) {
          next = homePathForAuth({ staffRoles: roles.map((r) => r.role) });
        }
      }

      return redirectWithAuthCookies(result, next);
    } catch (error) {
      log("error", "get_started_login_failed", {
        error: error instanceof Error ? error.message : "unknown",
      });
      return {
        error: "Unable to log in. Please try again.",
        mode: "login" as const,
      };
    }
  }

  const name = String(form.get("name") ?? "");
  const email = String(form.get("email") ?? "");
  const password = String(form.get("password") ?? "");
  const confirmPassword = String(form.get("confirmPassword") ?? "");
  const tradingName = String(form.get("tradingName") ?? "");

  if (password !== confirmPassword) {
    return {
      error: "Passwords do not match.",
      mode: "signup" as const,
    };
  }

  const result = await registerCustomer(env, config, {
    name,
    email,
    password,
    tradingName,
  });
  if (!result.ok) {
    return { error: result.error, mode: "signup" as const };
  }
  return redirectWithAuthCookies(result.response, "/get-started/review");
}

export default function GetStartedAccount({
  actionData,
}: Route.ComponentProps) {
  const navigation = useNavigation();
  const busy = navigation.state !== "idle";
  const [params] = useSearchParams();
  const mode =
    actionData?.mode ??
    (params.get("mode") === "login" ? "login" : "signup");

  return (
    <div className="iwfw-start">
      <header className="iwfw-start__intro">
        <p className="iwfw-start__kicker">Step 2 of 3</p>
        <h1>{mode === "login" ? "Welcome back" : "Create your account"}</h1>
        <p className="iwfw-start__lead">
          {mode === "login"
            ? "Log in to continue to payment. We’ll never create a duplicate account."
            : "Set up your login. You can finish business details after payment."}
        </p>
      </header>

      <div className="iwfw-start__tabs" role="tablist" aria-label="Account">
        <Link
          to="/get-started/account"
          className={`iwfw-start__tab${mode === "signup" ? " is-active" : ""}`}
          role="tab"
          aria-selected={mode === "signup"}
        >
          New customer
        </Link>
        <Link
          to="/get-started/account?mode=login"
          className={`iwfw-start__tab${mode === "login" ? " is-active" : ""}`}
          role="tab"
          aria-selected={mode === "login"}
        >
          Existing customer
        </Link>
      </div>

      <Form method="post" className="iwfw-start__card iwfw-start__form">
        {mode === "login" ? (
          <>
            <input type="hidden" name="intent" value="login" />
            <label className="iwfw-field">
              <span>Email</span>
              <Input name="email" type="email" required autoComplete="email" />
            </label>
            <label className="iwfw-field">
              <span>Password</span>
              <Input
                name="password"
                type="password"
                required
                minLength={10}
                autoComplete="current-password"
              />
            </label>
            <p className="iwfw-start__fine">
              <Link to="/forgot-password">Forgot password?</Link>
            </p>
          </>
        ) : (
          <>
            <input type="hidden" name="intent" value="signup" />
            <label className="iwfw-field">
              <span>Full name *</span>
              <Input name="name" required autoComplete="name" />
            </label>
            <label className="iwfw-field">
              <span>Business / trading name *</span>
              <Input name="tradingName" required autoComplete="organization" />
            </label>
            <label className="iwfw-field">
              <span>Email *</span>
              <Input name="email" type="email" required autoComplete="email" />
            </label>
            <label className="iwfw-field">
              <span>Password *</span>
              <Input
                name="password"
                type="password"
                required
                minLength={10}
                autoComplete="new-password"
              />
              <em>At least 10 characters</em>
            </label>
            <label className="iwfw-field">
              <span>Confirm password *</span>
              <Input
                name="confirmPassword"
                type="password"
                required
                minLength={10}
                autoComplete="new-password"
              />
            </label>
          </>
        )}

        {actionData?.error && (
          <p className="iwfw-start__error" role="alert">
            {actionData.error}
          </p>
        )}

        <Button type="submit" disabled={busy} className="w-full">
          {busy
            ? mode === "login"
              ? "Signing in…"
              : "Creating account…"
            : mode === "login"
              ? "Log in & continue"
              : "Create account & continue"}
        </Button>
      </Form>

      <p className="iwfw-start__fine">
        <Link to="/get-started">← Back to package</Link>
      </p>
    </div>
  );
}
