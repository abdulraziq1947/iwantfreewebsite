import { redirect } from "react-router";
import { createAuth } from "@iwfw/auth";
import { getConfig, getEnv } from "../lib/env.server";
import { redirectWithAuthCookies } from "../lib/auth-response.server";
import type { Route } from "./+types/logout";

export async function loader() {
  throw redirect("/dashboard");
}

export async function action({ request, context }: Route.ActionArgs) {
  const env = getEnv(context);
  const config = getConfig(context);
  const auth = createAuth(env.DB, config);
  const form = await request.formData().catch(() => null);
  const requested = String(form?.get("redirectTo") ?? "");
  const next =
    requested === "/admin/login" || requested === "/get-started/account?mode=login"
      ? requested
      : "/get-started/account?mode=login";
  const result = await auth.api.signOut({
    headers: request.headers,
    asResponse: true,
  });
  return redirectWithAuthCookies(result, next);
}
