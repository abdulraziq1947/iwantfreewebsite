import { z } from "zod";

export const appEnvironments = ["development", "staging", "production"] as const;
export type AppEnvironment = (typeof appEnvironments)[number];

export const platformRoles = [
  "platform_owner",
  "administrator",
  "website_developer",
  "gbp_manager",
  "support_agent",
] as const;
export type PlatformRole = (typeof platformRoles)[number];

export const membershipRoles = ["customer"] as const;
export type MembershipRole = (typeof membershipRoles)[number];

export const featureFlagKeys = ["rank_tracking_checkout_enabled"] as const;
export type FeatureFlagKey = (typeof featureFlagKeys)[number];

/** Non-secret + secret env values available to the Worker. */
export const workerEnvSchema = z.object({
  APP_URL: z.string().url(),
  APP_ENV: z.enum(appEnvironments).default("development"),
  BETTER_AUTH_SECRET: z.string().min(32),
  BOOTSTRAP_OWNER_EMAIL: z.string().email().optional(),
  /** Google Business Profile Manager invite address shown in onboarding. */
  GBP_MANAGER_EMAIL: z.string().email().optional(),
  /** Stripe secret key — test mode only (`sk_test_…`) until live payments approved. */
  STRIPE_SECRET_KEY: z.string().min(1).optional(),
  /**
   * Canonical Stripe Price ID for the £39.99/month website plan.
   * Prefer plain-text Wrangler var (non-secret).
   */
  STRIPE_PRICE_ID: z.string().min(1).optional(),
  /** Webhook signing secret (whsec_…). */
  STRIPE_WEBHOOK_SECRET: z.string().min(1).optional(),
});

export type WorkerEnvConfig = z.infer<typeof workerEnvSchema>;

export function isStripeTestSecretKey(
  key: string | null | undefined,
): boolean {
  return typeof key === "string" && key.startsWith("sk_test_");
}

export function parseWorkerEnv(
  env: Record<string, unknown>,
): WorkerEnvConfig {
  return workerEnvSchema.parse({
    APP_URL: env.APP_URL,
    APP_ENV: env.APP_ENV ?? "development",
    BETTER_AUTH_SECRET: env.BETTER_AUTH_SECRET,
    BOOTSTRAP_OWNER_EMAIL: env.BOOTSTRAP_OWNER_EMAIL || undefined,
    GBP_MANAGER_EMAIL: env.GBP_MANAGER_EMAIL || undefined,
    STRIPE_SECRET_KEY: env.STRIPE_SECRET_KEY || undefined,
    STRIPE_PRICE_ID: env.STRIPE_PRICE_ID || undefined,
    STRIPE_WEBHOOK_SECRET: env.STRIPE_WEBHOOK_SECRET || undefined,
  });
}

/**
 * True when Checkout can be created in test mode
 * (sk_test_… secret + STRIPE_PRICE_ID present).
 */
export function isStripeCheckoutConfigured(config: WorkerEnvConfig): boolean {
  return Boolean(
    isStripeTestSecretKey(config.STRIPE_SECRET_KEY) && config.STRIPE_PRICE_ID,
  );
}

export function isStripeWebhookConfigured(config: WorkerEnvConfig): boolean {
  return Boolean(
    isStripeTestSecretKey(config.STRIPE_SECRET_KEY) &&
      config.STRIPE_WEBHOOK_SECRET,
  );
}

export function isStaffRole(role: string): role is PlatformRole {
  return (platformRoles as readonly string[]).includes(role);
}
