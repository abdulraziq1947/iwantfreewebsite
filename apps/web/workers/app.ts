import {
  createRequestHandler,
  RouterContextProvider,
} from "react-router";
import { createAuth } from "@iwfw/auth";
import { parseWorkerEnv } from "@iwfw/config";
import { cloudflareContext } from "../app/lib/cloudflare-context";
import { log } from "../app/lib/logger";

const requestHandler = createRequestHandler(
  () => import("virtual:react-router/server-build"),
  import.meta.env.MODE,
);

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname === "/api/health" || url.pathname === "/healthz") {
      return handleHealth(env);
    }

    if (url.pathname.startsWith("/api/auth")) {
      try {
        const config = parseWorkerEnv(env as unknown as Record<string, unknown>);
        const auth = createAuth(env.DB, config);
        return auth.handler(request);
      } catch (error) {
        log("error", "auth_handler_failed", {
          error: error instanceof Error ? error.message : "unknown",
        });
        return Response.json({ error: "Auth misconfigured" }, { status: 500 });
      }
    }

    const routerContext = new RouterContextProvider();
    routerContext.set(cloudflareContext, { env, ctx });
    return requestHandler(request, routerContext);
  },
} satisfies ExportedHandler<Env>;

async function handleHealth(env: Env): Promise<Response> {
  const started = Date.now();
  let dbOk = false;
  try {
    await env.DB.prepare("SELECT 1 AS ok").first();
    dbOk = true;
  } catch (error) {
    log("error", "health_db_failed", {
      error: error instanceof Error ? error.message : "unknown",
    });
    dbOk = false;
  }

  const body = {
    ok: dbOk,
    service: "iwfw-web",
    env: env.APP_ENV ?? "unknown",
    db: dbOk ? "up" : "down",
    durationMs: Date.now() - started,
  };

  return Response.json(body, { status: dbOk ? 200 : 503 });
}
