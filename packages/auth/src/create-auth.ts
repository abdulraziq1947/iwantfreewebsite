import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { twoFactor } from "better-auth/plugins";
import {
  DEFAULT_RESEND_FROM_EMAIL,
  type WorkerEnvConfig,
} from "@iwfw/config";
import { createDb } from "@iwfw/db";
import * as schema from "@iwfw/db/schema";

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
      sendResetPassword: async ({ user, url }) => {
        if (!config.RESEND_API_KEY) {
          console.warn(
            JSON.stringify({
              level: "warn",
              event: "password_reset_email_skipped_no_resend_key",
              userId: user.id,
            }),
          );
          return;
        }
        const from = config.RESEND_FROM_EMAIL || DEFAULT_RESEND_FROM_EMAIL;
        const response = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${config.RESEND_API_KEY}`,
            "Content-Type": "application/json",
            "Idempotency-Key": `pwd-reset-${user.id}-${Date.now()}`,
          },
          body: JSON.stringify({
            from,
            to: [user.email],
            subject: "Reset your iwantfreewebsite password",
            text: [
              "Reset your password",
              "",
              "We received a request to reset the password for your iwantfreewebsite account.",
              "Open this link to choose a new password (it expires soon and can only be used once):",
              "",
              url,
              "",
              "If you did not request this, you can ignore this email.",
            ].join("\n"),
            html: [
              "<p><strong>Reset your password</strong></p>",
              "<p>We received a request to reset the password for your iwantfreewebsite account.</p>",
              `<p><a href="${url}">Choose a new password</a></p>`,
              "<p>This link expires soon and can only be used once. If you did not request this, you can ignore this email.</p>",
            ].join(""),
          }),
        });
        if (!response.ok) {
          const bodyText = await response.text().catch(() => "");
          console.warn(
            JSON.stringify({
              level: "warn",
              event: "password_reset_email_failed",
              status: response.status,
              bodySnippet: bodyText.slice(0, 180),
            }),
          );
          throw new Error("Unable to send password reset email.");
        }
      },
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
