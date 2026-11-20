import { createAuth, loadAuthContext, type AuthContext } from "@iwfw/auth";
import type { RouterContextProvider } from "react-router";
import { getConfig, getEnv } from "./env.server";

export async function getOptionalAuth(
  request: Request,
  context: Readonly<RouterContextProvider>,
): Promise<AuthContext | null> {
  const env = getEnv(context);
  const config = getConfig(context);
  const auth = createAuth(env.DB, config);
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) return null;
  return loadAuthContext(env.DB, {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name,
  });
}

export async function requireAuth(
  request: Request,
  context: Readonly<RouterContextProvider>,
): Promise<AuthContext> {
  const ctx = await getOptionalAuth(request, context);
  if (!ctx) {
    throw new Response(null, {
      status: 302,
      headers: { Location: "/login" },
    });
  }
  return ctx;
}

export async function requireStaffSession(
  request: Request,
  context: Readonly<RouterContextProvider>,
): Promise<AuthContext> {
  const ctx = await requireAuth(request, context);
  if (ctx.staffRoles.length === 0) {
    throw new Response("Forbidden", { status: 403 });
  }
  return ctx;
}
