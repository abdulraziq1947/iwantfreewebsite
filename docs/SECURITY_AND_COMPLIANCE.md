# Security and Compliance

## Authentication & access

- Better Auth email/password (or magic link if later approved) with secure session cookies (`Secure`, `HttpOnly`, `SameSite`).
- **Staff MFA required** before admin routes.
- RBAC enforced in server loaders/actions — never client-only.
- Organisation isolation on every query.

## Application security

- Cloudflare Turnstile on signup, contact, public forms, Checkout start.
- Input validation with zod.
- Rate limiting (Workers + Cloudflare WAF/Rate Limiting rules).
- CSRF protections appropriate to cookie sessions.
- Security headers (CSP progressively tightened).
- No secrets in client bundles; Worker secrets for Stripe, MXroute, DataForSEO, registrar check token.

## Payments

- Server-side Price IDs only.
- Stripe webhook signature verification.
- Idempotent event processing.
- Disputes freeze provisioning.

## Files

- Private R2; org-prefixed keys.
- Signed URL short TTL; content-type allowlists; size limits.
- No public bucket listing.

## Domains

- No automated registrar purchase/renew from code paths (lint/review gate).
- Admin domain actions fully audited.
- Registrant PII encrypted at rest if feasible; minimize access.

## Data protection (UK GDPR)

- Privacy Policy, Cookie Policy, DPA with processors (Stripe, Cloudflare, MXroute, DataForSEO).
- Lawful basis: contract + legitimate interests as applicable — **solicitor review**.
- Data subject access / deletion workflows (admin tooling Phase 8).
- Retention schedules in [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md).
- International transfers: Cloudflare/processors SCCs as applicable.

## Consumer & advertising

- Transparent pricing; no misleading “free” claims for paid managed service.
- Cancel-anytime and ownership limitations clearly disclosed.
- Website transfer / source-code policies marked pending legal approval — do not overclaim.
- UK consumer vs B2B classification affects cooling-off — **legal review**.

## Backups & DR

- Daily D1 export to R2 (prod).
- R2 versioning optional for critical uploads.
- Document RPO/RTO targets; staging restore drill quarterly.
- Incident runbooks for webhook outage, MXroute outage, domain expiry miss.

## Logging

- Structured logs; Workers observability enabled.
- Audit logs for admin/domain/billing overrides.
- Avoid logging secrets or full card data (Stripe handles PAN).
