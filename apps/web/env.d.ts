/**
 * Secrets and optional bindings that `wrangler types` does not emit from
 * wrangler.jsonc vars. Merged into the generated `Env` interface.
 *
 * Set via `wrangler secret put` / Cloudflare dashboard — never commit values.
 */
interface Env {
  STRIPE_SECRET_KEY?: string;
  STRIPE_WEBHOOK_SECRET?: string;
  /** Resend API key for account activation emails (production secret already set). */
  RESEND_API_KEY?: string;
  RESEND_FROM_EMAIL?: string;
}
