# Stripe test setup (guided)

Use **test mode only**. Do not enable live payments or change production billing until approved.

## 1. Create a Stripe test account / switch to test mode

1. Open [https://dashboard.stripe.com](https://dashboard.stripe.com) and sign in.
2. Toggle **Test mode** ON (switch in the Dashboard header).

## 2. Create the product and £39.99 monthly price

1. Go to **Product catalogue → Products → Add product**.
2. Name: `Professional Business Website` (or similar).
3. Description: managed business website; £0 upfront website design fee.
4. Pricing:
   - Model: **Recurring**
   - Price: **39.99**
   - Currency: **GBP**
   - Billing period: **Monthly**
5. Save the product.
6. Open the price and copy the **Price ID** (`price_...`).  
   You will store this as `STRIPE_PRICE_WEBSITE_MONTHLY`.

Do **not** create a separate upfront design fee. Rank tracking (£9.99) stays disabled — do not add it to Checkout yet.

## 3. API keys (test)

1. Go to **Developers → API keys**.
2. Copy the **Secret key** (`sk_test_...`) → `STRIPE_SECRET_KEY`.
3. Never commit this value. Prefer Wrangler secrets / Cursor secrets UI.

## 4. Webhook endpoint (after Stage D code lands)

When Checkout + webhook routes exist:

1. **Developers → Webhooks → Add endpoint**.
2. Endpoint URL (local via Stripe CLI, or staging Worker URL):  
   `https://<your-app>/api/stripe/webhook`
3. Events to send (minimum):
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.paid`
   - `invoice.payment_failed`
4. Copy the webhook **Signing secret** (`whsec_...`) → `STRIPE_WEBHOOK_SECRET`.

### Local forwarding (optional)

```bash
stripe listen --forward-to localhost:5173/api/stripe/webhook
```

Use the CLI-printed `whsec_...` for local `.dev.vars`.

## 5. Where to put secrets

### Local (`apps/web/.dev.vars` — never commit)

```bash
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_WEBSITE_MONTHLY=price_...
```

### Staging / production (Wrangler / Cloudflare dashboard)

```bash
cd apps/web
CLOUDFLARE_ENV=staging pnpm exec wrangler secret put STRIPE_SECRET_KEY
CLOUDFLARE_ENV=staging pnpm exec wrangler secret put STRIPE_WEBHOOK_SECRET
CLOUDFLARE_ENV=staging pnpm exec wrangler secret put STRIPE_PRICE_WEBSITE_MONTHLY
```

Repeat for production **only after written approval**.

Stage B does not yet read these secrets. Stage D will extend Zod config and wire Checkout.

## 6. Cancellation behaviour (product policy)

When a customer cancels:

1. Set Stripe subscription to cancel at period end (`cancel_at_period_end=true`) so **no further renewals** occur after the paid period.
2. Do **not** immediately revoke access before `current_period_end`.
3. Create an **internal asset transfer task** (manual website + domain transfer).
4. Never auto-delete websites, domains, email or files on subscription end.

## 7. VAT note

Advertised price is **£39.99 inclusive of VAT where applicable**. Confirm Stripe Tax / VAT treatment with your accountant before enabling **live** billing. Test mode can proceed with inclusive pricing copy.

## 8. Checklist before asking the agent to continue Stage D

- [ ] Test product + monthly GBP price created  
- [ ] `price_...` ID copied  
- [ ] `sk_test_...` available to add as a secret (not pasted into chat if avoidable)  
- [ ] You understand live mode is **off-limits** until you approve  
