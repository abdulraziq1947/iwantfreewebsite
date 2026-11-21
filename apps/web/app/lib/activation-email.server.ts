import { generateRandomString } from "@iwfw/auth";
import {
  DEFAULT_RESEND_FROM_EMAIL,
  type WorkerEnvConfig,
} from "@iwfw/config";
import {
  accountActivationTokens,
  and,
  createDb,
  desc,
  eq,
  isNull,
  pendingOrders,
  user,
} from "@iwfw/db";
import { newId } from "./ids";
import { log } from "./logger";

type Db = ReturnType<typeof createDb>;

export const ACTIVATION_TOKEN_TTL_MS = 1000 * 60 * 60 * 48;
/** Minimum time between activation email sends for the same user. */
export const ACTIVATION_EMAIL_RATE_LIMIT_MS = 1000 * 60 * 15;

async function sha256Hex(value: string): Promise<string> {
  const data = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(digest)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function buildActivationUrl(appUrl: string, rawToken: string): string {
  const base = appUrl.replace(/\/$/, "");
  return `${base}/get-started/activate?token=${encodeURIComponent(rawToken)}`;
}

export function renderActivationEmail(options: {
  tradingName: string | null;
  activationUrl: string;
  supportEmail?: string;
}): { subject: string; html: string; text: string } {
  const name = options.tradingName?.trim() || "there";
  const support = options.supportEmail || "support@iwantfreewebsite.com";
  const subject = "Activate your iwantfreewebsite.com account";

  const text = [
    `Hi ${name},`,
    "",
    "Thanks for your payment — your website order has been received and your customer dashboard is ready.",
    "",
    "Activate your account (link expires in 48 hours):",
    options.activationUrl,
    "",
    "This link is single-use. After you set a password you can sign in at any time.",
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
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background:#f4f7f5;font-family:Georgia,'Times New Roman',serif;color:#14201a;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f7f5;padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border:1px solid #d7e3db;border-radius:12px;overflow:hidden;">
          <tr>
            <td style="background:#0f3d2e;padding:20px 28px;">
              <p style="margin:0;font-size:13px;letter-spacing:0.08em;text-transform:uppercase;color:#b7d4c6;">iwantfreewebsite.com</p>
              <h1 style="margin:8px 0 0;font-size:24px;line-height:1.25;color:#ffffff;font-weight:normal;">Your dashboard is ready</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:28px;">
              <p style="margin:0 0 16px;font-size:16px;line-height:1.5;">Hi ${escapeHtml(name)},</p>
              <p style="margin:0 0 16px;font-size:16px;line-height:1.5;">
                Thanks for your payment — your website order has been received and your customer dashboard is ready to use.
              </p>
              <p style="margin:0 0 24px;font-size:16px;line-height:1.5;">
                Use the secure button below to choose a password and activate your account. The link expires in 48 hours and can only be used once.
              </p>
              <p style="margin:0 0 28px;text-align:center;">
                <a href="${escapeHtml(options.activationUrl)}" style="display:inline-block;background:#1f7a54;color:#ffffff;text-decoration:none;padding:14px 22px;border-radius:8px;font-size:16px;">
                  Activate your account
                </a>
              </p>
              <p style="margin:0 0 12px;font-size:13px;line-height:1.5;color:#4d6358;">
                If the button does not work, copy and paste this link into your browser:
              </p>
              <p style="margin:0 0 24px;font-size:12px;line-height:1.5;word-break:break-all;color:#4d6358;">
                ${escapeHtml(options.activationUrl)}
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

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export type ResendSendResult =
  | { ok: true; id: string }
  | { ok: false; error: string; status?: number };

/**
 * Send via Resend HTTP API. Never logs the API key or activation URL/token.
 */
export async function sendResendEmail(options: {
  apiKey: string;
  from: string;
  to: string;
  subject: string;
  html: string;
  text: string;
  idempotencyKey: string;
  fetchImpl?: typeof fetch;
}): Promise<ResendSendResult> {
  const fetchFn = options.fetchImpl ?? fetch;
  try {
    const response = await fetchFn("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${options.apiKey}`,
        "Content-Type": "application/json",
        "Idempotency-Key": options.idempotencyKey,
      },
      body: JSON.stringify({
        from: options.from,
        to: [options.to],
        subject: options.subject,
        html: options.html,
        text: options.text,
      }),
    });

    if (!response.ok) {
      const bodyText = await response.text().catch(() => "");
      log("warn", "resend_email_failed", {
        status: response.status,
        // Never include Authorization or message bodies that may echo tokens.
        bodySnippet: bodyText.slice(0, 180).replace(/re_[A-Za-z0-9_]+/g, "re_[REDACTED]"),
      });
      return {
        ok: false,
        error: `Resend HTTP ${response.status}`,
        status: response.status,
      };
    }

    const payload = (await response.json().catch(() => ({}))) as {
      id?: string;
    };
    return { ok: true, id: payload.id || "unknown" };
  } catch (error) {
    log("warn", "resend_email_network_error", {
      error: error instanceof Error ? error.message : "unknown",
    });
    return { ok: false, error: "network_error" };
  }
}

export async function deliverActivationEmail(options: {
  db: Db;
  config: WorkerEnvConfig;
  toEmail: string;
  tradingName: string | null;
  rawToken: string;
  tokenId: string;
  /** When true, skip if email_sent_at is already set (webhook retry safety). */
  skipIfAlreadySent?: boolean;
  fetchImpl?: typeof fetch;
}): Promise<
  | { ok: true; skipped?: boolean; resendId?: string }
  | { ok: false; error: string }
> {
  if (!options.config.RESEND_API_KEY) {
    log("warn", "activation_email_skipped_no_resend_key", {
      tokenId: options.tokenId,
    });
    return { ok: false, error: "RESEND_API_KEY is not configured." };
  }

  const row = await options.db
    .select()
    .from(accountActivationTokens)
    .where(eq(accountActivationTokens.id, options.tokenId))
    .get();
  if (!row) return { ok: false, error: "Activation token not found." };

  if (options.skipIfAlreadySent && row.emailSentAt) {
    return { ok: true, skipped: true };
  }

  const now = new Date();
  await options.db
    .update(accountActivationTokens)
    .set({
      lastEmailAttemptAt: now,
      emailSendCount: (row.emailSendCount ?? 0) + 1,
    })
    .where(eq(accountActivationTokens.id, options.tokenId));

  const activationUrl = buildActivationUrl(
    options.config.APP_URL,
    options.rawToken,
  );
  const content = renderActivationEmail({
    tradingName: options.tradingName,
    activationUrl,
  });
  const from =
    options.config.RESEND_FROM_EMAIL || DEFAULT_RESEND_FROM_EMAIL;

  const result = await sendResendEmail({
    apiKey: options.config.RESEND_API_KEY,
    from,
    to: options.toEmail,
    subject: content.subject,
    html: content.html,
    text: content.text,
    idempotencyKey: `activation-email:${options.tokenId}`,
    fetchImpl: options.fetchImpl,
  });

  if (!result.ok) {
    return { ok: false, error: result.error };
  }

  await options.db
    .update(accountActivationTokens)
    .set({ emailSentAt: new Date() })
    .where(eq(accountActivationTokens.id, options.tokenId));

  log("info", "activation_email_sent", {
    tokenId: options.tokenId,
    resendId: result.id,
  });
  return { ok: true, resendId: result.id };
}

/**
 * Rate-limited resend: mints a new single-use token after verified payment,
 * revokes prior unused tokens, and sends a fresh activation email.
 * Never returns the raw token to callers.
 */
export async function requestActivationEmailResend(options: {
  db: Db;
  config: WorkerEnvConfig;
  email: string;
  fetchImpl?: typeof fetch;
  nowMs?: number;
}): Promise<
  | { ok: true; message: string }
  | { ok: false; error: string; status: number }
> {
  const email = options.email.trim().toLowerCase();
  if (!email || !email.includes("@")) {
    return { ok: false, error: "Enter a valid email address.", status: 400 };
  }
  if (!options.config.RESEND_API_KEY) {
    return {
      ok: false,
      error: "Email delivery is temporarily unavailable. Please try again later.",
      status: 503,
    };
  }

  const existingUser = await options.db
    .select()
    .from(user)
    .where(eq(user.email, email))
    .get();
  if (!existingUser) {
    // Avoid account enumeration — same response as success path.
    return {
      ok: true,
      message:
        "If that email has a paid order awaiting activation, we sent a new link.",
    };
  }

  const paidOrder = await options.db
    .select()
    .from(pendingOrders)
    .where(
      and(
        eq(pendingOrders.userId, existingUser.id),
        eq(pendingOrders.status, "paid"),
      ),
    )
    .orderBy(desc(pendingOrders.paidAt))
    .get();

  if (!paidOrder) {
    return {
      ok: true,
      message:
        "If that email has a paid order awaiting activation, we sent a new link.",
    };
  }

  const latestToken = await options.db
    .select()
    .from(accountActivationTokens)
    .where(eq(accountActivationTokens.userId, existingUser.id))
    .orderBy(desc(accountActivationTokens.createdAt))
    .get();

  if (latestToken?.usedAt) {
    return {
      ok: true,
      message:
        "If that email has a paid order awaiting activation, we sent a new link.",
    };
  }

  const nowMs = options.nowMs ?? Date.now();
  if (
    latestToken?.lastEmailAttemptAt &&
    nowMs - latestToken.lastEmailAttemptAt.getTime() <
      ACTIVATION_EMAIL_RATE_LIMIT_MS
  ) {
    return {
      ok: false,
      error:
        "Please wait a few minutes before requesting another activation email.",
      status: 429,
    };
  }

  // Revoke unused prior tokens, then mint a fresh one (raw token never logged).
  const unused = await options.db
    .select()
    .from(accountActivationTokens)
    .where(
      and(
        eq(accountActivationTokens.userId, existingUser.id),
        isNull(accountActivationTokens.usedAt),
      ),
    )
    .all();
  const now = new Date(nowMs);
  for (const row of unused) {
    await options.db
      .update(accountActivationTokens)
      .set({ usedAt: now })
      .where(eq(accountActivationTokens.id, row.id));
  }

  const orgId = paidOrder.organisationId || latestToken?.organisationId;
  if (!orgId) {
    return {
      ok: false,
      error: "Unable to resend activation email right now.",
      status: 500,
    };
  }

  const rawToken = generateRandomString(48);
  const tokenHash = await sha256Hex(rawToken);
  const tokenId = newId("act");
  await options.db.insert(accountActivationTokens).values({
    id: tokenId,
    userId: existingUser.id,
    organisationId: orgId,
    pendingOrderId: paidOrder.id,
    tokenHash,
    expiresAt: new Date(nowMs + ACTIVATION_TOKEN_TTL_MS),
    emailSendCount: 0,
  });

  log("info", "account_activation_token_reissued", {
    userId: existingUser.id,
    tokenId,
  });

  const delivered = await deliverActivationEmail({
    db: options.db,
    config: options.config,
    toEmail: email,
    tradingName: paidOrder.tradingName,
    rawToken,
    tokenId,
    fetchImpl: options.fetchImpl,
  });

  if (!delivered.ok) {
    // Paid order retained; caller can retry after rate limit window.
    return {
      ok: false,
      error:
        "We could not send the email just now. Please try again in a few minutes.",
      status: 502,
    };
  }

  return {
    ok: true,
    message:
      "If that email has a paid order awaiting activation, we sent a new link.",
  };
}
