# Google Business Profile Management

## Important constraints

**We are NOT using the Google Business Profile API.**

All posting and review replies are **manual** via a designated company Google account invited as **Manager** (never Owner).

Do not claim the platform can automatically retrieve or verify Google reviews without an authorised integration.

**Customer confirmation is not verification.** If a customer clicks “I’ve sent the invitation”, the system records that claim only. Access is **Connected** only after a staff member manually accepts the invite in Google and marks verification in the admin UI. Never show “Connected” or “verified” solely because the customer clicked confirmation.

Design data model so a future Google API adapter can plug into the same `gbp_*` tables without a rebuild.

## Configurable Manager email

- Store the invite target as platform config / Worker secret, e.g. `GBP_MANAGER_EMAIL` (and optional display name).
- Surface this **exact address** in onboarding and the customer dashboard (copy-to-clipboard).
- Admins can update the configured email in settings (Platform Owner); historical invites keep a snapshot of the email shown at invitation time on `gbp_profiles.manager_email_shown`.

## Customer-facing access statuses

Map internal `gbp_profiles.access_status` to customer labels:

| Internal value | Customer label | Meaning |
| --- | --- | --- |
| `action_required` | **Action Required** | Customer must invite us, needs help, or has no profile yet |
| `invitation_sent` | **Invitation Sent** | Customer reported they sent the Manager invite — **awaiting staff acceptance** |
| `connected` | **Connected** | Staff manually accepted invite and verified Manager access |
| `help_requested` | **Action Required** (substate) | Customer chose “I need help” — support/VA follow-up |
| `no_profile` | **Action Required** (substate) | Customer has no GBP — assisted creation path |
| `blocked` | **Action Required** | Access lost or invite rejected — customer/staff action needed |

Default after payment / before GBP step complete: **Action Required**.

## Dedicated onboarding step (see also ONBOARDING_FLOW)

The Google Business Profile step is a first-class onboarding section with:

1. Display of the **configurable Manager email**.
2. Clear **step-by-step instructions** to invite that account as **Manager, not Owner**.
3. Primary action: **“I’ve sent the invitation”** → sets `invitation_sent` (not Connected).
4. Secondary: **“I need help”** → `help_requested` + support/admin notification.
5. Secondary: **“I don’t have a Google Business Profile”** → `no_profile` + assisted setup task.
6. Optional profile URL field when they have one.
7. Preferences for post/reply approvals (customer wants to approve drafts vs trust VA).

### Example invite instructions (customer copy)

Instruct customers along these lines (exact UI copy may be edited by marketing):

1. Open your Google Business Profile (business.google.com) while signed in as the profile owner.
2. Open **Users** / **Managers** (wording varies in Google’s UI).
3. Choose **Add users** / invite.
4. Enter exactly: `{GBP_MANAGER_EMAIL}` (shown on screen).
5. Set the role to **Manager** — **do not** select Owner.
6. Send the invitation.
7. Return here and tap **I’ve sent the invitation**.

Warn: inviting as Owner is incorrect; we will ask them to correct the role if needed.

## Invitation submitted → admin notification

When the customer selects **I’ve sent the invitation** (or completes the GBP step with that choice):

1. Persist `access_status = invitation_sent`, `invitation_claimed_at`, actor user id.
2. Create admin/VA task `gbp_accept_invite` (or mark existing profile task).
3. Send **admin notification** (email + in-app) to GBP Managers / Administrators: org name, profile URL if any, Manager email expected, timestamp.
4. Customer dashboard shows **Invitation Sent** with copy: “We’re confirming access. This is not complete until our team accepts the invite.”

## Manual acceptance and verification (staff only)

Staff workflow:

1. Sign into the company Google account.
2. Accept the pending Manager invitation in Google.
3. Confirm the profile is visible and role is Manager (not Owner).
4. In admin UI: **Mark access Connected** — requires note (optional screenshot evidence in R2).
5. System sets `access_status = connected`, `verified_at`, `verified_by_user_id`.
6. Audit log entry.

Until step 4–5, UI must not claim Connected/verified.

If invite never arrives or is wrong role: set `blocked` or return to `action_required` with customer instructions; notify customer.

## Weekly VA tasks

Cloudflare Cron (weekly), for each organisation with active `gbp` entitlement **and** `access_status = connected`:

1. Create task `gbp_post` (one post per customer per week) with due date.
2. Ensure review monitoring: VA creates or Cron placeholders `gbp_review_reply` tasks when new reviews are found **manually** (no unofficial scraping claims).

Do **not** generate weekly post tasks for Action Required / Invitation Sent orgs until Connected.

## Manual completion records

For each `gbp_post` and `gbp_review_reply` task, record:

| Field | Purpose |
| --- | --- |
| Draft content | VA draft |
| Approval status | Optional customer/admin approval workflow |
| Publishing status | draft / approved / published / skipped |
| Published at | Timestamp |
| Evidence | Public post URL and/or R2 screenshot |
| Assignee | VA user |
| Activity log | Comments, status changes, timestamps |

Customers see completed work and history labelled as **team-reported activity**, not API-verified Google data.

## Customer dashboard (GBP section)

- Status chip: Action Required | Invitation Sent | Connected
- Manager email + invite instructions (while not Connected)
- Buttons matching onboarding outcomes if still Action Required
- History: weekly posts and review replies with evidence links where available
- Never show a green “verified by Google” state from customer self-report alone

## Admin / VA dashboard

- Queue: pending invite acceptances (`invitation_sent`)
- Help / no-profile queues
- Task board: posts, review replies — assign, due dates, overdue
- Mark Connected / revoke Connected
- Activity logs and evidence gallery
- Overdue notifications (Cron)

## On entitlement end

After subscription period end: stop creating new GBP tasks; retain history; do not imply ongoing management; access_status may remain `connected` until offboarding playbook asks customer to remove Manager access.
