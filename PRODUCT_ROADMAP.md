# Product roadmap — iwantfreewebsite

**Updated:** 23 November 2026 (Europe/London)  
**Source of truth for priorities:** [`FEATURE_BACKLOG.md`](./FEATURE_BACKLOG.md) · evidence in [`WEBSITE_AUDIT.md`](./WEBSITE_AUDIT.md)  
**Relationship to** `docs/IMPLEMENTATION_ROADMAP.md`: that doc remains historical phase planning. This roadmap reflects **what is already shipped** and the **next recommended sequence**. Prefer this file for sequencing new work.

---

## Product north star

Sell and operate a **£39.99/month managed business website** for UK SMEs: collect a brief, take payment, staff deliver domain + site + mailbox + GBP help, customer tracks progress and billing in-app.

**Activation (product):** customer can open their live site URL.  
**Activation (account):** customer sets password from fulfillment email.  
Do not conflate the two in metrics or UX.

---

## Current state (shipped)

| Capability | State |
| --- | --- |
| Marketing site + pricing + legal | Live |
| Pay-first get-started funnel | Live |
| Stripe Checkout + webhooks | Test mode default; **live gated by `STRIPE_ALLOW_LIVE`** (off until approved) |
| Customer dashboard + journey stages | Live (Overview = journey home; Progress redirects) |
| Website preview before go-live | Live (`preview_url` on domain task) |
| Stripe Customer Portal (card update) | Live |
| Self-serve password reset | Live (requires Resend) |
| Staff MFA gate | Live |
| Mailbox credential sharing (encrypted at rest) | Live |
| Admin client folder + queues | Live |
| Support tickets + notifications | Live |
| Cancel / resume billing | Live |
| Automated domain buy / site builder / GBP posting | **Not built** (manual ops) |
| Rank tracking add-on | Flagged off |

---

## Roadmap phases

### Phase A — Launch integrity (now)

**Goal:** Take real money safely; never brick production on migrate; stop copy that undermines trust.

| Backlog | Outcome |
| --- | --- |
| FB-02 | ✅ Migrate-before-deploy runbook + health schema gate |
| FB-01 | ✅ Gated live Stripe path — **blocked on prod credential/webhook approval** |
| FB-03, FB-04, FB-06, FB-34 | ✅ Marketing/funnel/GBP copy + portfolio review doc |
| FB-19 | Next (docs sync) |

**Exit criteria:** Live Checkout succeeds end-to-end on production; package includes and How-it-works match the product; deploy checklist includes D1.

---

### Phase B — Customer confidence while waiting (next)

**Goal:** Waiting for the website feels calm, clear, and professional.

| Backlog | Outcome |
| --- | --- |
| FB-10 | ✅ Expected go-live window |
| FB-07 | ✅ Preview URL before mark-live |
| FB-11, FB-12 | ✅ Simpler nav; GBP attention deferred pre-live |
| FB-08, FB-09 | ✅ Card update + password reset without support |
| FB-17, FB-24 | ✅ Email copy UX + desktop Log in |
| FB-18 | Deferred this cycle |

**Exit criteria:** Customers can state when to expect live + open a preview; billing self-serve covers card + cancel; support volume for password/card drops.

---

### Phase C — Ops scale

**Goal:** Staff handle more clients without tribal knowledge.

| Backlog | Outcome |
| --- | --- |
| FB-13 | ✅ Client list search / attention filters |
| FB-15, FB-16, FB-28 | ✅ Staff MFA, mailbox crypto, audit logs |
| FB-20, FB-21 | ✅ GBP + domain renewal ops task board |
| FB-22 | ✅ Staging migrate habit / health gate |
| FB-05, FB-14 | Deferred unless usage justifies |
| FB-25 | Deferred unless funnel drop-off justifies |

**Exit criteria:** New staff can triage clients from list; sensitive actions audited; multi-site customers not stuck on wrong org.

---

### Phase D — Deliver what you sell (productise ops)

Pick **one** track based on sales promises you want to keep hard:

**D1 — Google Business delivery** (FB-20)  
Staff task board for weekly posts / review replies; customer sees last activity.  
*Or* keep soft marketing copy (FB-06) and skip D1.

**D2 — Domain lifecycle** (FB-21)  
Renewal reminder Cron + admin queue; still **no** auto-purchase.

**D3 — Hosted website product** (FB-31)  
Template → preview → approve → live on Workers hosting (`docs/WEBSITE_PROVISIONING.md`). Largest investment; replaces “paste live URL” as the long-term model.

**Exit criteria:** Chosen track has customer-visible status, not only admin memory.

---

### Phase E — Growth (after conversion is measurable)

| Backlog | Notes |
| --- | --- |
| FB-33 | Analytics on funnel + activation |
| FB-30 | Annual plan if churn/cash warrants |
| FB-29 | Rank tracking only after acceptance tests |
| FB-32 | Trade SEO landers |
| FB-26 | Design-system unification when polish ROI is clear |

**Exit criteria:** Decisions driven by funnel data, not feature appetite.

---

## Sequencing principles

1. **Money and uptime before features** (Phase A).  
2. **Do not build automation that fights the manual ops model** until Phase D is chosen.  
3. **One SKU** until live ops capacity is stable (`plan-pricing`).  
4. **Preserve** pay-first funnel, attention board, mailbox flow, mark-live notify, support tickets.  
5. **Approve before code** on security and payment items (FB-01, FB-15, FB-16).

---

## Suggested near-term milestone (2–3 focused PRs)

1. **Copy + docs sync** — FB-03, FB-04, FB-06, FB-19 (low effort, high trust).  
2. **Ops runbook + migrate gate** — FB-02.  
3. **Live Stripe unlock** — FB-01 (after secrets/webhook ready).  
4. **Wait-state UX** — FB-10 + FB-12 (+ FB-07 if preview URL field is quick).

Then reassess Phase B vs C based on support tickets and signup volume.

---

## Metrics to watch (once analytics exist)

| Metric | Definition |
| --- | --- |
| Checkout start → paid | Funnel conversion |
| Paid → password set | Account activation |
| Paid → website live | Product activation (ops SLA) |
| Cancel at period end rate | Retention |
| Support tickets / active org | Ops load |
| Time on Business step | Pre-pay friction |

Until FB-33 ships, use Stripe + admin queues + support volume as proxies.
