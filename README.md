# iwantfreewebsite.com

Cloudflare-native SaaS platform for managed UK business websites.

**£39.99/month. No upfront website fee. No minimum contract. Cancel anytime.**

Planning docs: [`docs/README.md`](./docs/README.md)

## Phase 1 status

Foundation only: monorepo, React Router on Workers, D1 + Drizzle, Better Auth, RBAC, design system, layouts, health checks, local tooling.

**Not in Phase 1:** Stripe, domain purchasing, MXroute, DataForSEO, production deploys.

## Monorepo layout

```
apps/web          React Router + Cloudflare Workers app
apps/jobs         Jobs worker stub (Cron/Queues later)
packages/db       Drizzle schema + D1 migrations
packages/auth     Better Auth factory + RBAC helpers
packages/ui       Shared UI components
packages/config   Zod env schemas + role constants
docs/             Architecture planning documents
```

## Prerequisites

- Node.js 22+
- pnpm 10+
- Wrangler (via project dependency)

## Local setup

```bash
pnpm install
cp .env.example apps/web/.dev.vars
# Edit apps/web/.dev.vars — set BETTER_AUTH_SECRET (32+ chars)
# Optional: BOOTSTRAP_OWNER_EMAIL=you@example.com to grant platform_owner on signup

pnpm db:migrate:local
pnpm dev
```

App: `http://localhost:5173`  
Health: `http://localhost:5173/api/health`

### Useful scripts

| Script | Purpose |
| --- | --- |
| `pnpm dev` | Local Vite + Workers runtime |
| `pnpm typecheck` | Types across packages |
| `pnpm lint` | ESLint |
| `pnpm test` | Vitest unit tests |
| `pnpm db:migrate:local` | Apply D1 migrations to local DB |
| `pnpm --filter @iwfw/db generate` | Regenerate Drizzle SQL (review before commit) |

## Environments

Defined in `apps/web/wrangler.jsonc`:

| Env | Worker name | Notes |
| --- | --- | --- |
| default / development | `iwfw-web` | Local D1 placeholder ID |
| `staging` | `iwfw-web-staging` | Requires real D1 ID (not created yet) |
| `production` | `iwfw-web-production` | Requires approval + real D1 ID |

Secrets (never commit): `BETTER_AUTH_SECRET`, later Stripe/MXroute/DataForSEO keys via `wrangler secret put`.

## Auth & roles

- Email/password via Better Auth (`/api/auth/*`)
- Customer memberships → `/dashboard` (org-scoped)
- Staff `platform_roles` → `/admin`
- Two-factor plugin enabled for staff MFA (enable per user via Better Auth two-factor APIs)
- Feature flag `rank_tracking_checkout_enabled` defaults **false**

## Security notes

- Do not commit `.dev.vars`, `.env`, or production secrets
- Do not create paid Cloudflare resources or deploy production without approval
- Do not run live Stripe / registrar / MXroute operations in Phase 1

## Next manual setup (before staging)

See [`docs/PHASE1_MANUAL_SETUP.md`](./docs/PHASE1_MANUAL_SETUP.md) for the exact Cloudflare permissions and resources required. **Do not create them until approved.**
