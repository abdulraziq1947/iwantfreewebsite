# Release readiness — SaaS improvements (PR #33)

**Branch:** `cursor/saas-improvements-18f7`  
**PR:** https://github.com/abdulraziq1947/iwantfreewebsite/pull/33  
**Status:** Ready for approved migrate-first production cutover. **Do not** set `STRIPE_ALLOW_LIVE=true` in this release.

## PR / CI snapshot

| Check | Result |
| --- | --- |
| Workers Builds (PR head) | Success |
| Review comments | None |
| Mergeable | Clean |

## Compatibility (existing customers)

| Area | After this deploy |
| --- | --- |
| Sessions / Better Auth | Unchanged `BETTER_AUTH_SECRET` + `APP_URL` → sessions keep working |
| Subscriptions / Stripe webhooks | Test-mode path unchanged; live events still rejected until `STRIPE_ALLOW_LIVE` |
| Mailbox passwords | Legacy **plaintext** rows still decrypt/show; new saves encrypt (`enc:v1:…`) |
| Domain / live URLs | Existing `live_url` / connected status unchanged; `preview_url` / `renews_at` nullable |
| Customer dashboards | Keep working once migrations applied; Progress URL redirects to Overview |
| Staff admin | **MFA required** after deploy — staff without 2FA are sent to `/admin/security/mfa` |

## Migrations in this release (additive only)

| Tag | Change | Rollback note |
| --- | --- | --- |
| `0011_preview_url` | `ADD preview_url` on `domain_registration_tasks` | Leave column; ignore |
| `0012_ops_tasks` | `ADD renews_at`; create `ops_tasks` | Leave table/column; ignore |
| `0013_analytics_costs` | create `product_events`, `organisation_costs` | Leave tables; ignore |

Additive schema is **safe to apply while the current production Worker is still running**.  
Deploying this PR **without** these migrations will break customer dashboard loads (Drizzle SELECTs new columns) and make `/api/health` return 503.

## Required configuration (confirm before migrate)

### Already expected on Worker `iwantfreewebsite`

| Kind | Name | Notes |
| --- | --- | --- |
| Secret | `BETTER_AUTH_SECRET` | **Do not rotate** in this release (would brick newly encrypted mailboxes if `MAILBOX_ENCRYPTION_KEY` unset) |
| Secret | `RESEND_API_KEY` | Needed for activation + password reset |
| Secret | `STRIPE_SECRET_KEY` | Keep `sk_test_…` for now |
| Secret | `STRIPE_WEBHOOK_SECRET` | Matching test webhook |
| Var | `APP_URL` | `https://iwantfreewebsite.com` |
| Var | `APP_ENV` | `production` |
| Var | `STRIPE_PRICE_ID` | Current test/live price id in wrangler (test mode OK) |

### Strongly recommended before first encrypt write

| Kind | Name | Notes |
| --- | --- | --- |
| Secret | `MAILBOX_ENCRYPTION_KEY` | Long random secret (≥32 chars). Decouples mailbox crypto from auth-secret rotation |

### Do **not** set yet

| Name | Why |
| --- | --- |
| `STRIPE_ALLOW_LIVE=true` | Explicitly out of scope for this cutover |
| New `sk_live_…` as only key | Without allow-live, Checkout/webhooks refuse live mode |

### Stripe Dashboard (non-code)

- Customer Portal: enable for the Stripe account used by this Worker (Billing → Customer portal), or “Update payment method” returns an error.
- Keep webhook endpoint on `/api/stripe/webhook` for **test** mode until live unlock.

## Exact go-live sequence (after your approval)

1. **Confirm secrets/vars** on Worker `iwantfreewebsite` (table above). Optionally set `MAILBOX_ENCRYPTION_KEY` now.
2. **Migrate production D1 first** (old Worker still live — safe):

```bash
cd apps/web
pnpm run db:migrate:production
# equivalent:
# wrangler d1 migrations apply DB --env production --remote
```

3. **Verify migration head** (expect `0011`, `0012`, `0013` applied):

```bash
wrangler d1 migrations list DB --env production --remote
```

4. **Merge PR #33 → `main`** (or approve Workers Builds deploy from `main` after merge).
5. **Deploy Worker** (if Builds does not auto-deploy):

```bash
cd apps/web
pnpm run deploy:production
# uses CLOUDFLARE_ENV=production build + wrangler deploy
```

6. **Smoke (production)**  
   - `curl -sS https://iwantfreewebsite.com/api/health` → `ok: true`, `schema.ok: true`, no missing tables  
   - Customer login + `/dashboard`  
   - Open a mailbox with an existing password (plaintext still shows)  
   - Staff login → complete MFA at `/admin/security/mfa` if prompted  
   - `/admin/clients` search loads  
   - Do **not** run live Checkout

7. **Optional staging parity:** `pnpm run db:migrate:staging` then deploy staging the same way.

## Rollback / recovery

### If deploy is bad but migrations already applied

1. **Roll back Worker** to previous Workers version / prior successful deployment in the Cloudflare dashboard (or redeploy previous `main` commit).  
2. **Leave D1 migrations in place** — additive columns/tables do not break the previous Worker.  
3. Do **not** attempt to DROP columns in production unless a dedicated destructive migration is approved.

### If migrate succeeded but deploy has not happened

- No action required; site keeps serving old Worker against new nullable columns / unused tables.

### If deploy happened without migrate (outage)

1. Immediately run `pnpm run db:migrate:production`.  
2. Confirm `/api/health` → `schema.ok: true`.  
3. Recheck `/dashboard`.

### Mailbox crypto recovery

- Plaintext rows: unaffected.  
- `enc:v1:` rows: need the same `MAILBOX_ENCRYPTION_KEY` or (if unset) the same `BETTER_AUTH_SECRET` used at encrypt time.  
- If the wrong key is set, Show password returns empty — restore the previous key/secret; do not rotate blindly.

## Explicit non-goals this cutover

- Live Stripe Checkout / live webhooks  
- Rotating `BETTER_AUTH_SECRET`  
- Auto domain purchase or GBP auto-publish  
- Destructive schema rollback
