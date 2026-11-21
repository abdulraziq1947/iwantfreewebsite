# Stripe test setup (guided)

Use **test mode only**. Do not enable live payments or change production billing until approved.

## Environment variables

| Name | Kind | Purpose |
| --- | --- | --- |
| `STRIPE_SECRET_KEY` | **Secret** | `sk_test_…` API key only — `sk_live_…` is rejected in code |
| `STRIPE_PRICE_ID` | **Non-secret var** | Canonical £39.99/month Price ID (`price_…`) |
| `STRIPE_WEBHOOK_SECRET` | **Secret** | `whsec_…` signing secret |
| `APP_URL` | Var | Success/cancel + webhook origin |

Production Worker already has `STRIPE_SECRET_KEY` (secret) and `STRIPE_PRICE_ID` (plain-text var). You still need `STRIPE_WEBHOOK_SECRET` after creating the endpoint.

Local development does **not** inherit Cloudflare secrets — put test values in `apps/web/.dev.vars` (never commit).

## 1. Product & price

1. Stripe Dashboard → **Test mode ON**
2. Product: Professional Business Website
3. Recurring price: **£39.99 GBP / month**
4. Copy Price ID → `STRIPE_PRICE_ID`

## 2. Webhook endpoint (required for Stage D)

After this code is running somewhere Stripe can reach (staging or `stripe listen`):

1. **Developers → Webhooks → Add endpoint**
2. URL: `https://<your-host>/api/stripe/webhook`
3. Events:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.paid`
   - `invoice.payment_failed`
4. Copy signing secret → `STRIPE_WEBHOOK_SECRET`

### Local

```bash
stripe listen --forward-to localhost:5173/api/stripe/webhook
```

Put the CLI `whsec_…` into `apps/web/.dev.vars`.

### Staging / production secret (after approval only for production)

```bash
cd apps/web
CLOUDFLARE_ENV=staging pnpm exec wrangler secret put STRIPE_WEBHOOK_SECRET
```

## 3. Behaviour summary

- Checkout: Stripe-hosted subscription; server uses `STRIPE_PRICE_ID` only
- Test-mode hardening: rejects non-`sk_test_` keys; rejects webhook events with `livemode: true`; verifies price is active £39.99 GBP/month on the test account
- Credentials / `whsec_…` are never written to logs
- Webhooks: source of truth for subscription + org status
- Cancel: `cancel_at_period_end=true`; resume clears the flag
- Asset transfer task: created once when subscription **ends** (`customer.subscription.deleted`), not when cancel is merely scheduled
- No auto-delete / auto-transfer of assets
- Rank tracking Checkout stays disabled

## 4. D1 migration

`packages/db/migrations/0003_billing.sql` — apply to **local/staging** when ready. **Do not** apply to production D1 until approved.
