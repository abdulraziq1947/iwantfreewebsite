# Implementation Roadmap

## Principles

- Small, testable phases; staging before production.
- Docs approved before coding (this phase).
- Rank tracking sold only after Phase 7 acceptance.
- No automated registrar purchasing in any phase.

## MVP definition (launch-critical)

Sales site + legal pages, auth, Stripe Checkout (website only), webhooks, entitlements, onboarding + R2, admin shells, **manual** domain purchase/renewal queues + check API, DNS/email (MXroute), one template → preview/live on simpler Workers hosting, GBP weekly tasks (manual), support tickets, cancel-anytime billing UX, cancel-before-complete handling.

**Not MVP:** live rank-tracking sales, Cloudflare for SaaS at scale, Workers for Platforms, website source-transfer product, reseller MXroute.

---

## Phase 0 — Planning (current)

**Objective:** Approved architecture docs in `/docs`.

**DoD:** 19 docs merged; stakeholder approval to code.

---

## Phase 1 — Foundation

**Objective:** Monorepo, D1 schema, auth, design system, feature flags.

**Features:** pnpm workspaces; `apps/web` React Router; `packages/db` Drizzle migrations; Better Auth; Tailwind UI kit; `feature_flags`; healthcheck; env split.

**Dependencies:** Cloudflare account; GitHub.

**DB:** Core identity, orgs, memberships, platform_roles, feature_flags, audit_logs.

**Security:** Strict TS; secret scaffolding; MFA for staff accounts.

**Tests:** Auth signup/login; RBAC deny; migration apply on local D1.

**Acceptance:** User can register/login on staging; staff MFA enforced; flag defaults `rank_tracking_checkout_enabled=false`.

**DoD:** Staging deploy green; README for local `wrangler`/`vite` (when coding begins).

---

## Phase 2 — Sales + Stripe

**Objective:** Conversion site + £39.99 Checkout + webhooks + cancel/reactivate.

**Features:** Required pages; Turnstile; Checkout Session; webhook worker path; entitlements; billing UI; cancel at period end; no add-on in Checkout.

**DB:** subscriptions, items, stripe_events, entitlements, invoices_cache.

**External:** Stripe test → live.

**Security:** Webhook verify; price allowlist.

**Tests:** Webhook idempotency; cancel_at_period_end sync; rejected client price tampering.

**Acceptance:** Test payment creates org entitlements; cancel shows end date; marketing copy matches approved model.

---

## Phase 3 — Dashboards + Onboarding

**Objective:** Customer/admin shells; full onboarding with domain search/select.

**Features:** Onboarding steps; R2 uploads; domain check API; disclaimer; registrant capture; save/resume; admin onboarding view.

**DB:** onboarding, business_profiles, uploads, domain_requests.

**Tests:** Isolation; upload authz; domain premium rejection.

**Acceptance:** Paid customer completes onboarding; domain request creates admin task only after payment.

---

## Phase 4 — Domains (manual) + Email

**Objective:** Admin purchase/renewal ops + MXroute mailbox.

**Features:** Purchase checklist UI; recheck; record purchase; renewal Cron tasks 60/30/14/7; DNS checklist; MXroute provision workflow; SPF/DKIM/DMARC tracking; capacity alerts.

**DB:** domains, domain_orders, dns_checks, domain_renewal_tasks, email_mailboxes.

**External:** Registrar check API; MXroute; manual registrar dashboard.

**Security:** Block auto-register code paths; audit all domain actions; cancel blocks new purchases.

**Tests:** Idempotent order keys; renewal task generation; MX overwrite requires approval.

**Acceptance:** Staff can take Requested → Active manually; renewals surface before expiry; no purchase API calls in codebase.

---

## Phase 5 — Website production

**Objective:** Template → preview → approve → live on MVP Workers hosting.

**Features:** One industry template; content editor; revisions; forms/leads; cancel-before-complete; export content.

**DB:** templates, websites, website_revisions, leads.

**Security:** Form Turnstile; tenant lead isolation.

**Acceptance:** Preview and live URLs work; customer approval flow; cancelled-during-build stops work.

**Note:** Defer Cloudflare for SaaS unless existing-domain volume demands it.

---

## Phase 6 — GBP tasks

**Objective:** Full Manager-invite onboarding + weekly post/review reply ops.

**Features:** Dedicated onboarding step with configurable Manager email; Manager-not-Owner instructions; I’ve sent invitation / I need help / I don’t have a profile; admin notify on invite claim; staff-only Connected verification; Cron weekly `gbp_post` for Connected orgs; review reply tasks; evidence + activity history; customer statuses Action Required / Invitation Sent / Connected.

**Acceptance:** Customer click never alone sets Connected; admins notified on invite claim; entitled Connected customers get weekly tasks; overdue notifies; no API review-scraping claims in UI.

---

## Phase 7 — Rank tracking (build then sell)

**Objective:** Operational tracking **before** Checkout offer.

**Features:** Projects, 5 KW, 3×3 grid, Cron/Queues, DataForSEO Standard, dashboards, usage ledger, spend caps.

**Tests:** Cost cap kill switch; organic vs maps labelling; staging soak ≥ 2 weekly cycles.

**Acceptance:** Platform Owner enables `rank_tracking_checkout_enabled` only after soak; then £9.99 appears unchecked at Checkout.

---

## Phase 8 — Hardening

**Objective:** GDPR tooling, backups drills, financial reports, extra templates, optional Cloudflare for SaaS.

**Acceptance:** Restore drill documented; DSAR/deletion runbook; staging soak sign-off for major releases.

---

## Safest order

**0 → 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8**

Do not reorder to sell rank tracking earlier. Do not add auto domain purchase later without a new explicit product decision.

## Exact first implementation task (after docs approval)

Scaffold the pnpm monorepo with `apps/web` (React Router + Cloudflare Vite plugin), `packages/db` Drizzle schema v1 (users/orgs/memberships/feature_flags), Wrangler configs for development/staging/production, Better Auth email/password sessions against D1, staff MFA hook scaffolding, and a authenticated healthcheck that reads D1 — **no Stripe charges, no registrar purchases, no MXroute writes.**
