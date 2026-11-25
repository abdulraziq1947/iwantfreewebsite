import {
  DEFAULT_RESEND_FROM_EMAIL,
  type WorkerEnvConfig,
} from "@iwfw/config";
import {
  createDb,
  customerUploads,
  eq,
  pendingOrders,
  uploadSessions,
} from "@iwfw/db";
import { writeAuditLog } from "./audit-log.server";
import { sendResendEmail } from "./activation-email.server";
import { LEGAL_SUPPORT_EMAIL } from "./legal";
import { log } from "./logger";
import {
  isUnpaidFunnelStatus,
  ORDER_TTL_MS,
  revivedUnpaidOrderStatus,
} from "./pending-order.server";
import { getCustomerUploadsBucket } from "./uploads.server";

type Db = ReturnType<typeof createDb>;

export {
  isUnpaidFunnelStatus,
  UNPAID_FUNNEL_STATUSES,
} from "./pending-order.server";

/** Minimum time between reminder emails for the same order. */
export const ORDER_REMINDER_RATE_LIMIT_MS = 1000 * 60 * 60;

export function isOrderReminderRateLimited(
  reminderSentAt: Date | null | undefined,
  nowMs = Date.now(),
): boolean {
  if (!reminderSentAt) return false;
  return nowMs - reminderSentAt.getTime() < ORDER_REMINDER_RATE_LIMIT_MS;
}

export function canDeletePendingOrder(order: {
  status: string;
  organisationId: string | null;
}): { ok: true } | { ok: false; error: string } {
  if (order.status === "paid") {
    return {
      ok: false,
      error:
        "Paid orders cannot be deleted here. Delete the client record instead if you need to remove the account.",
    };
  }
  if (order.organisationId) {
    return {
      ok: false,
      error:
        "This order is linked to a client. Delete the client if you need to remove it.",
    };
  }
  if (!isUnpaidFunnelStatus(order.status)) {
    return { ok: false, error: "This order cannot be deleted." };
  }
  return { ok: true };
}

export function canRemindPendingOrder(order: {
  status: string;
  organisationId: string | null;
  email: string | null;
}): { ok: true } | { ok: false; error: string } {
  const deletable = canDeletePendingOrder(order);
  if (!deletable.ok) {
    if (order.status === "paid") {
      return {
        ok: false,
        error: "This order is already paid. Use the activation email if they still need to log in.",
      };
    }
    return deletable;
  }
  if (!order.email?.includes("@")) {
    return {
      ok: false,
      error: "This order has no email address yet, so a reminder cannot be sent.",
    };
  }
  return { ok: true };
}

export function buildOrderResumeUrl(
  appUrl: string,
  resumeToken: string,
): string {
  const base = appUrl.replace(/\/$/, "");
  return `${base}/get-started/resume?token=${encodeURIComponent(resumeToken)}`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function renderOrderReminderEmail(options: {
  fullName: string | null;
  tradingName: string | null;
  resumeUrl: string;
  supportEmail?: string;
}): { subject: string; html: string; text: string } {
  const name = options.fullName?.trim() || "there";
  const business = options.tradingName?.trim();
  const support = options.supportEmail || LEGAL_SUPPORT_EMAIL;
  const subject = "Finish your website order — iwantfreewebsite.com";
  const about = business
    ? `your ${business} website`
    : "your managed website";

  const text = [
    `Hi ${name},`,
    "",
    `You started an order for ${about} with iwantfreewebsite.com, but checkout is not complete yet.`,
    "",
    "Your details are saved. Continue where you left off (this link opens your saved order):",
    options.resumeUrl,
    "",
    "If you no longer want a website, you can ignore this email.",
    "",
    `Need help? ${support}`,
    "",
    "— iwantfreewebsite.com",
  ].join("\n");

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0;padding:0;background:#f4f7f5;font-family:Georgia,'Times New Roman',serif;color:#14201a;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f7f5;padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border:1px solid #d7e3db;border-radius:12px;overflow:hidden;">
          <tr>
            <td style="background:#0f3d2e;padding:20px 28px;">
              <p style="margin:0;font-size:13px;letter-spacing:0.08em;text-transform:uppercase;color:#b7d4c6;">iwantfreewebsite.com</p>
              <h1 style="margin:8px 0 0;font-size:24px;line-height:1.25;color:#ffffff;font-weight:normal;">Your order is still open</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:28px;">
              <p style="margin:0 0 16px;font-size:16px;line-height:1.5;">Hi ${escapeHtml(name)},</p>
              <p style="margin:0 0 16px;font-size:16px;line-height:1.5;">
                You started an order for ${escapeHtml(about)} but have not finished payment yet. Your details are saved.
              </p>
              <p style="margin:0 0 24px;font-size:16px;line-height:1.5;">
                Use the button below to continue where you left off and complete checkout when you are ready.
              </p>
              <p style="margin:0 0 28px;text-align:center;">
                <a href="${escapeHtml(options.resumeUrl)}" style="display:inline-block;background:#1f7a54;color:#ffffff;text-decoration:none;padding:14px 22px;border-radius:8px;font-size:16px;">
                  Continue your order
                </a>
              </p>
              <p style="margin:0 0 12px;font-size:13px;line-height:1.5;color:#4d6358;">
                If the button does not work, copy and paste this link into your browser:
              </p>
              <p style="margin:0 0 24px;font-size:12px;line-height:1.5;word-break:break-all;color:#4d6358;">
                ${escapeHtml(options.resumeUrl)}
              </p>
              <p style="margin:0 0 12px;font-size:14px;line-height:1.5;color:#4d6358;">
                If you no longer want a website, you can ignore this email.
              </p>
              <p style="margin:0;font-size:14px;line-height:1.5;color:#4d6358;">
                Need help? <a href="mailto:${escapeHtml(support)}" style="color:#1f7a54;">${escapeHtml(support)}</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return { subject, html, text };
}

export async function deleteUnpaidPendingOrder(options: {
  db: Db;
  env: Env;
  actorUserId: string;
  orderId: string;
  ip?: string | null;
}): Promise<{ ok: true; label: string } | { ok: false; error: string }> {
  const order = await options.db
    .select()
    .from(pendingOrders)
    .where(eq(pendingOrders.id, options.orderId))
    .get();
  if (!order) return { ok: false, error: "Order not found." };

  const allowed = canDeletePendingOrder(order);
  if (!allowed.ok) return allowed;

  const uploads = await options.db
    .select()
    .from(customerUploads)
    .where(eq(customerUploads.pendingOrderId, order.id))
    .all();

  await writeAuditLog(options.db, {
    actorUserId: options.actorUserId,
    organisationId: null,
    action: "order.deleted",
    entityType: "pending_orders",
    entityId: order.id,
    diff: {
      status: order.status,
      email: order.email,
      tradingName: order.tradingName,
      uploadCount: uploads.length,
    },
    ip: options.ip,
  });

  const bucket = getCustomerUploadsBucket(options.env);
  if (bucket) {
    for (const upload of uploads) {
      try {
        await bucket.delete(upload.r2Key);
      } catch (error) {
        log("warn", "order_delete_r2_failed", {
          orderId: order.id,
          uploadId: upload.id,
          error: error instanceof Error ? error.message : "unknown",
        });
      }
    }
  }

  if (uploads.length > 0) {
    await options.db
      .delete(customerUploads)
      .where(eq(customerUploads.pendingOrderId, order.id));
  }
  await options.db
    .delete(uploadSessions)
    .where(eq(uploadSessions.pendingOrderId, order.id));
  await options.db
    .delete(pendingOrders)
    .where(eq(pendingOrders.id, order.id));

  log("info", "unpaid_order_deleted", {
    orderId: order.id,
    actorUserId: options.actorUserId,
  });

  const label = order.tradingName || order.email || order.id;
  return { ok: true, label };
}

export async function sendPendingOrderReminder(options: {
  db: Db;
  config: WorkerEnvConfig;
  actorUserId: string;
  orderId: string;
  ip?: string | null;
  fetchImpl?: typeof fetch;
  nowMs?: number;
}): Promise<{ ok: true; message: string } | { ok: false; error: string }> {
  if (!options.config.RESEND_API_KEY) {
    return {
      ok: false,
      error: "Email delivery is not configured (RESEND_API_KEY).",
    };
  }

  const order = await options.db
    .select()
    .from(pendingOrders)
    .where(eq(pendingOrders.id, options.orderId))
    .get();
  if (!order) return { ok: false, error: "Order not found." };

  const allowed = canRemindPendingOrder(order);
  if (!allowed.ok) return allowed;

  const nowMs = options.nowMs ?? Date.now();
  if (isOrderReminderRateLimited(order.reminderSentAt, nowMs)) {
    return {
      ok: false,
      error: "A reminder was sent recently. Wait an hour before sending another.",
    };
  }

  const nextExpiry = new Date(nowMs + ORDER_TTL_MS);
  const nextStatus = revivedUnpaidOrderStatus(order);
  const resumeUrl = buildOrderResumeUrl(
    options.config.APP_URL,
    order.resumeToken,
  );
  const content = renderOrderReminderEmail({
    fullName: order.fullName,
    tradingName: order.tradingName,
    resumeUrl,
  });
  const from =
    options.config.RESEND_FROM_EMAIL || DEFAULT_RESEND_FROM_EMAIL;

  const result = await sendResendEmail({
    apiKey: options.config.RESEND_API_KEY,
    from,
    to: order.email as string,
    subject: content.subject,
    html: content.html,
    text: content.text,
    idempotencyKey: `order-reminder:${order.id}:${nowMs}`,
    fetchImpl: options.fetchImpl,
  });

  if (!result.ok) {
    return {
      ok: false,
      error: "The reminder email could not be sent. Try again in a few minutes.",
    };
  }

  await options.db
    .update(pendingOrders)
    .set({
      status: nextStatus,
      expiresAt: nextExpiry,
      reminderSentAt: new Date(nowMs),
      reminderSendCount: (order.reminderSendCount ?? 0) + 1,
      updatedAt: new Date(nowMs),
    })
    .where(eq(pendingOrders.id, order.id));

  await writeAuditLog(options.db, {
    actorUserId: options.actorUserId,
    organisationId: null,
    action: "order.reminder_sent",
    entityType: "pending_orders",
    entityId: order.id,
    diff: {
      to: order.email,
      previousStatus: order.status,
      status: nextStatus,
    },
    ip: options.ip,
  });

  log("info", "order_reminder_sent", {
    orderId: order.id,
    actorUserId: options.actorUserId,
    resendId: result.id,
  });

  return {
    ok: true,
    message: `Reminder sent to ${order.email}.`,
  };
}
