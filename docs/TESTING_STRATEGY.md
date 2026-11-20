# Testing Strategy

## Layers

| Layer | Purpose | Tools (planned) |
| --- | --- | --- |
| Unit | Pure functions: grid math, entitlement mapping, price allowlists | Vitest |
| Component | Design system + critical forms | Vitest + Testing Library |
| Integration | Loaders/actions with Miniflare / Workers test harness + local D1 | Vitest + Cloudflare test utils |
| Contract | Stripe webhook fixtures; DataForSEO/MXroute mocked clients | Fixtures |
| E2E | Staging smoke: signup → Checkout (test) → onboarding | Playwright |
| Manual ops | Domain purchase checklist, renewal escalation, GBP publish | Runbooks |

## Must-cover scenarios

### Billing

- Checkout uses allowlisted prices only.
- Webhook replay does not double-provision.
- Cancel at period end keeps entitlements until `current_period_end`.
- Rank add-on absent when flag false; present unchecked when true.
- Payment failure → past_due behaviour.

### Tenancy

- Customer A cannot read Customer B resources (IDOR tests).
- Staff role boundaries (Support cannot purchase domains without Admin).

### Domains

- Premium / over-ceiling rejected.
- Disclaimer acknowledgement required.
- Admin purchase blocked if unpaid or cancelled.
- Renewal tasks created at 60/30/14/7.
- **No code path calls registrar register/renew APIs** (static analysis or client interface without those methods in production adapter).

### Websites

- Cancel-before-complete sets status and stops deploy promotions.
- Form leads scoped to org.

### Rank tracking

- Max 5 keywords enforced.
- Budget kill switch stops further task_post.
- Organic vs maps series not mixed in assertions.

## Environments

- PR → CI unit/integration.
- Merge to main → staging deploy + smoke.
- Production deploy only from tagged release after staging sign-off.

## Acceptance evidence

Each phase DoD includes: automated tests green + short staging checklist completed + (for Phase 7) two weekly job cycles logged.
