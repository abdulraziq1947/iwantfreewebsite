# Workers Builds failure investigation (PR #2 / commit `0a9465c`)

**Date:** 2026-11-20 (Europe/London)  
**Check:** `Workers Builds: iwantfreewebsite`  
**Conclusion:** `failure`  
**Build ID:** `b6383049-4687-4ec8-af05-bd54867de80c`  
**Dashboard Worker (script):** `iwantfreewebsite` (production)  
**GitHub check run:** https://github.com/abdulraziq1947/iwantfreewebsite/runs/136512312554  

## Exact error text available without Cloudflare login

GitHub’s check-run payload does **not** include Cloudflare’s build log body (`output.text` is `null`). The only details returned are:

- Title: `Workers Builds: iwantfreewebsite`
- Summary link to the Cloudflare dashboard build page
- Timestamps: `started_at` and `completed_at` are identical (`2026-11-20T19:18:13Z`) → **0-second duration**

So the **verbatim log line is only in the Cloudflare dashboard**. From public Cloudflare troubleshooting docs plus reproducible local behaviour, the failure is a **preflight / configuration error**, not a TypeScript/test failure.

## Reproduced locally (no Cloudflare auth)

From repository root (Workers Builds default `root_directory` = `/`):

1. **No** `wrangler.jsonc` / `wrangler.toml` at repo root.
2. `wrangler` is not a root dependency (only under `apps/web`).
3. Running deploy from root fails immediately because there is no Wrangler project there.

Wrangler config that exists:

| Path | `name` |
| --- | --- |
| [`apps/web/wrangler.jsonc`](../apps/web/wrangler.jsonc) | `iwfw-web` (staging/prod env names `iwfw-web-staging` / `iwfw-web-production`) |

Dashboard Worker name from the check: **`iwantfreewebsite`**.

## Root cause (high confidence)

| Factor | Finding |
| --- | --- |
| Category | **Configuration / GitHub ↔ Workers Builds integration**, not missing app credentials and not a dependency install failure |
| Primary | Build runs against Worker **`iwantfreewebsite`** with default/incorrect **root directory `/`**, while Wrangler lives in **`apps/web/`** |
| Documented CF error (most likely) | `Missing entry-point: The entry-point should be specified via the command line ... or the main config field.` ([Troubleshooting](https://developers.cloudflare.com/workers/ci-cd/builds/troubleshoot/)) |
| Secondary (once root is fixed) | Worker name mismatch: dashboard `iwantfreewebsite` vs config `iwfw-web` → documented error requiring names to match |
| Not indicated | Missing `BETTER_AUTH_SECRET` / Stripe keys (would appear after project resolution); npm lockfile sync; 20-minute timeout |
| Side effect | Integration targets **production** Worker; PR pushes can trigger production-oriented builds — undesirable for Phase 1 |

## What cannot be fixed from the repo alone

These live in the **Cloudflare dashboard** (Workers → `iwantfreewebsite` → Settings → Build):

1. Set **Root directory** to `apps/web` (or `/apps/web`).
2. Set **Build command** to a monorepo-safe command (see below).
3. Set **Deploy / Preview commands** appropriately.
4. Prefer **Preview** for non-`main` branches; do **not** auto-deploy PR branches to production.
5. Optionally pause Builds until staging is intentionally enabled.

Reading the exact log line requires opening the dashboard build URL (or a **read-only** Cloudflare API token scoped to Workers Builds logs) — **not** full account OAuth in Cursor.

## Recommended dashboard settings (when you are ready)

```text
Root directory:    apps/web
Build command:     cd ../.. && pnpm install && pnpm --filter @iwfw/web build
Deploy command:    npx wrangler deploy   # only for approved production/staging branch
Preview command:   npx wrangler versions upload   # or wrangler preview per current CF docs
```

Also align Wrangler `name` with the connected Worker (`iwantfreewebsite`) — see in-repo fix below.

## In-repo fixes applied without Cloudflare auth

1. Rename Worker `name` in `apps/web/wrangler.jsonc` to `iwantfreewebsite` so it matches the connected dashboard Worker (env suffixes remain valid for staging/production envs).
2. Document this investigation and the required dashboard root-directory change.
3. Do **not** create remote D1/resources or run production deploy from this agent.

## Minimum Cloudflare access if logs are required later

**Do not** grant full account access to the agent.

If needed, you can paste the build log yourself, or create a **read-only** API token with only:

- Account → Workers Scripts: **Read**
- Account → Workers Builds / CI: **Read** (if listed)

That is enough to fetch build log text via API — not deploy, not edit DNS, not create resources.
