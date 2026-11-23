import {
  createDb,
  eq,
  organisationMailboxes,
  organisations,
} from "@iwfw/db";
import { newId } from "./ids";
import {
  isMailboxSecurity,
  isMailboxStatus,
  type MailboxSecurity,
  type MailboxStatus,
  type OrganisationMailbox,
} from "./mailbox";
import { notifyCustomerNeedsAttention } from "./notifications.server";

type Db = ReturnType<typeof createDb>;

function mapMailbox(
  row: typeof organisationMailboxes.$inferSelect,
): OrganisationMailbox {
  return {
    id: row.id,
    organisationId: row.organisationId,
    emailAddress: row.emailAddress,
    username: row.username,
    webmailUrl: row.webmailUrl,
    imapHost: row.imapHost,
    imapPort: row.imapPort ?? null,
    imapSecurity: (row.imapSecurity as MailboxSecurity | null) ?? null,
    smtpHost: row.smtpHost,
    smtpPort: row.smtpPort ?? null,
    smtpSecurity: (row.smtpSecurity as MailboxSecurity | null) ?? null,
    popHost: row.popHost,
    popPort: row.popPort ?? null,
    popSecurity: (row.popSecurity as MailboxSecurity | null) ?? null,
    status: row.status as MailboxStatus,
    customerNotes: row.customerNotes,
    adminNotes: row.adminNotes,
    provisionedAt: row.provisionedAt
      ? row.provisionedAt.toISOString()
      : null,
    updatedAt: row.updatedAt ? row.updatedAt.toISOString() : null,
  };
}

export async function getOrganisationMailbox(
  db: Db,
  organisationId: string,
): Promise<OrganisationMailbox | null> {
  const row = await db
    .select()
    .from(organisationMailboxes)
    .where(eq(organisationMailboxes.organisationId, organisationId))
    .get();
  return row ? mapMailbox(row) : null;
}

function optionalPort(value: FormDataEntryValue | null): number | null {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : null;
}

function optionalText(value: FormDataEntryValue | null): string | null {
  const raw = String(value ?? "").trim();
  return raw || null;
}

export async function upsertOrganisationMailbox(
  db: Db,
  organisationId: string,
  form: FormData,
) {
  const org = await db
    .select()
    .from(organisations)
    .where(eq(organisations.id, organisationId))
    .get();
  if (!org) return { error: "Client not found." };

  const emailAddress = String(form.get("emailAddress") ?? "")
    .trim()
    .toLowerCase();
  if (!emailAddress || !emailAddress.includes("@")) {
    return { error: "Enter a valid mailbox email address." };
  }

  const statusRaw = String(form.get("status") ?? "active");
  const status: MailboxStatus = isMailboxStatus(statusRaw)
    ? statusRaw
    : "active";

  const imapSecurityRaw = String(form.get("imapSecurity") ?? "ssl");
  const smtpSecurityRaw = String(form.get("smtpSecurity") ?? "ssl");
  const popSecurityRaw = String(form.get("popSecurity") ?? "ssl");

  const now = new Date();
  const payload = {
    emailAddress,
    username: optionalText(form.get("username")) ?? emailAddress,
    webmailUrl: optionalText(form.get("webmailUrl")),
    imapHost: optionalText(form.get("imapHost")),
    imapPort: optionalPort(form.get("imapPort")) ?? 993,
    imapSecurity: isMailboxSecurity(imapSecurityRaw)
      ? imapSecurityRaw
      : ("ssl" as const),
    smtpHost: optionalText(form.get("smtpHost")),
    smtpPort: optionalPort(form.get("smtpPort")) ?? 465,
    smtpSecurity: isMailboxSecurity(smtpSecurityRaw)
      ? smtpSecurityRaw
      : ("ssl" as const),
    popHost: optionalText(form.get("popHost")),
    popPort: optionalPort(form.get("popPort")) ?? 995,
    popSecurity: isMailboxSecurity(popSecurityRaw)
      ? popSecurityRaw
      : ("ssl" as const),
    status,
    customerNotes: optionalText(form.get("customerNotes")),
    adminNotes: optionalText(form.get("adminNotes")),
    updatedAt: now,
    provisionedAt: status === "active" ? now : null,
  };

  const existing = await db
    .select()
    .from(organisationMailboxes)
    .where(eq(organisationMailboxes.organisationId, organisationId))
    .get();

  const wasActive = existing?.status === "active";

  if (existing) {
    await db
      .update(organisationMailboxes)
      .set({
        ...payload,
        provisionedAt:
          status === "active"
            ? (existing.provisionedAt ?? now)
            : existing.provisionedAt,
      })
      .where(eq(organisationMailboxes.id, existing.id));
  } else {
    await db.insert(organisationMailboxes).values({
      id: newId("mbox"),
      organisationId,
      ...payload,
      createdAt: now,
    });
  }

  const notifyCustomer = form.get("notifyCustomer") === "on";
  if (notifyCustomer || (status === "active" && !wasActive)) {
    await notifyCustomerNeedsAttention(db, {
      organisationId,
      title:
        status === "active"
          ? "Your business email is ready"
          : "Business email details updated",
      body:
        status === "active"
          ? `${emailAddress} is set up. Open Email in your dashboard for webmail and phone/computer setup details.`
          : `We’ve updated mailbox details for ${emailAddress}. Check the Email page in your dashboard.`,
      href: "/dashboard/email",
    });
  }

  return { ok: true as const };
}
