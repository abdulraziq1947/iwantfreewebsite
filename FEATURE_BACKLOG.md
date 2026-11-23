# Feature backlog — iwantfreewebsite

Derived from the 23 Nov 2026 product audit (`WEBSITE_AUDIT.md`).  
**Do not re-implement completed work** listed at the bottom.

Scoring (1–5): **Impact** (revenue, trust, ops time, risk), **Effort** (1=small, 5=large), **Urgency** (1=later, 5=now).  
**Priority score** = Impact + Urgency − Effort (higher first).  
Types: `bug` · `copy` · `ops` · `feature` · `security` · `ux` · `docs` · `infra`

Every item includes **acceptance criteria**. Items marked `[verified]` are grounded in code; suggestions marked `[judgment]`.

---

## Ranked backlog

### P0 — Launch / money / availability

| ID | Title | Type | I | E | U | Score | Detail |
| --- | --- | --- | --- | --- | --- | --- | --- |
| FB-01 | Enable live Stripe Checkout path | infra | 5 | 3 | 5 | 7 | **[verified]** `stripe.server.ts` rejects non-`sk_test_` keys and livemode webhooks. **Impl:** gated config (e.g. `STRIPE_ALLOW_LIVE=1`) or remove test-only asserts after secrets + webhook endpoint verified; keep price allowlist. **AC:** Live card payment creates org + subscription; test keys still work in staging; duplicate webhook no double fulfill. |
| FB-02 | Deploy checklist: D1 migrate before Worker | ops | 5 | 1 | 5 | 9 | **[verified]** Missing `organisation_mailboxes` took down `/dashboard`. **Impl:** document + CI/ops step `db:migrate:production` before deploy; fail health if required tables missing (optional). **AC:** New migrations applied on production before code that queries them; runbook in `PRODUCTION_DEPLOYMENT.md`. |
| FB-03 | Honest package includes (remove “manual” leak) | copy | 4 | 1 | 5 | 8 | **[verified]** `PACKAGE_INCLUDES` says domain “manual, after payment” on customer get-started. **Impl:** customer-facing “Domain included — we register it after payment”; keep “manual” in admin docs only. **AC:** No “manual” on `/get-started` or review; admin docs still say staff registers. |

### P1 — Trust, journeys, revenue retention

| ID | Title | Type | I | E | U | Score | Detail |
| --- | --- | --- | --- | --- | --- | --- | --- |
| FB-04 | Fix homepage How-it-works vs pay-first funnel | copy | 4 | 1 | 4 | 7 | **[observed]** Home says create account then subscribe; product is questionnaire → pay → activate. **AC:** Three steps match get-started; no “create account first”. |
| FB-05 | Multi-org workspace selection | bug | 4 | 3 | 4 | 5 | **[verified]** `getCustomerWorkspace` always uses `orgs[0]`; “Add another site” exists. **Impl:** `?org=` or switcher; persist preference; scope tickets/uploads/billing to selected org. **AC:** User with 2 orgs can open each; nav shows active trading name. |
| FB-06 | Align GBP marketing with invite-only product | copy | 4 | 2 | 4 | 6 | **[verified]** Home/pricing promise weekly posts + review replies; UI is Manager invite/status. **Impl:** soften to “Google Business help included — we guide Manager access & posting” until task board exists. **AC:** Marketing matches dashboard; or ship FB-20 instead. |
| FB-07 | Customer preview before go-live | feature | 5 | 4 | 4 | 5 | **[verified]** Copy promises preview; only `liveUrl` on connect. **Impl:** `previewUrl` on domain task or websites table; Website page shows Preview CTA; Mark live remains separate. **AC:** Staff can set preview; customer sees it before “Website live”; live still requires mark-live. |
| FB-08 | Stripe Customer Portal (update card) | feature | 4 | 2 | 4 | 6 | **[verified]** Billing has invoices/cancel, no payment method UI. **Impl:** Billing Portal session link. **AC:** Customer updates card without support; cancelled/expired handled. |
| FB-09 | Self-serve password reset | feature | 4 | 2 | 4 | 6 | **[verified]** Account directs to support. **Impl:** Better Auth forgot-password + Resend. **AC:** Email link resets password; token single-use; staff path unchanged. |
| FB-10 | Expected go-live messaging / SLA | ux | 4 | 2 | 4 | 6 | **[judgment]** Activation aha is mark-live; wait has no timeline. **Impl:** configurable “usually X–Y working days” on Progress/Website; optional admin ETA field. **AC:** Waiting customers see timeframe; no false hard promise. |
| FB-11 | Collapse duplicate customer nav (Overview/Progress/Website) | ux | 3 | 2 | 3 | 4 | **[observed]** Three pages share journey stages. **Impl:** keep Overview as home; Progress redirects or merge; Website = live/preview only. **AC:** ≤1 journey visualisation; deep links updated. |
| FB-12 | Soften GBP “attention” while site not live | ux | 3 | 1 | 3 | 5 | **[judgment]** Attention board can panic users during wait. **Impl:** defer GBP items until live or mark optional. **AC:** Pre-live dashboard doesn’t show GBP as Action required unless staff flagged urgent. |
| FB-13 | Admin clients triage (search + needs-attention) | ops | 4 | 3 | 3 | 4 | **[observed]** Flat client table. **Impl:** search trading name/email; filter by live/not; sort by attention count. **AC:** Staff finds client in &lt;10s; list shows attention badge. |
| FB-14 | Edit business profile post-pay | feature | 3 | 3 | 3 | 3 | **[verified]** Account read-only; incomplete brief → support only. **Impl:** limited edit of contact/hours/services writing onboarding JSON + notify staff. **AC:** Customer updates phone/hours; admin brief reflects change; audit log optional. |

### P2 — Hardening, ops scale, polish

| ID | Title | Type | I | E | U | Score | Detail |
| --- | --- | --- | --- | --- | --- | --- | --- |
| FB-15 | Staff MFA enrollment + enforce for platform roles | security | 5 | 3 | 3 | 5 | **[verified]** Plugin on; no UI/gate. **AC:** Staff must enroll 2FA before `/admin`; customers optional. |
| FB-16 | Mailbox password handling policy | security | 4 | 2 | 3 | 5 | **[verified]** Plaintext in D1 for customer Show. **Impl:** document risk; restrict admin roles; optional encrypt-at-rest later; never log password. **AC:** Security doc updated; logs redacted; clear password checkbox works. |
| FB-17 | Email Copy buttons (clipboard) | ux | 2 | 1 | 2 | 3 | **[verified]** `CopyRow` displays only. **AC:** One-click copy on address/password/hosts with aria-live confirmation. |
| FB-18 | Route-level error + loading states | ux | 3 | 2 | 2 | 3 | **[verified]** Root boundary only. **AC:** Key dashboard loaders show skeleton; failed invoice fetch has retry. |
| FB-19 | Sync README + customer docs to shipped product | docs | 3 | 2 | 3 | 4 | **[verified]** README “no Stripe”; dashboard docs invent Portal/preview/wizard. **AC:** Docs match routes; Phase 1 claim removed. |
| FB-20 | GBP ops task board (weekly post / reviews) | feature | 4 | 4 | 2 | 2 | **[judgment]** Only if marketing keeps hard promise. **AC:** Staff queue per org; customer sees last completed week — or keep FB-06. |
| FB-21 | Domain renewal reminders (Cron) | ops | 4 | 4 | 2 | 2 | Jobs stub today. **AC:** Tasks 60/30/14/7 days before expiry; admin queue; no auto-purchase. |
| FB-22 | Staging D1 parity + migrate habit | infra | 3 | 2 | 3 | 4 | Staging DB previously empty of migrations when probed. **AC:** Staging has same migration head as prod; smoke checkout on staging. |
| FB-23 | Cookie Policy page / footer link | docs | 2 | 1 | 2 | 3 | Journey docs list it; only Privacy § cookies. **AC:** `/cookies` or clear Privacy section + footer link. |
| FB-24 | Desktop Log in in public topbar | ux | 2 | 1 | 2 | 3 | Login only in drawer/footer for logged-out desktop. **AC:** Visible Log in when logged out. |
| FB-25 | Shorten get-started Business step | ux | 4 | 3 | 3 | 4 | Split services/about or mark more optional. **AC:** Time-to-review reduced; required fields still collect brief-ready data. |
| FB-26 | Design-system unification plan | ux | 2 | 4 | 1 | 1 | Dual button/panel systems. **AC:** Single button API adopted on marketing + dashboard (can follow `plan-uiux-unification`). |
| FB-27 | Upload malware scanning | security | 3 | 4 | 1 | 0 | Documented TBD. **AC:** Policy decided; block/quarantine path if adopted. |
| FB-28 | Audit logs for mark-live / mailbox / org status | security | 3 | 2 | 2 | 3 | `audit_logs` table exists; ensure writes on sensitive admin actions. **AC:** Queryable history for live URL + mailbox saves. |

### P3 — Later / growth

| ID | Title | Type | I | E | U | Score | Detail |
| --- | --- | --- | --- | --- | --- | --- | --- |
| FB-29 | Rank-tracking add-on (£9.99) | feature | 3 | 5 | 1 | −1 | Flag exists; keep off until Phase 7 acceptance. |
| FB-30 | Annual billing discount | feature | 3 | 3 | 1 | 1 | Pricing audit: after live conversion data. |
| FB-31 | Template website hosting / editor (Phase 5) | feature | 5 | 5 | 2 | 2 | Replaces external-only live URLs. Large; follow `WEBSITE_PROVISIONING.md`. |
| FB-32 | Trade landers / SEO pages | feature | 3 | 3 | 1 | 1 | Growth; not required for ops MVP. |
| FB-33 | Product analytics event taxonomy | feature | 3 | 3 | 2 | 2 | Funnel drop-off measurement; `audit-analytics` later. |
| FB-34 | Portfolio claim verification | copy | 2 | 1 | 2 | 3 | Confirm `BUILT_SITES` are real customers before ads. |

---

## Explicitly out of scope / do not invent

- Auto domain purchase APIs (product forbids).  
- Workers for Platforms multi-tenant mesh before Phase 5.  
- In-house double-entry ledger (Stripe Checkout sufficient).  
- Rebuilding pay-first funnel into signup-first without a decision.  
- Fabricating Contact page content not in repo (add only if requested).

---

## Completed / preserve (do not reopen as “missing”)

| Area | Status |
| --- | --- |
| Pay-first pending-order Checkout (test) | Done |
| Webhook signature + idempotent events | Done |
| Activation email + set password | Done |
| Journey stages + mark live + live notify | Done |
| Attention board (hide when clear) | Done |
| Per-org mailbox + password Show/Hide + IMAP/SMTP cards | Done |
| Support tickets customer + staff | Done |
| Cancel at period end / resume | Done |
| R2 media uploads | Done |
| Domain RDAP check + admin domain queue | Done |
| Asset transfer tasks on cancel | Done |
| Incoming/outgoing mail card alignment | Done |
| Live-stage checkmark alignment | Done |
| FB-01 Live Stripe gate (`STRIPE_ALLOW_LIVE`, default off) | Done — branch `cursor/saas-improvements-18f7` (activation still needs prod approval) |
| FB-02 / FB-22 Migrate-before-deploy + `/api/health` schema check | Done |
| FB-03 / FB-04 / FB-06 / FB-34 Copy + portfolio review | Done |
| FB-12 Soften GBP attention pre-live | Done |
| FB-15 Staff MFA enroll + gate | Done |
| FB-16 Mailbox password AES-GCM at rest | Done |
| FB-07 Preview URL (`preview_url` + admin set + customer CTA) | Done |
| FB-08 Stripe Customer Portal (Update payment method) | Done |
| FB-09 Self-serve password reset (Better Auth + Resend) | Done — needs `RESEND_API_KEY` in each env |
| FB-10 Go-live SLA messaging (`GO_LIVE_SLA_LABEL`) | Done |
| FB-11 Collapse Progress into Overview (redirect) | Done |
| FB-17 Mailbox Copy buttons | Done |
| FB-24 Desktop Log in in topbar | Done |
| FB-13 Admin clients search / live / attention filter | Done |
| FB-20 GBP weekly ops task board (manual generate, no auto-publish) | Done |
| FB-21 Domain renews-at + renewal reminder tasks (no auto-purchase) | Done |
| FB-28 Audit logs for mark-live / mailbox / org status / ops | Done |

When closing a backlog item, move it here with PR/date.
