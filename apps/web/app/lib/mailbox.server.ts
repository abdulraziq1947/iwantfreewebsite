import type { WorkerEnvConfig } from "@iwfw/config";
import {
  createDb,
  eq,
  organisationMailboxes,
  organisations,
} from "@iwfw/db";
import { newId } from "./ids";
import {
  decryptMailboxPassword,
  encryptMailboxPassword,
} from "./mailbox-crypto.server";
import {
  isMailboxSecurity,
  isMailboxStatus,
  type MailboxSecurity,
  type MailboxStatus,
  type OrganisationMailbox,
} from "./mailbox";
import { notifyCustomerNeedsAttention } from "./notifications.server";

type Db = ReturnType<typeof createDb>;

async function mapMailbox(
  config: WorkerEnvConfig,
  row: typeof organisationMailboxes.$inferSelect,
): Promise<OrganisationMailbox> {
  return {
    id: row.id,
    organisationId: row.organisationId,
    emailAddress: row.emailAddress,
    username: row.username,
    password: await decryptMailboxPassword(config, row.password),
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

function isMissingMailboxSchema(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error ?? "");
  return (
    (message.includes("organisation_mailboxes") ||
      message.includes("no such column: password")) &&
    (message.includes("no such table") ||
      message.includes("no such column") ||
      message.includes("SQLITE_ERROR"))
  );
}

export async function getOrganisationMailbox(
  db: Db,
  organisationId: string,
  config: WorkerEnvConfig,
): Promise<OrganisationMailbox | null> {
  try {
    const row = await db
      .select()
      .from(organisationMailboxes)
      .where(eq(organisationMailboxes.organisationId, organisationId))
      .get();
    return row ? mapMailbox(config, row) : null;
  } catch (error) {
    // Deploy-before-migrate must not take down the whole customer dashboard.
    if (isMissingMailboxSchema(error)) return null;
    throw error;
  }
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
  config: WorkerEnvConfig,
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

  const passwordFromForm = String(form.get("password") ?? "");
  const clearPassword = form.get("clearPassword") === "on";

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

  try {
    const existing = await db
      .select()
      .from(organisationMailboxes)
      .where(eq(organisationMailboxes.organisationId, organisationId))
      .get();

    const wasActive = existing?.status === "active";
    let password: string | null;
    if (clearPassword) {
      password = null;
    } else if (passwordFromForm.length > 0) {
      password = await encryptMailboxPassword(config, passwordFromForm);
    } else {
      password = existing?.password ?? null;
    }

    if (existing) {
      await db
        .update(organisationMailboxes)
        .set({
          ...payload,
          password,
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
        password,
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
  } catch (error) {
    if (isMissingMailboxSchema(error)) {
      return {
        error:
          "Mailbox storage isn’t ready yet. Apply the latest D1 mailbox migrations, then try again.",
      };
    }
    throw error;
  }
}
