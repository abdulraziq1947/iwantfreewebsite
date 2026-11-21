# Pending order checkout (pre-payment questionnaire)

## Journey

Get Started → Website questionnaire → Domain selection → Review → Stripe Checkout (test) → Webhook fulfillment → Account activation → Dashboard.

No mandatory signup/login before payment.

## Storage

- `pending_orders` — questionnaire JSON, domain choice, Stripe session ids, resume cookie token
- `domain_registration_tasks` — manual team queue after payment (never auto-purchase)
- `account_activation_tokens` — one-time hashed tokens for password setup

## Domain lookup

Public RDAP:

- `.com` — Verisign RDAP
- `.co.uk` / `.uk` — Nominet RDAP

Optional future: Cloudflare Registrar **check-only** API (`DOMAIN_LOOKUP_PROVIDER=cloudflare`) — still must not call registration endpoints.

## Webhooks

`checkout.session.completed` with `metadata.pending_order_id` fulfills the order idempotently: org + user + onboarding copy + subscription sync + domain task + activation token.

Success redirect is never treated as payment proof.
