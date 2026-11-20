# Staging deployment guide — Worker `iwfw-staging`

**Status:** in-repo config ready. **No remote deploy, D1 create, or production changes performed.**

## Critical Vite / Wrangler rule

This app uses `@cloudflare/vite-plugin`. The Cloudflare environment is selected at **build time**, not via `wrangler deploy --env`:

```bash
CLOUDFLARE_ENV=staging pnpm run build   # flattens env.staging → build/server/wrangler.json
npx wrangler deploy                     # deploys that flattened config (name = iwfw-staging)
```

Do **not** use `wrangler deploy --env staging` after a Vite build — the redirected config is already flattened.

## Isolation

| | Staging | Production |
| --- | --- | --- |
| **Worker** | `iwfw-staging` | `iwantfreewebsite` |
| **Select env** | `CLOUDFLARE_ENV=staging` at build | `CLOUDFLARE_ENV=production` at build (later) |
| **D1** | Database named `iwfw-staging` (own UUID) | Database named `iwfw-production` (own UUID) |
| **Secrets** | On Worker `iwfw-staging` only | On Worker `iwantfreewebsite` only |
| **Git Builds** | Connect to Worker **`iwfw-staging`** | Keep **paused** / separate until approved |

Staging flattened config sets `"name": "iwfw-staging"`, so a staging build **cannot** upload to `iwantfreewebsite`.

---

## Exact Cloudflare dashboard values

### Worker: `iwfw-staging` → Settings → Build

| Field | Exact value |
| --- | --- |
| **Git repository** | `abdulraziq1947/iwantfreewebsite` |
| **Git production branch** (for this Worker) | **`staging`** |
| **Root directory** | **`apps/web`** |
| **Build command** | `cd ../.. && corepack enable && pnpm install && CLOUDFLARE_ENV=staging pnpm --filter @iwfw/web build` |
| **Deploy command** | `npx wrangler deploy` |
| **Preview command** (optional) | `npx wrangler versions upload` |

### Why branch `staging`

- Only merges into `staging` update the staging Worker.
- Feature/PR branches should not deploy staging unless you intentionally change the branch setting.
- Create Git branch `staging` from the approved Phase 1 tip when ready (agent has not created remote resources; you can create the branch in GitHub when you approve).

### Production Worker `iwantfreewebsite`

- **Do not** point its Build settings at these staging commands.
- Prefer **pause Builds** on production until a production cutover is approved.

---

## D1 (create only after your approval)

1. Create D1 database named **`iwfw-staging`** (empty, separate from any production DB).
2. Copy UUID into [`apps/web/wrangler.jsonc`](../apps/web/wrangler.jsonc) → `env.staging.d1_databases[0].database_id` (replace `REPLACE_WITH_STAGING_D1_UUID`).
3. Binding name: **`DB`**.
4. After deploy/auth available, apply migrations to **that** database only:

```bash
cd apps/web
CLOUDFLARE_ENV=staging pnpm exec wrangler d1 migrations apply DB --remote
```

Files:

- `packages/db/migrations/0000_phase1.sql`
- `packages/db/migrations/0001_two_factor_columns.sql`

---

## Secrets & vars (Worker `iwfw-staging` only)

### Secrets

| Name | Required | Notes |
| --- | --- | --- |
| `BETTER_AUTH_SECRET` | Yes | ≥32 chars; **different from production** |
| `BOOTSTRAP_OWNER_EMAIL` | Optional | Staging bootstrap only; remove after first owner |

### Vars (in `env.staging.vars`)

| Name | Value |
| --- | --- |
| `APP_ENV` | `staging` |
| `APP_URL` | Real staging origin after first URL is known, e.g. `https://iwfw-staging.<subdomain>.workers.dev` — update dashboard and rebuild if placeholder differs |

No Stripe / MXroute / DataForSEO / production secrets on staging for Phase 1.

---

## Local verification already run

```bash
CLOUDFLARE_ENV=staging pnpm --filter @iwfw/web build
pnpm --filter @iwfw/web exec wrangler deploy --dry-run
```

Expect flattened config **`name`: `iwfw-staging`** and D1 binding **`iwfw-staging`** (placeholder UUID until you create the DB).

---

## Manual commands after you approve (not run yet)

```bash
# 1. Put real staging D1 UUID in wrangler.jsonc
# 2. Set secrets on Worker iwfw-staging in dashboard (or wrangler secret put)
pnpm install
pnpm --filter @iwfw/web deploy:staging
# migrations:
cd apps/web && CLOUDFLARE_ENV=staging pnpm exec wrangler d1 migrations apply DB --remote
```

---

## Pre-flight checklist

- [ ] Worker `iwfw-staging` exists (separate from `iwantfreewebsite`)
- [ ] Builds root directory = `apps/web`
- [ ] Build command includes `CLOUDFLARE_ENV=staging`
- [ ] Deploy command is plain `npx wrangler deploy` (no `--env` after Vite build)
- [ ] Git branch for this Worker = `staging`
- [ ] Separate D1 UUID filled in
- [ ] Staging-only secrets set
- [ ] Production Builds not using this staging pipeline
