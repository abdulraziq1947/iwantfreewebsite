# Google Business Profile Management

## Important constraint

**We are NOT using the Google Business Profile API.**

All posting and review replies are **manual** via a designated company Google account invited as **Manager**.

Do not claim the platform can automatically retrieve or verify Google reviews without an authorised integration.

Design data model so a future Google API adapter can plug into the same `gbp_*` tables without a rebuild.

## Onboarding

- Collect existing profile URL / whether profile exists.
- Show step-by-step invite instructions for the designated Manager account email (config/secret).
- Track `access_status`: `not_started` → `invite_sent` → `manager_access` → `blocked`.
- Access confirmation is **human-verified** by VA/admin (checkbox + timestamp + note). No fake automated verification.

## Weekly automation (Cloudflare Cron)

Every week, for each org with active `gbp` entitlement and `manager_access`:

1. Create task `gbp_post` with due date.
2. Optionally create/monitor `gbp_review_reply` tasks when VA flags new reviews (manual intake until API exists).

## Admin / VA dashboard capabilities

- Task assignment and due dates
- Draft content
- Approval workflow (optional second reviewer)
- Publishing status
- Published link or screenshot (R2)
- VA activity logs
- Overdue notifications (Cron)

## Customer visibility

Customers see completed posts and review reply activity **as recorded by staff** — labelled as team-reported, not API-verified.

## On entitlement end

After subscription period end: stop creating new GBP tasks; leave historical records; do not imply ongoing management.
