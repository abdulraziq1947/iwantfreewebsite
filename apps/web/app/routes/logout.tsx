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
  const result = await auth.api.signOut({
    headers: request.headers,
    asResponse: true,
  });
  return redirectWithAuthCookies(result, "/login");
}
