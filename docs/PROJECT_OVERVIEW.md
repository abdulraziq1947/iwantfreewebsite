# Project Overview — iwantfreewebsite.com

## Purpose

iwantfreewebsite.com is a Cloudflare-native SaaS platform that sells fully managed business websites to UK trades and local businesses on a transparent monthly subscription.

**Positioning (mandatory copy):**

> £39.99/month. No upfront website fee. No minimum contract. Cancel anytime.

The brand name must never imply that the paid service is free. Marketing, Checkout, and Terms must state the price and cancellation terms clearly.

## Approved business model

| Item | Decision |
| --- | --- |
| Core package | £39.99/month |
| Upfront website fee | None |
| Minimum contract | None — cancel anytime |
| Early cancellation penalty | None |
| Cancellation effect | End of current paid billing period |
| Partial-month refunds | Not automatic for voluntary cancel (subject to law) |
| Included while subscribed | Website hosting/management, domain registration + standard renewals (when we supply the domain), 1 business mailbox, weekly GBP post, review replies, customer dashboard, support |
| Optional add-on | Google Rank Tracking £9.99/month (max 5 keywords) — **not sold until operational** |
| Domain purchase | Customer search/select only; **admin purchases/renews manually** |
| Domain auto-buy / auto-renew | **Forbidden** |

## What’s included in the core package

- Professional business website (template-based production).
- Domain registration if needed (after payment; admin-executed).
- Standard domain renewals while the subscription remains eligible and active.
- Website hosting and maintenance.
- One custom business email mailbox (MXroute).
- One Google Business Profile post per week (manual VA).
- Google Business Profile review replies (manual VA).
- Customer dashboard and support.

## Ownership model (confirmed direction; legal review required)

| Asset | Ownership / rights |
| --- | --- |
| Registered domain | Customer ownership rights; registrant details use **customer/business registrant data wherever the registrar supports it**. Company may hold registrar-account control for management until transfer. Transfer rights on cancel must be disclosed. |
| Original business content, logos, uploaded media | Customer |
| Website hosting and ongoing management | Subscription service |
| Proprietary templates and reusable source code | Company intellectual property (licence while subscribed) |
| Full website / source-code transfer | **OPEN — business approval + legal review** (may be a separate disclosed offer) |

## Cancellation principles

- Show effective cancellation date (`current_period_end`).
- Continue paid services until period end.
- Stop future renewals.
- Stop GBP management after service expiry.
- Stop rank-tracking jobs after add-on expiry.
- Explain domain renewal/transfer, email migration, and hosting options.
- **Never** auto-delete domains, mailboxes, websites, or uploads on cancel.
- Apply documented retention and offboarding.
- **Early cancel before website completion:** see [CUSTOMER_JOURNEY.md](./CUSTOMER_JOURNEY.md) — pause production, no further build work after period end, refunds only per legal policy (default: no automatic refund of paid period).

## Platform goals

- Cloudflare-native, predictable costs, measurable paid API usage.
- Multi-tenant isolation (organisation-scoped data).
- Scale to hundreds/thousands of customers with reusable templates (not bespoke codebases).
- Separate development, staging, and production environments.
- Cursor + GitHub delivery; no n8n.

## Document map

| Document | Topic |
| --- | --- |
| [SYSTEM_ARCHITECTURE.md](./SYSTEM_ARCHITECTURE.md) | Components and data flows |
| [TECH_STACK.md](./TECH_STACK.md) | Framework comparison and stack lock |
| [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md) | D1 / Drizzle schema |
| [CUSTOMER_JOURNEY.md](./CUSTOMER_JOURNEY.md) | Sales → cancel journeys |
| [ONBOARDING_FLOW.md](./ONBOARDING_FLOW.md) | Guided onboarding |
| [DOMAIN_MANAGEMENT.md](./DOMAIN_MANAGEMENT.md) | Search + manual purchase |
| [EMAIL_MANAGEMENT.md](./EMAIL_MANAGEMENT.md) | MXroute |
| [WEBSITE_PROVISIONING.md](./WEBSITE_PROVISIONING.md) | Templates and deploy |
| [GOOGLE_BUSINESS_MANAGEMENT.md](./GOOGLE_BUSINESS_MANAGEMENT.md) | Manual GBP + tasks |
| [RANK_TRACKING.md](./RANK_TRACKING.md) | DataForSEO (gated) |
| [STRIPE_BILLING.md](./STRIPE_BILLING.md) | Billing and entitlements |
| [CUSTOMER_DASHBOARD.md](./CUSTOMER_DASHBOARD.md) | Customer UI |
| [ADMIN_DASHBOARD.md](./ADMIN_DASHBOARD.md) | Admin / VA UI |
| [SECURITY_AND_COMPLIANCE.md](./SECURITY_AND_COMPLIANCE.md) | Security / GDPR |
| [AUTOMATION_WORKFLOWS.md](./AUTOMATION_WORKFLOWS.md) | Queues / Cron / Workflows |
| [IMPLEMENTATION_ROADMAP.md](./IMPLEMENTATION_ROADMAP.md) | Phased delivery |
| [TESTING_STRATEGY.md](./TESTING_STRATEGY.md) | Test approach |
| [OPEN_QUESTIONS.md](./OPEN_QUESTIONS.md) | Unresolved decisions |

## Out of scope for planning implementation

This `/docs` set is planning only. Application code, package installs, infrastructure provisioning, and deploys require explicit approval after document review.
