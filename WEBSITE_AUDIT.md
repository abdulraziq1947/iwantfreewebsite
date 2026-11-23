# Website product audit — iwantfreewebsite.com

**Date:** 23 November 2026 (Europe/London)  
**Scope:** Read-only Kenji three-pass audit of the shipped codebase on `main`  
**Method:** `workflow-onboard`, `audit-ux-journeys`, `plan-stub-checker`, `audit-ui-states`, `audit-backend-architecture`, `audit-db-schema`, `audit-payment-system`, `audit-auth-flows`, `audit-env-parity`, `plan-security-audit`, `audit-ux`, `audit-responsive`, `audit-uiux-design-system`, `enhance-onboarding` (analysis), `enhance-web-conversion` (analysis), `plan-pricing`  
**Constraint:** No application code, schema, infra, or production data was modified for this audit.

Evidence tags:

- **[verified]** — confirmed in code, routes, schema, or config
- **[observed]** — confirmed by reading UI copy / structure (not a live headed walkthrough of every path)
- **[judgment]** — impact recommendation, not a factual claim about missing code

---

## Executive product snapshot

| Item | Finding |
| --- | --- |
| Product | Managed UK business websites as a subscription service |
| Price | **£39.99/month**, £0 upfront, cancel anytime — consistent across marketing, funnel, billing constants |
| Acquisition | Pay-first funnel: questionnaire → Stripe Checkout → activation email → dashboard |
| Ops model | Staff manually register domains, build/host sites externally, paste MXroute mailbox details, mark live |
| Stack | React Router 7 + Cloudflare Workers + D1/Drizzle + Better Auth + Stripe + R2 |
| Live site | `https://iwantfreewebsite.com` (Worker production env) |

**What is already shipped and working (preserve):** get-started funnel, pending orders, Stripe **test** Checkout + signed webhooks + idempotent `stripe_events`, fulfillment → org/user/subscription/domain task, activation email, customer dashboard journey stages, attention board, mark-live + notifications, mailbox credentials UI (admin + customer), support tickets, cancel-at-period-end, admin client folder (brief/email/images/billing/tasks), domain/transfer queues, R2 media uploads.

**What marketing sells that code does not fully automate:** weekly GBP posts/review replies (invite/status only), domain purchase/renewal (manual queue + RDAP check), website build/preview/hosting (external URL on domain task), rank tracking (£9.99 — flagged off, no UI).

---

## Pass 1 — Product discovery & customer journeys

### 1.1 Orientation (`workflow-onboard`)

**Purpose:** Managed website subscription for UK small businesses.  
**Key packages:** `apps/web`, `packages/db`, `packages/auth`, `packages/config`, `packages/ui`. Jobs worker is a stub (`apps/jobs`).  
**Auth:** Better Auth email/password; staff via `platform_roles`; `requireAuth` / `requireStaffSession` in `apps/web/app/lib/session.server.ts`.  
**Data:** D1 tables through migration `0010_mailbox_password` (organisations, memberships, pending_orders, subscriptions, domain_registration_tasks, organisation_mailboxes, support, notifications, uploads, etc.).

Docs drift **[verified]:** `README.md` still describes Phase 1 without Stripe; app implements the full test Stripe funnel. `docs/CUSTOMER_DASHBOARD.md` / `ONBOARDING_FLOW.md` describe post-pay wizards, preview, payment-method UI ahead of code.

### 1.2 User stories & journey outcomes (`audit-ux-journeys`)

| Story | Path | Outcome | Evidence |
| --- | --- | --- | --- |
| Prospect buys plan | `/` → `/get-started` → personal → business → media → domain → review → Stripe | Completes with friction (long pre-pay form) | **[observed]** COMPLETED-WITH-FRICTION |
| Activate account | Email → `/get-started/activate` → password → `/dashboard` | Completes if email works | **[verified]** |
| See progress / wait for site | `/dashboard`, `/dashboard/onboarding`, `/dashboard/website` | Completes; largely passive wait | **[observed]** |
| Use business email | `/dashboard/email` after staff saves mailbox `active` | Completes when staff provisioned | **[verified]** |
| Manage domain | `/dashboard/domain` | Read-only status; staff own purchase | **[verified]** |
| GBP Manager | `/dashboard/google-business` | Invite/status only | **[verified]** |
| Billing / cancel | `/dashboard/billing` | Cancel/resume at period end works in code | **[verified]** |
| Support | `/dashboard/support` | Tickets CRUD + staff reply | **[verified]** |
| Staff mark live | Admin client Overview / Domains | Sets `connected` + `liveUrl`, notifies | **[verified]** |
| Add another site | CTAs → `/get-started?new=1` | New order possible; workspace always `orgs[0]` — no switcher | **[verified]** COMPLETED-WITH-FRICTION / IA bug |

### 1.3 Stub / unfinished inventory (`plan-stub-checker`)

Preservation: do not remove working Stripe test path, mailbox UI, attention board, or mark-live until replaced.

| ID | Type | Severity | Evidence |
| --- | --- | --- | --- |
| S02 | Live Stripe blocked | **P0** | `stripe.server.ts` rejects non-`sk_test_` keys |
| D01 | Multi-org primary always first | **P1** | `customer-org.server.ts` uses `orgs[0]` |
| C01 | “manual, after payment” on package includes | **P1** | `get-started.ts` `PACKAGE_INCLUDES` |
| B01 | GBP weekly posts sold, not productised | **P1** | Home/pricing vs GBP dashboard |
| M09 / S07 | Preview promised; no preview model | **P1** | `dashboard.website.tsx` copy; no `previewUrl` |
| D02 | No Stripe Customer Portal / card update | **P1** | Docs vs `dashboard.billing.tsx` |
| D03 | Account profile read-only | **P1** | `dashboard.account.tsx` |
| S06 | No self-serve password reset | **P1** | Account → contact support only |
| S01 | Jobs worker stub / no Cron | **P2** | `apps/jobs` |
| S05 / B04 | 2FA plugin, no MFA UI / staff enforcement | **P2** | `create-auth.ts` |
| D09 | `CopyRow` has no clipboard | **P3** | `dashboard.email.tsx` |
| F02 | Portfolio authenticity claim | **P2** | `home.tsx` `BUILT_SITES` |

No empty `onClick={() => {}}` or “Coming soon” customer CTAs found **[verified]**.

### 1.4 UI states (`audit-ui-states`)

| Screen | Empty | Loading | Error |
| --- | --- | --- | --- |
| Support / notifications / media | Present | Form busy only | Action strings / root boundary |
| Billing invoices | Present | Form busy | Fine-print `invoiceError` |
| Email not provisioned | Preference + status copy | Form busy | Action errors |
| Dashboard/admin loaders | Partial | No skeletons | Generic root “Something went wrong” |
| Multi-org empty | Copy present | — | — |

**Major gaps:** no route-level error recovery; no slow-load skeletons; preview/cancel-before-complete states documented but not modelled **[judgment]**.

---

## Pass 2 — Architecture & reliability

### 2.1 Backend architecture (`audit-backend-architecture`)

**Topology [verified]:** Modular monolith on one Worker (`apps/web/workers/app.ts`) — routes + `/api/auth`, `/api/stripe/webhook`, `/api/uploads`. Server logic in `*.server.ts`; client-safe libs without secrets.

| Pattern | Status | Fit |
| --- | --- | --- |
| Modular monolith | Implemented | Correct for stage — **defer** microservices |
| Sync request/response | Implemented | Fits |
| Webhook as source of truth (Stripe) | Implemented | Keep |
| Outbox / queues / Cron | Missing (jobs stub) | **Adopt when** renewals/GBP SLAs need scheduling |
| CQRS / event bus | N/A | Defer |
| Workers for Platforms / multi-tenant site hosting | Missing | **Adopt when** Phase 5 website productisation starts — not required for manual live URLs |

**Risks [judgment]:** large `admin-ops.server.ts` / `customer-org.server.ts` god-modules; docs describe `packages/integrations` that does not exist.

### 2.2 Database schema (`audit-db-schema`)

**Migrations present:** `0000`–`0010` in `packages/db/migrations`.  
**Core model [verified]:** organisations ↔ memberships ↔ user; pending_orders → fulfillment; subscriptions + checkout_sessions + stripe_events; domain_registration_tasks (+ `live_url`); organisation_mailboxes (+ plaintext `password`); support_tickets/messages; notifications; uploads + rate limits; asset_transfer_tasks; account_activation_tokens; feature_flags; audit_logs.

| Finding | Severity | Notes |
| --- | --- | --- |
| Mailbox `password` stored plaintext | High (privacy) | Intentional for customer Show/Hide — treat as sensitive PII; HTTPS + auth only mitigations today |
| No first-class `websites` / preview / revisions tables | Med | Matches manual hosting model |
| No domain expiry / renewal task tables | Med | Sold “renewal” is operational, not scheduled |
| No GBP post/review task tables | Med | Marketing ahead of schema |
| Production previously lagged migrations | High (ops) | Deploy-before-migrate caused `/dashboard` outage until `0009` applied |

### 2.3 Payments (`audit-payment-system`)

**Scope:** Stripe Checkout subscriptions (offloaded ledger) — idempotency + webhook verify apply; in-house double-entry N/A.

| Control | Status | Evidence |
| --- | --- | --- |
| Webhook signature verify | OK | `constructEventAsync` in `stripe-webhook.server.ts` |
| Idempotent event processing | OK | `recordStripeEventOnce` + `stripe_events` PK |
| Price allowlist / server amount | OK | `WEBSITE_PLAN_UNIT_AMOUNT` / `STRIPE_PRICE_ID` |
| Checkout idempotency keys | OK | `pending_checkout_${order.id}_…` |
| Test-mode hard gate | OK for launch safety / **blocker for live revenue** | Rejects live secrets + livemode events |
| Customer Portal / payment method update | Missing | — |
| Rank-tracking add-on checkout | Gated off | Flag unused by routes |

### 2.4 Auth (`audit-auth-flows`)

| Gate | Status |
| --- | --- |
| Customer routes via `requireAuth` | OK |
| Admin via `requireStaffSession` (platform roles) | OK — non-staff redirected to `/dashboard` |
| Support ticket org scoping | OK — `organisationIds` check in `support.server.ts` |
| Upload org / pending-order binding | Present in `uploads.server.ts` |
| MFA enroll UI / staff MFA enforced | Missing |
| Password reset | Missing (support-only) |
| Multi-org selection | Missing — first membership wins |

### 2.5 Env parity (`audit-env-parity`)

| Env | D1 | APP_URL | Notes |
| --- | --- | --- | --- |
| Local | `iwfw-local` | localhost | OK |
| Staging | `iwfw-staging` | workers.dev | Staging D1 previously had no `d1_migrations` table when probed — treat as **underused / drift risk** |
| Production | `iwfw-production` | iwantfreewebsite.com | Migrations must be applied **before** Worker code that queries new tables |

Secrets expected (names only): `BETTER_AUTH_SECRET`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `RESEND_API_KEY`, optional `BOOTSTRAP_OWNER_EMAIL`, `GBP_MANAGER_EMAIL`.  
Vars: `APP_URL`, `APP_ENV`, `STRIPE_PRICE_ID`.

### 2.6 Security plan (`plan-security-audit`) — plan only

| Phase | Item | OWASP-ish | Risk |
| --- | --- | --- | --- |
| Critical | Unlock live Stripe only with verified webhook endpoint + rotated secrets | A07 | Revenue / wrong-mode events |
| Critical | Migration gate in deploy checklist (no code before D1) | A04 | Availability (dashboard 500) |
| High | Mailbox password handling (access logs, staff RBAC, avoid support screenshots) | A02 | Credential disclosure |
| High | Staff MFA enforce | A07 | Admin takeover |
| High | Password reset via Better Auth email | A07 | Account recovery abuse / support load |
| Med | CSP / security headers review on Worker responses | A05 | XSS impact |
| Med | Upload malware scanning (documented TBD) | A04 | R2 abuse |
| Med | Audit log coverage for mark-live, mailbox save, org status | A09 | Forensics |
| Low | Dependency `pnpm audit` cadence | A06 | Supply chain |

No exploit steps included. RLS N/A (D1 + app-layer authz, not Postgres RLS).

---

## Pass 3 — UX, conversion & growth

### 3.1 Per-page UX (`audit-ux`) — highlights

| Surface | Strength | Issue |
| --- | --- | --- |
| Homepage | Clear price + phone + portfolio | How-it-works says “create account” but funnel is pay-first; generic trust strip |
| Get-started | Clear steps + resume | Business step cognitive overload |
| Dashboard home | Reassuring wait copy + stages | Overview / Progress / Website overlap; “Add another site” competes |
| Email (active) | Incoming/outgoing cards + password Show | CopyRow not copyable |
| Admin client | Strong ops folder | Client list lacks triage filters |

### 3.2 Responsive (`audit-responsive`)

Journey cards top-align after #31. Breakpoint sprawl (359–1100px) **[observed]**. Mobile nav chips scroll; admin tables scroll — intentional. Funnel step labels ellipsis on narrow phones.

### 3.3 Design system (`audit-uiux-design-system`)

Tokens in `@iwfw/ui` (accent blue, CTA green, Plus Jakarta). Drift: `iwfw-btn` vs `iwfw-ui-btn`, multiple panel skins, some Tailwind utility pages. Unification is polish debt, not a launch blocker **[judgment]**.

### 3.4 Onboarding activation analysis (`enhance-onboarding` — analysis only)

- **Coded “activation”** = set password from email token (account access).  
- **Product aha** = staff marks website live (`domain_registration_tasks.status = connected`).  
- Brief is largely **pre-pay**; Progress is not the old 8-step post-pay wizard.  
- Gaps: no SLA / “expected go-live in X days”; GBP framed as attention during wait; email prefs not in get-started steps; no customer checklist for optional media.

### 3.5 Conversion analysis (`enhance-web-conversion` — analysis only)

- Price clarity excellent.  
- Primary risk: long pre-pay questionnaire vs impulse £39.99.  
- Homepage journey mismatch + dual CTAs (call vs buy).  
- Brand name “free” vs paid offer is unresolved positioning tension **[judgment]**.

### 3.6 Pricing (`plan-pricing`)

| Dimension | As implemented |
| --- | --- |
| Value metric | Per managed business website / org |
| Price | £39.99/mo GBP inclusive messaging |
| Free tier | None (name is marketing dissonance) |
| Add-ons | Rank tracking documented, not sold |
| Upgrades | None — multi-site = new checkout |
| Enterprise / annual | Not implemented |

**Recommendation [judgment]:** keep single SKU until live ops capacity is stable; then either annual discount or rank-tracking add-on — not both at once.

---

## Cross-cutting themes

1. **Ops-manual SaaS is honest in admin, undersold in customer/marketing copy** (domain “manual”, GBP weekly, preview).  
2. **Launch blockers are money + migrations**, not feature breadth.  
3. **Customer dashboard over-navigates a wait-state product.**  
4. **Docs/README lag the product** — treat code as source of truth until docs catch up.  
5. **Completed work to preserve:** pay-first funnel, attention board, mark-live notifications, mailbox per-customer flow, support tickets, cancel-at-period-end.

---

## Implementation progress (post-audit)

Branch: `cursor/saas-improvements-18f7` · Europe/London

### Batch 1 — Launch readiness (completed in code; live Stripe not activated)

| ID | Status | Notes |
| --- | --- | --- |
| FB-01 | Done (gated) | `STRIPE_ALLOW_LIVE` required for live keys/webhooks; default off |
| FB-02 / FB-22 | Done | `PRODUCTION_DEPLOYMENT.md` + `/api/health` required-table check |
| FB-03 / FB-04 / FB-06 / FB-34 | Done | Package/homepage/GBP copy; `docs/PORTFOLIO_REVIEW.md` |
| FB-15 | Done | Staff MFA page + `/admin` gate |
| FB-16 | Done | AES-GCM mailbox passwords; decrypt for Show UI |
| FB-12 | Done | GBP customer attention deferred until live |

**Tests:** `@iwfw/web` 78+ unit tests pass; package typechecks green.  
**Blockers:** Production migrate apply, live Stripe secrets/webhook, MFA enrollment for existing staff — need explicit approval.

### Batch 2 — Customer experience (completed in code)

| ID | Status | Notes |
| --- | --- | --- |
| FB-07 | Done | `preview_url` migration `0011`; admin set; customer preview CTA |
| FB-08 | Done | Stripe Billing Portal from `/dashboard/billing` |
| FB-09 | Done | `/forgot-password` + `/reset-password` via Better Auth + Resend |
| FB-10 | Done | `GO_LIVE_SLA_LABEL` on Overview/Website banners |
| FB-11 | Done | Progress nav removed; `/dashboard/onboarding` → `/dashboard` |
| FB-17 | Done | Copy buttons on mailbox fields |
| FB-24 | Done | Desktop topbar Log in |

**Tests:** `@iwfw/web` 79 unit tests pass; typecheck green.  
**Deps:** Resend for reset emails; Stripe Portal configuration in Stripe Dashboard.

### Batch 3 — Operational automation (completed in code)

| ID | Status | Notes |
| --- | --- | --- |
| FB-13 | Done | Client search + live/attention filters; attention badge |
| FB-20 | Done | `/admin/ops` GBP weekly post/review tasks (generate, track; no auto-publish) |
| FB-21 | Done | `renews_at` on domain tasks + renewal ops tasks (no auto-purchase) |
| FB-28 | Done | `writeAuditLog` on mark-live, preview, mailbox, org status, ops |

**Tests:** `@iwfw/web` 84 unit tests pass; typecheck green.  
**Migration:** `0012_ops_tasks` must be applied before deploy (health check requires `ops_tasks`).

---

## Related artefacts

- Ranked work: [`FEATURE_BACKLOG.md`](./FEATURE_BACKLOG.md)  
- Phased plan: [`PRODUCT_ROADMAP.md`](./PRODUCT_ROADMAP.md)  
- Legacy phase plan (partially superseded): `docs/IMPLEMENTATION_ROADMAP.md`
