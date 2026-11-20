# Technology Stack

## Framework comparison — vinext vs React Router (locked decision)

Cloudflare documents both paths for Workers apps:

| Criteria | **React Router v8** (formerly Remix lineage) | **vinext** (Next.js API on Vite) |
| --- | --- | --- |
| Official Workers guide | First-class [React Router guide](https://developers.cloudflare.com/workers/framework-guides/web-apps/react-router/) with Cloudflare Vite plugin | Recommended path when you want **Next.js** on Workers |
| Maturity on Workers | Long-standing Remix/React Router Workers support; Vite plugin GA | vinext reimplements Next.js; check compatibility dashboard; treated as beta-compatible surface |
| Best fit | **Greenfield** apps organised around route loaders/actions | Existing Next.js apps, or teams standardised on App Router/RSC/Server Actions |
| Mental model | Routes, loaders, actions, progressive enhancement | `app/` router, RSC, Server Actions, `next/*` |
| SPA mode | Not supported with Cloudflare Vite plugin (SSR/framework mode is the path) | Next-style rendering modes per vinext support matrix |
| Hiring / familiarity | Strong if team likes Remix-style full-stack React | Strong if team is Next.js-first |
| This repo | Empty greenfield — no Next.js investment to preserve | No existing Next.js codebase to migrate |

### Decision (locked for planning)

**Use React Router v8 + Cloudflare Vite plugin** for the platform application.

Reasons:

1. Repository is greenfield — no Next.js code to reuse.
2. Cloudflare’s React Router Workers path is a first-class, conventional choice for new full-stack Workers apps.
3. Loaders/actions map cleanly to multi-tenant SaaS forms (onboarding, admin tasks, Checkout session creation).
4. Avoids vinext’s Next.js compatibility surface area and beta gaps (e.g. incomplete App Router features called out in vinext docs) when we do not need Next.js specifically.
5. Still React + TypeScript + Tailwind as required.

**Revisit vinext only if** a future product requirement strongly depends on Next.js-specific features that React Router cannot cover, or the team standardises on Next.js for other reasons.

## Locked stack

| Layer | Choice |
| --- | --- |
| Language | TypeScript (strict) |
| UI | React 19 + Tailwind CSS |
| App framework | **React Router v8** on Cloudflare Workers |
| Auth | Better Auth (D1) + staff MFA |
| Database | Cloudflare D1 + Drizzle ORM |
| Object storage | Cloudflare R2 (private) |
| Cache / flags | Cloudflare KV (feature flags, hostname maps if needed) |
| Async | Queues + Workflows + Cron Triggers |
| Bot protection | Cloudflare Turnstile |
| Payments | Stripe Billing + Checkout + webhooks |
| Email hosting | MXroute REST API |
| Domain check | Cloudflare Registrar API **search/check only** (verify account eligibility in staging); fallback check provider if needed |
| Domain buy/renew | **Manual** (admin) |
| Rank data | DataForSEO (when feature enabled) |
| Monorepo | pnpm workspaces + Turborepo (or pnpm only) |
| CI | GitHub Actions → staging then production |
| Email transactional | Prefer Cloudflare Email Sending / Resend-like only if needed later — default plan: Worker-triggered provider TBD in OPEN_QUESTIONS; avoid unnecessary SaaS |

## Packages (logical monorepo)

```
apps/web                 # React Router platform (sales + dashboards + APIs)
apps/jobs                # Cron / queue consumers / workflow entry
packages/db              # Drizzle schema + migrations
packages/auth            # Better Auth factory (env-scoped)
packages/integrations    # stripe, mxroute, dataforseo, registrar-check
packages/ui              # design system
packages/config          # zod env schemas
templates/*              # industry website templates
docs/                    # this documentation
```

## Compatibility notes

- Enable `nodejs_compat` where required by Better Auth / Stripe SDK usage; verify against current Workers docs at implementation time.
- Generate Env types with `wrangler types`.
- Do not use deprecated Workers Sites for new work — use Workers Static Assets.
- No n8n. Prefer Cloudflare-native automation.

## Design system

- Clean, minimal, mobile-first, accessible (WCAG 2.2 AA target).
- Trustworthy UK SME aesthetic; avoid generic “AI purple” tropes.
- Shared components across sales, onboarding, customer, and admin UIs.
