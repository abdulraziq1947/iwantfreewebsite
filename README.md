# iwantfreewebsite.com

Cloudflare-native SaaS for managed UK business websites.

**£39.99/month. No upfront website fee. No minimum contract. Cancel anytime.**

Planning & audit: [`docs/README.md`](./docs/README.md) · [`WEBSITE_AUDIT.md`](./WEBSITE_AUDIT.md) · [`FEATURE_BACKLOG.md`](./FEATURE_BACKLOG.md) · [`PRODUCT_ROADMAP.md`](./PRODUCT_ROADMAP.md)

## What is shipped

| Area | Status |
| --- | --- |
| Marketing site + pricing + legal | Live |
| Pay-first get-started → Stripe Checkout | Live (test mode; live gated by `STRIPE_ALLOW_LIVE`) |
| Activation email + set password | Live (Resend) |
| Customer dashboard (journey, website preview/live, billing, email, GBP, support) | Live |
| Stripe Customer Portal (update card) + cancel/resume | Live |
| Self-serve password reset | Live |
| Admin client folders, queues, ops tasks (GBP / renewals) | Live |
| Staff MFA enrollment gate | Live |
| Mailbox credentials (encrypted at rest) | Live |
| D1 migrate-before-deploy + `/api/health` schema check | Live |
| Automated domain buy / site builder / GBP auto-post | **Not built** (manual ops) |
| Rank tracking add-on | Flagged off |

## Monorepo layout

```
apps/web          React Router + Cloudflare Workers app
apps/jobs         Jobs worker stub (Cron later)
packages/db       Drizzle schema + D1 migrations
packages/auth     Better Auth factory + RBAC helpers
packages/ui       Shared UI components
packages/config   Zod env schemas + role constants
docs/             Architecture + ops documents
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
# Optional: BOOTSTRAP_OWNER_EMAIL=you@example.com to grant platform_owner on login
# Optional Stripe test keys + RESEND_API_KEY for checkout / emails

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
| `pnpm db:migrate:production` | Apply migrations to production D1 (**approval required**) |

**Always migrate D1 before deploying Worker code that needs new tables.** See [`docs/PRODUCTION_DEPLOYMENT.md`](./docs/PRODUCTION_DEPLOYMENT.md).

## Environments

Defined in `apps/web/wrangler.jsonc`:

| Env | Worker name | Notes |
| --- | --- | --- |
| default / development | `iwantfreewebsite` | Local D1 |
| `staging` | `iwantfreewebsite-staging` | Keep migration head aligned with production |
| `production` | `iwantfreewebsite` | Requires approval; never activate live Stripe without verification |

Workers Builds must use **root directory `apps/web`**. See [`docs/WORKERS_BUILDS_INVESTIGATION.md`](./docs/WORKERS_BUILDS_INVESTIGATION.md).

Secrets (never commit): `BETTER_AUTH_SECRET`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `RESEND_API_KEY`, optional `MAILBOX_ENCRYPTION_KEY`.  
Vars: `APP_URL`, `APP_ENV`, `STRIPE_PRICE_ID`, optional `STRIPE_ALLOW_LIVE`, `GO_LIVE_SLA_LABEL`.

## Auth & roles

- Email/password via Better Auth (`/api/auth/*`)
- Customer memberships → `/dashboard` (org-scoped)
- Staff `platform_roles` → `/admin` (MFA required)
- Password reset: `/forgot-password` + `/reset-password`
- Feature flag `rank_tracking_checkout_enabled` defaults **false**

## Security notes

- Do not commit `.dev.vars`, `.env`, or production secrets
- Do not create paid Cloudflare resources or deploy production without approval
- Do not set `STRIPE_ALLOW_LIVE=true` until live credentials and webhook are verified
- Mailbox passwords are encrypted at rest; never log them

## Docs

Start at [`docs/README.md`](./docs/README.md). Prefer code + `WEBSITE_AUDIT.md` when older phase docs disagree.
