# Open Questions

Separated from **confirmed** decisions. Do not block Phase 0 docs; resolve before the relevant implementation phase.

## Confirmed (do not re-open without explicit change)

- £39.99/month; no minimum contract; cancel anytime; no early-cancellation penalties.
- Cancel effective at end of paid period; no automatic partial refunds (subject to law).
- Stripe must prevent further renewals after period end (`cancel_at_period_end`).
- Customer retains website/domain ownership (subject to Terms); **manual** transfer only — no automated transfer system.
- On cancel scheduled: create internal asset transfer task; admin notify; dashboard status Pending → In progress → Completed; notify customer on completion; record completion date.
- Do **not** auto-delete websites, domains, email or files on subscription end; preserve until manual transfer completes.
- Do not promise an exact transfer timeframe until an operational SLA is published.
- £0 upfront website design fee; advertised price inclusive of VAT where applicable (confirm tax treatment before live billing).
- Funnel: package → account → pay → full dashboard onboarding (`/get-started`).
- Transactional email: **Resend** (including verification).
- Optional £9.99 rank tracking; gated until operational.
- Domain search/select by customer; **manual** admin purchase & renewal only.
- No automated registrar purchasing/registration/renewal.
- Customer registrant details used wherever registrar supports them.
- React Router v8 locked over vinext for greenfield Workers app.
- MVP hosting: simpler Workers architecture; Cloudflare for SaaS deferred.
- MXroute for customer mailboxes; manual GBP; DataForSEO for tracking; no n8n.
- R2 uploads deferred until approved.
- No production D1/billing deploy without approval.

See also [CANCELLATION_AND_TRANSFER.md](./CANCELLATION_AND_TRANSFER.md) and [STRIPE_TEST_SETUP.md](./STRIPE_TEST_SETUP.md).

---

## Business & legal (require approval)

| ID | Question | Needed by |
| --- | --- | --- |
| L1 | Operational **transfer SLA** timeframe (policy confirmed; exact days TBD) | Before promising dates in UI |
| L2 | Final legal polish of draft Terms/Privacy (ownership + manual transfer already drafted) | Before production Checkout |
| L3 | UK **consumer vs B2B** contracting; cooling-off / statutory refund handling | Before production Checkout |
| L4 | Post-cancel **data retention** duration (default proposal 90 days) and deletion process | Phase 8 |
| L5 | Advertising review of brand name vs paid offer (ASA/transparency) | Before major ads |
| L6 | Designated Google account email for GBP Manager invites | Phase 6 |
| L7 | Whether goodwill refunds are ever offered for cancel-before-complete | Phase 2–5 ops |

## Product

| ID | Question | Needed by |
| --- | --- | --- |
| P1 | Early-cancel-during-build: stop creative work immediately vs finish current draft? (Plan default: stop new creative work on cancel request) | Phase 5 |
| P2 | Stripe Customer Portal vs fully in-app billing for card updates | Phase 2 |
| P3 | Preview hostname scheme (`*.preview.iwantfreewebsite.com` vs path-based) | Phase 5 |
| P4 | Default Maps grid spacing confirmation (proposal 0.5 mile / 805 m) | Phase 7 |
| P5 | “Coming soon” marketing for rank tracking before flag enable? | Marketing |

## Technical / ops

| ID | Question | Needed by |
| --- | --- | --- |
| T1 | Registrar used for **manual purchase** UI (Cloudflare dashboard vs Namecheap vs other) | Phase 4 |
| T2 | Confirm Cloudflare Registrar **check** API supports `.com` and `.co.uk` on our account; else choose check-only provider | Phase 3–4 |
| T3 | ~~Transactional email provider~~ → **Resend** (confirmed). Remaining: API key + sending domain DNS | Stage C/D |
| T4 | Upload malware scanning approach | Phase 3 |
| T5 | When to introduce Cloudflare for SaaS (trigger metric: N external-DNS custom domains) | Post-MVP |
| T6 | Per-site Worker vs shared template Worker for customer sites | Phase 5 |
| T7 | MXroute upgrade threshold and reseller migration date | When storage >70% |

## Finance

| ID | Question | Needed by |
| --- | --- | --- |
| F1 | Domain COGS accounting when renewal > £15 exceptional case | Phase 4 |
| F2 | VAT display inclusive pricing confirmation for UK | Phase 2 |

---

## Explicitly deferred features

- Automated domain purchasing
- Google Business Profile API
- Rank-tracking Checkout before Phase 7 acceptance
- Minimum-term / ETF billing logic (removed)
