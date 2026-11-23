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
  /**
   * Stripe secret key. Test (`sk_test_…`) always allowed.
   * Live (`sk_live_…`) only when STRIPE_ALLOW_LIVE=true (explicit approval).
   */
  STRIPE_SECRET_KEY: z.string().min(1).optional(),
  /**
   * Canonical Stripe Price ID for the £39.99/month website plan.
   * Prefer plain-text Wrangler var (non-secret).
   */
  STRIPE_PRICE_ID: z.string().min(1).optional(),
  /** Webhook signing secret (whsec_…). */
  STRIPE_WEBHOOK_SECRET: z.string().min(1).optional(),
  /**
   * When "true", allow sk_live_… secrets and livemode webhooks.
   * Default false — live billing stays off until credentials are verified.
   */
  STRIPE_ALLOW_LIVE: z
    .enum(["true", "false"])
    .optional()
    .transform((v) => v === "true"),
  /**
   * Optional 32-byte key (base64) for mailbox password encryption at rest.
   * Falls back to a key derived from BETTER_AUTH_SECRET when unset.
   */
  MAILBOX_ENCRYPTION_KEY: z.string().min(1).optional(),
  /**
   * Resend API key for transactional activation emails.
   * Dashboard/Wrangler secret only — never commit.
   */
  RESEND_API_KEY: z.string().min(1).optional(),
  /**
   * Optional From address override. Defaults to accounts@iwantfreewebsite.com.
   */
  RESEND_FROM_EMAIL: z.string().email().optional(),
  /**
   * Customer-facing expected go-live window copy (working days).
   * Defaults to "5–10 working days" when unset.
   */
  GO_LIVE_SLA_LABEL: z.string().min(1).optional(),
});

export type WorkerEnvConfig = z.infer<typeof workerEnvSchema>;

export const DEFAULT_RESEND_FROM_EMAIL = "accounts@iwantfreewebsite.com";
export const DEFAULT_GO_LIVE_SLA_LABEL = "5–10 working days";

/** Customer-facing go-live window (never a hard contractual promise). */
export function goLiveSlaLabel(config: WorkerEnvConfig): string {
  return config.GO_LIVE_SLA_LABEL?.trim() || DEFAULT_GO_LIVE_SLA_LABEL;
}

export function isStripeTestSecretKey(
  key: string | null | undefined,
): boolean {
  return typeof key === "string" && key.startsWith("sk_test_");
}

export function isStripeLiveSecretKey(
  key: string | null | undefined,
): boolean {
  return typeof key === "string" && key.startsWith("sk_live_");
}

/** True when the secret key is allowed for the current STRIPE_ALLOW_LIVE setting. */
export function isStripeSecretKeyAllowed(
  key: string | null | undefined,
  allowLive: boolean,
): boolean {
  if (isStripeTestSecretKey(key)) return true;
  if (allowLive && isStripeLiveSecretKey(key)) return true;
  return false;
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
    STRIPE_ALLOW_LIVE: env.STRIPE_ALLOW_LIVE || undefined,
    MAILBOX_ENCRYPTION_KEY: env.MAILBOX_ENCRYPTION_KEY || undefined,
    RESEND_API_KEY: env.RESEND_API_KEY || undefined,
    RESEND_FROM_EMAIL: env.RESEND_FROM_EMAIL || undefined,
    GO_LIVE_SLA_LABEL: env.GO_LIVE_SLA_LABEL || undefined,
  });
}

export function isResendConfigured(config: WorkerEnvConfig): boolean {
  return Boolean(config.RESEND_API_KEY);
}

/**
 * True when Checkout can be created
 * (allowed secret + STRIPE_PRICE_ID present).
 */
export function isStripeCheckoutConfigured(config: WorkerEnvConfig): boolean {
  return Boolean(
    isStripeSecretKeyAllowed(
      config.STRIPE_SECRET_KEY,
      Boolean(config.STRIPE_ALLOW_LIVE),
    ) && config.STRIPE_PRICE_ID,
  );
}

export function isStripeWebhookConfigured(config: WorkerEnvConfig): boolean {
  return Boolean(
    isStripeSecretKeyAllowed(
      config.STRIPE_SECRET_KEY,
      Boolean(config.STRIPE_ALLOW_LIVE),
    ) && config.STRIPE_WEBHOOK_SECRET,
  );
}

export function isStaffRole(role: string): role is PlatformRole {
  return (platformRoles as readonly string[]).includes(role);
}
