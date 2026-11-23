import {
  createRequestHandler,
  RouterContextProvider,
} from "react-router";
import { createAuth } from "@iwfw/auth";
import { parseWorkerEnv } from "@iwfw/config";
import { cloudflareContext } from "../app/lib/cloudflare-context";
import { log } from "../app/lib/logger";
import { handleStripeWebhookRequest } from "../app/lib/stripe-webhook.server";
import { handleUploadsApiRequest } from "../app/lib/uploads-http.server";

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

    if (url.pathname === "/api/stripe/ready") {
      if (request.method !== "GET") {
        return new Response("Method Not Allowed", { status: 405 });
      }
      try {
        const config = parseWorkerEnv(
          env as unknown as Record<string, unknown>,
        );
        const { buildStripeReadyReport } = await import(
          "../app/lib/stripe-ready.server"
        );
        const report = await buildStripeReadyReport(config);
        return Response.json(report, { status: report.ok ? 200 : 503 });
      } catch (error) {
        log("error", "stripe_ready_failed", {
          error: error instanceof Error ? error.message : "unknown",
        });
        return Response.json(
          { ok: false, error: "Stripe readiness check failed." },
          { status: 500 },
        );
      }
    }

    const uploadResponse = await handleUploadsApiRequest(request, env);
    if (uploadResponse) return uploadResponse;

    if (url.pathname === "/api/stripe/webhook") {
      if (request.method !== "POST") {
        return new Response("Method Not Allowed", { status: 405 });
      }
      try {
        const config = parseWorkerEnv(
          env as unknown as Record<string, unknown>,
        );
        return await handleStripeWebhookRequest(request, env, config);
      } catch (error) {
        log("error", "stripe_webhook_misconfigured", {
          error: error instanceof Error ? error.message : "unknown",
        });
        return Response.json(
          { error: "Webhook misconfigured" },
          { status: 500 },
        );
      }
    }

    if (url.pathname.startsWith("/api/auth")) {
      try {
        const config = parseWorkerEnv(
          env as unknown as Record<string, unknown>,
        );
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

  let schema: {
    ok: boolean;
    missingTables: string[];
    migrationCount: number | null;
  } | null = null;
  if (dbOk) {
    try {
      const { checkD1SchemaHealth } = await import(
        "../app/lib/schema-health.server"
      );
      schema = await checkD1SchemaHealth(env.DB);
      if (!schema.ok) {
        log("error", "health_schema_incomplete", {
          missingTables: schema.missingTables,
          migrationCount: schema.migrationCount,
        });
      }
    } catch (error) {
      log("error", "health_schema_check_failed", {
        error: error instanceof Error ? error.message : "unknown",
      });
      schema = { ok: false, missingTables: ["(check failed)"], migrationCount: null };
    }
  }

  const ok = dbOk && (schema?.ok ?? false);
  const body = {
    ok,
    service: "iwfw-web",
    env: env.APP_ENV ?? "unknown",
    db: dbOk ? "up" : "down",
    schema: schema
      ? {
          ok: schema.ok,
          missingTables: schema.missingTables,
          migrationCount: schema.migrationCount,
        }
      : null,
    durationMs: Date.now() - started,
  };

  return Response.json(body, { status: ok ? 200 : 503 });
}
