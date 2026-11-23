# Production deployment guide — Worker `iwantfreewebsite`

**Status:** checklist prepared. **No merge to `main`, remote migrate, secret put, or production deploy performed.**

## Critical Vite / Wrangler rule

Same as staging: select the Cloudflare environment at **build** time:

```bash
CLOUDFLARE_ENV=production pnpm run build   # flattens env.production
npx wrangler deploy                        # deploys flattened config (name = iwantfreewebsite)
```

Do **not** use `wrangler deploy --env production` after a Vite build.

Do **not** build without `CLOUDFLARE_ENV=production` for production: the top-level config uses local D1 / `APP_ENV=development`.

### Worker name requirement

`env.production` must set `"name": "iwantfreewebsite"`. Without an explicit name, Wrangler suffixes the environment and the flattened script becomes `iwantfreewebsite-production`, which does **not** match the existing dashboard Worker.

---

## Isolation (must not reuse staging)

| | Production | Staging |
| --- | --- | --- |
| **Worker** | `iwantfreewebsite` | `iwfw-staging` |
| **Select env** | `CLOUDFLARE_ENV=production` | `CLOUDFLARE_ENV=staging` |
| **D1 name** | `iwfw-production` (`634c4590-3ace-4416-a439-9c634827f4ba`) | `iwfw-staging` (`6ff3f735-0dd5-4204-a778-b39b94dbfb19`) |
| **Secrets** | On Worker `iwantfreewebsite` only; **new** `BETTER_AUTH_SECRET` | Staging-only secret values |
| **Git branch** | **`main`** (after approved merge) | `staging` |

Never paste the staging D1 UUID into `env.production.d1_databases[0].database_id`.

---

## Exact Cloudflare dashboard values

### Worker: `iwantfreewebsite` → Settings → Build

| Field | Exact value |
| --- | --- |
| **Git repository** | `abdulraziq1947/iwantfreewebsite` |
| **Git production branch** | **`main`** |
| **Root directory** | **`apps/web`** |
| **Build command** | `cd ../.. && corepack enable && pnpm install && CLOUDFLARE_ENV=production pnpm --filter @iwfw/web build` |
| **Deploy command** | `npx wrangler deploy` |
| **Preview builds** | Prefer **off** until a preview strategy is approved (today PR branches already hit this Worker and fail) |

Pause Builds until `main` contains Phase 1 + production D1 UUID and secrets are set.

---

## Prerequisites / blockers

1. **Production D1 UUID wired** — `iwfw-production` / `634c4590-3ace-4416-a439-9c634827f4ba` is in `env.production`.
2. **Apply new migrations before deploying code that selects new columns/tables** — see [`RELEASE_SAAS_IMPROVEMENTS.md`](./RELEASE_SAAS_IMPROVEMENTS.md) for PR #33 (`0011`–`0013`).
3. **Production secrets** on Worker `iwantfreewebsite` (`BETTER_AUTH_SECRET`, Resend, Stripe test secrets). Prefer setting `MAILBOX_ENCRYPTION_KEY` before first encrypt write.
4. **Workers Builds** root must be `apps/web` with `CLOUDFLARE_ENV=production` build command and production branch **`main`**. See [`WORKERS_BUILDS_INVESTIGATION.md`](./WORKERS_BUILDS_INVESTIGATION.md).
5. **Custom domain** `iwantfreewebsite.com` must resolve to this Worker and match `APP_URL` for Better Auth cookies / `trustedOrigins`.
6. **Do not** point production Builds at the staging branch or staging build command (`CLOUDFLARE_ENV=staging`).
7. Live Stripe unlock: set live `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` (secrets), live `STRIPE_PRICE_ID` (var), then `STRIPE_ALLOW_LIVE=true`. Confirm with `GET /api/stripe/ready` before taking real payments.

---

## D1 — migrate BEFORE every Worker deploy (FB-02)

**Hard rule:** Apply D1 migrations on the target environment **before** deploying Worker code that queries new tables. Deploy-before-migrate has already taken down `/dashboard` in production.

1. D1 **`iwfw-production`** exists — UUID `634c4590-3ace-4416-a439-9c634827f4ba` is in Wrangler `env.production`.
2. Binding: **`DB`**.
3. **Order of operations (every release with schema changes):**

```bash
# 1) Migrations first
cd apps/web
pnpm run db:migrate:production
# or: CLOUDFLARE_ENV=production pnpm exec wrangler d1 migrations apply DB --remote

# 2) Confirm health schema after migrate (optional curl)
# curl -sS https://iwantfreewebsite.com/api/health | jq .schema

# 3) Then build + deploy Worker
cd ../..
CLOUDFLARE_ENV=production pnpm --filter @iwfw/web build
cd apps/web && npx wrangler deploy
```

4. Staging parity (FB-22): keep `iwfw-staging` on the same migration head as production (`pnpm run db:migrate:staging`).

5. `/api/health` returns `503` when required tables are missing (`schema.ok: false`).

Migrations live under `packages/db/migrations/` (`0000` … current journal head).

---

## Secrets & vars (Worker `iwantfreewebsite` only)

### Secrets

| Name | Required | Notes |
| --- | --- | --- |
| `BETTER_AUTH_SECRET` | Yes | ≥32 chars; **must differ from staging/local** |
| `BOOTSTRAP_OWNER_EMAIL` | Optional once | First platform owner signup only; **remove after** first owner exists |
| `STRIPE_SECRET_KEY` | For billing | `sk_test_…` until live unlock; `sk_live_…` only with `STRIPE_ALLOW_LIVE` |
| `STRIPE_WEBHOOK_SECRET` | For billing | Matching mode webhook endpoint |
| `RESEND_API_KEY` | For activation email | Dashboard secret |
| `MAILBOX_ENCRYPTION_KEY` | Optional | Base64/secret for mailbox password encryption; else derived from auth secret |

### Vars (`env.production.vars`)

| Name | Value |
| --- | --- |
| `APP_ENV` | `production` |
| `APP_URL` | `https://iwantfreewebsite.com` (must match the live public origin) |
| `STRIPE_PRICE_ID` | Live £39.99 GBP monthly Price ID |
| `STRIPE_ALLOW_LIVE` | `"true"` only after live keys + webhook verified (FB-01). Check `/api/stripe/ready`. |

### Live Stripe unlock (FB-01) — requires explicit approval

1. Create live Price £39.99 GBP/month; set `STRIPE_PRICE_ID`.
2. Set live `STRIPE_SECRET_KEY` + live webhook to `/api/stripe/webhook`.
3. Only then set var/secret `STRIPE_ALLOW_LIVE=true`.
4. Smoke one live Checkout; confirm idempotent webhook.

### Auth notes

- Better Auth `baseURL` and `trustedOrigins` come from `APP_URL`.
- Auth routes: `/api/auth/*`.
- Email/password + optional two-factor; min password length 10.
- Missing or short `BETTER_AUTH_SECRET` fails Zod validation at runtime (`parseWorkerEnv`).

---

## Recommended cutover order (after approval)

For the SaaS-improvements release, follow the exact checklist in [`RELEASE_SAAS_IMPROVEMENTS.md`](./RELEASE_SAAS_IMPROVEMENTS.md).

Short form:

1. Confirm secrets/vars on Worker `iwantfreewebsite` (not staging). Prefer `MAILBOX_ENCRYPTION_KEY`.
2. **Migrate D1 first** (`pnpm run db:migrate:production`) while the current Worker stays live.
3. Merge approved PR to `main` / deploy Worker (`pnpm run deploy:production` or Builds).
4. Smoke: `/api/health` (`schema.ok`), customer login + dashboard + mailbox Show, staff MFA enroll if needed.
5. Live Stripe: confirm `GET /api/stripe/ready` is `ok: true` after `STRIPE_ALLOW_LIVE=true`.
6. Remove `BOOTSTRAP_OWNER_EMAIL` if it is still present after owner exists.

---

## Local verification

```bash
pnpm --filter @iwfw/web deploy:production:dry
```

Expect flattened **`name`: `iwantfreewebsite`**, D1 **`iwfw-production`** / `634c4590-3ace-4416-a439-9c634827f4ba`, and **not** staging UUID `6ff3f735-0dd5-4204-a778-b39b94dbfb19`.
