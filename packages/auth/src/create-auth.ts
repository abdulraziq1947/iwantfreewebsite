import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { twoFactor } from "better-auth/plugins";
import { createDb } from "@iwfw/db";
import * as schema from "@iwfw/db/schema";
import type { WorkerEnvConfig } from "@iwfw/config";

export type AppAuth = ReturnType<typeof createAuth>;

/**
 * Better Auth must be created per request on Workers so the D1 binding
 * from the current env is used (bindings are request-scoped).
 */
export function createAuth(d1: D1Database, config: WorkerEnvConfig) {
  const db = createDb(d1);

  return betterAuth({
    baseURL: config.APP_URL,
    basePath: "/api/auth",
    secret: config.BETTER_AUTH_SECRET,
    database: drizzleAdapter(db, {
      provider: "sqlite",
      schema: {
        user: schema.user,
        session: schema.session,
        account: schema.account,
        verification: schema.verification,
        twoFactor: schema.twoFactor,
      },
    }),
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 10,
    },
    user: {
      additionalFields: {
        phone: {
          type: "string",
          required: false,
        },
      },
    },
    plugins: [
      twoFactor({
        issuer: "iwantfreewebsite",
      }),
    ],
    trustedOrigins: [new URL(config.APP_URL).origin],
  });
}
