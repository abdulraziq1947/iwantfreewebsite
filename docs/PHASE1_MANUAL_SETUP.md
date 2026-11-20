# Phase 1 — Manual Cloudflare setup (not done yet)

Phase 1 was implemented for **local development only**. No remote Cloudflare resources were created and no production deploy was run.

## Before you approve cloud provisioning

Creating the items below may incur Cloudflare Workers Paid plan charges depending on your account. **Do not create them until you explicitly approve.**

### Permissions required

A Cloudflare API token or `wrangler login` OAuth session with at least:

- Account → Workers Scripts: Edit
- Account → D1: Edit
- Account → Workers Tail / Observability (optional but recommended)
- Account → Account Settings: Read (for account id)

Prefer an account-owned API token with the narrowest scopes rather than pasting secrets into chat.

### Fix Workers Builds (GitHub check) before enabling deploys

The GitHub check `Workers Builds: iwantfreewebsite` failed because the build integration’s **root directory** does not point at the monorepo app. See [`WORKERS_BUILDS_INVESTIGATION.md`](./WORKERS_BUILDS_INVESTIGATION.md).

In the dashboard for Worker **`iwantfreewebsite`** → Settings → Build:

1. **Root directory:** `apps/web`
2. **Build command:** `cd ../.. && corepack enable && pnpm install && pnpm --filter @iwfw/web build`
3. For PR/non-main branches: use **Preview** (not production deploy). Prefer pausing production auto-deploy until Phase 1 staging is approved.
4. Wrangler `name` in-repo is already aligned to `iwantfreewebsite`.

### Resources to create (staging first)

1. **D1 database** `iwfw-staging` — copy the database id into `apps/web/wrangler.jsonc` → `env.staging.d1_databases[0].database_id`
2. **Worker secrets** on the staging Worker (`iwantfreewebsite-staging` when using `--env staging`):
   - `BETTER_AUTH_SECRET` (32+ random chars)
   - Optional `BOOTSTRAP_OWNER_EMAIL` (staging only; remove after first owner exists)
3. **Vars** already sketched in wrangler: `APP_URL`, `APP_ENV=staging`
4. Apply migrations: `wrangler d1 migrations apply iwfw-staging --env staging --remote` (only after approval)
5. Deploy staging Worker: `pnpm --filter @iwfw/web exec wrangler deploy --env staging` (only after approval)

### Production (later)

Same pattern with `iwfw-production` D1 and `iwfw-web-production` Worker. Requires separate approval.

### Not required for Phase 1

- R2 buckets
- Queues / Workflows / Cron
- Stripe / MXroute / DataForSEO secrets
- Custom domains on Workers (can use `*.workers.dev` for staging smoke)
- Cloudflare for SaaS
