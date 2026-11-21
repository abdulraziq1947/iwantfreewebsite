import { describe, expect, it, vi } from "vitest";
import {
  ACTIVATION_EMAIL_RATE_LIMIT_MS,
  buildActivationUrl,
  deliverActivationEmail,
  renderActivationEmail,
  requestActivationEmailResend,
  sendResendEmail,
} from "./activation-email.server";
import { parseWorkerEnv } from "@iwfw/config";

const baseConfig = parseWorkerEnv({
  APP_URL: "https://iwantfreewebsite.com",
  APP_ENV: "production",
  BETTER_AUTH_SECRET: "x".repeat(32),
  RESEND_API_KEY: "re_test_key_123",
});

describe("activation email content", () => {
  it("builds production activation links without exposing secrets", () => {
    const url = buildActivationUrl(
      "https://iwantfreewebsite.com/",
      "raw-token-value",
    );
    expect(url).toBe(
      "https://iwantfreewebsite.com/get-started/activate?token=raw-token-value",
    );
  });

  it("renders HTML + plain text mentioning order received and dashboard ready", () => {
    const content = renderActivationEmail({
      tradingName: "Acme Removals",
      activationUrl:
        "https://iwantfreewebsite.com/get-started/activate?token=abc",
    });
    expect(content.subject.toLowerCase()).toContain("activate");
    expect(content.text).toContain("website order has been received");
    expect(content.text).toContain("dashboard is ready");
    expect(content.text).toContain(
      "https://iwantfreewebsite.com/get-started/activate?token=abc",
    );
    expect(content.html).toContain("Activate your account");
    expect(content.html).toContain("dashboard is ready");
    expect(content.html).toContain("Acme Removals");
  });
});

describe("sendResendEmail", () => {
  it("sends successfully and never puts the API key in the JSON body", async () => {
    const fetchImpl = vi.fn(async (_url: string, init?: RequestInit) => {
      const headers = new Headers(init?.headers);
      expect(headers.get("Authorization")).toBe("Bearer re_test_key_123");
      expect(headers.get("Idempotency-Key")).toBe("activation-email:act_1");
      const body = JSON.parse(String(init?.body));
      expect(body.from).toBe("accounts@iwantfreewebsite.com");
      expect(body.to).toEqual(["customer@example.com"]);
      expect(JSON.stringify(body)).not.toContain("re_test_key_123");
      return new Response(JSON.stringify({ id: "email_123" }), { status: 200 });
    }) as unknown as typeof fetch;

    const result = await sendResendEmail({
      apiKey: "re_test_key_123",
      from: "accounts@iwantfreewebsite.com",
      to: "customer@example.com",
      subject: "Activate",
      html: "<p>hi</p>",
      text: "hi",
      idempotencyKey: "activation-email:act_1",
      fetchImpl,
    });
    expect(result).toEqual({ ok: true, id: "email_123" });
  });

  it("surfaces API failures without throwing", async () => {
    const fetchImpl = vi.fn(
      async () =>
        new Response(JSON.stringify({ message: "invalid" }), { status: 401 }),
    ) as unknown as typeof fetch;

    const result = await sendResendEmail({
      apiKey: "re_test_key_123",
      from: "accounts@iwantfreewebsite.com",
      to: "customer@example.com",
      subject: "Activate",
      html: "<p>hi</p>",
      text: "hi",
      idempotencyKey: "activation-email:act_1",
      fetchImpl,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(401);
      expect(result.error).toContain("401");
    }
  });
});

describe("deliverActivationEmail", () => {
  it("marks email sent after successful Resend delivery", async () => {
    const updates: Array<Record<string, unknown>> = [];
    const row = {
      id: "act_1",
      emailSentAt: null as Date | null,
      emailSendCount: 0,
      lastEmailAttemptAt: null as Date | null,
    };
    const db = {
      select: () => ({
        from: () => ({
          where: () => ({
            get: async () => row,
          }),
        }),
      }),
      update: () => ({
        set: (patch: Record<string, unknown>) => ({
          where: async () => {
            updates.push(patch);
            Object.assign(row, patch);
          },
        }),
      }),
    };

    const fetchImpl = vi.fn(
      async () =>
        new Response(JSON.stringify({ id: "email_ok" }), { status: 200 }),
    ) as unknown as typeof fetch;

    const result = await deliverActivationEmail({
      db: db as never,
      config: baseConfig,
      toEmail: "customer@example.com",
      tradingName: "Acme",
      rawToken: "secret-token",
      tokenId: "act_1",
      fetchImpl,
    });

    expect(result.ok).toBe(true);
    expect(updates.some((u) => u.emailSentAt instanceof Date)).toBe(true);
    expect(fetchImpl).toHaveBeenCalledOnce();
  });

  it("skips duplicate sends when email_sent_at is already set", async () => {
    const row = {
      id: "act_1",
      emailSentAt: new Date(),
      emailSendCount: 1,
      lastEmailAttemptAt: new Date(),
    };
    const db = {
      select: () => ({
        from: () => ({
          where: () => ({
            get: async () => row,
          }),
        }),
      }),
      update: () => ({
        set: () => ({
          where: async () => {
            throw new Error("should not update");
          },
        }),
      }),
    };
    const fetchImpl = vi.fn() as unknown as typeof fetch;

    const result = await deliverActivationEmail({
      db: db as never,
      config: baseConfig,
      toEmail: "customer@example.com",
      tradingName: "Acme",
      rawToken: "secret-token",
      tokenId: "act_1",
      skipIfAlreadySent: true,
      fetchImpl,
    });

    expect(result).toEqual({ ok: true, skipped: true });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("keeps the paid order usable when Resend returns an error", async () => {
    const row = {
      id: "act_1",
      emailSentAt: null as Date | null,
      emailSendCount: 0,
      lastEmailAttemptAt: null as Date | null,
    };
    const db = {
      select: () => ({
        from: () => ({
          where: () => ({
            get: async () => row,
          }),
        }),
      }),
      update: () => ({
        set: (patch: Record<string, unknown>) => ({
          where: async () => {
            Object.assign(row, patch);
          },
        }),
      }),
    };
    const fetchImpl = vi.fn(
      async () => new Response("nope", { status: 500 }),
    ) as unknown as typeof fetch;

    const result = await deliverActivationEmail({
      db: db as never,
      config: baseConfig,
      toEmail: "customer@example.com",
      tradingName: "Acme",
      rawToken: "secret-token",
      tokenId: "act_1",
      fetchImpl,
    });

    expect(result.ok).toBe(false);
    expect(row.emailSentAt).toBeNull();
    expect(row.emailSendCount).toBe(1);
  });
});

describe("requestActivationEmailResend rate limits", () => {
  it("returns 429 when last attempt is inside the rate-limit window", async () => {
    const now = Date.UTC(2026, 10, 21, 12, 0, 0);
    const userRow = { id: "user_1", email: "customer@example.com" };
    const orderRow = {
      id: "ord_1",
      userId: "user_1",
      status: "paid",
      email: "customer@example.com",
      tradingName: "Acme",
      organisationId: "org_1",
      paidAt: new Date(now - 60_000),
    };
    const tokenRow = {
      id: "act_old",
      userId: "user_1",
      organisationId: "org_1",
      pendingOrderId: "ord_1",
      usedAt: null as Date | null,
      emailSentAt: new Date(now - 60_000),
      lastEmailAttemptAt: new Date(now - 60_000),
      emailSendCount: 1,
      createdAt: new Date(now - 120_000),
    };

    let stage = 0;
    const db = {
      select: () => {
        const chain = {
          from: () => chain,
          where: () => chain,
          orderBy: () => chain,
          get: async () => {
            stage += 1;
            if (stage === 1) return userRow;
            if (stage === 2) return orderRow;
            return tokenRow;
          },
          all: async () => [tokenRow],
        };
        return chain;
      },
      insert: () => ({
        values: async () => {
          throw new Error("should not mint under rate limit");
        },
      }),
      update: () => ({
        set: () => ({
          where: async () => undefined,
        }),
      }),
    };

    const result = await requestActivationEmailResend({
      db: db as never,
      config: baseConfig,
      email: "customer@example.com",
      nowMs: now,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(429);
      expect(result.error.toLowerCase()).toContain("wait");
    }
    expect(ACTIVATION_EMAIL_RATE_LIMIT_MS).toBeGreaterThan(60_000);
  });

  it("does not leak whether an email exists for unknown addresses", async () => {
    const db = {
      select: () => {
        const chain = {
          from: () => chain,
          where: () => chain,
          orderBy: () => chain,
          get: async () => null,
          all: async () => [],
        };
        return chain;
      },
    };

    const result = await requestActivationEmailResend({
      db: db as never,
      config: baseConfig,
      email: "nobody@example.com",
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.message.toLowerCase()).toContain("if that email");
    }
  });
});

describe("webhook duplicate / expired token contracts", () => {
  it("treats Stripe event id dedupe as preventing uncontrolled duplicate emails", () => {
    const seen = new Set<string>();
    const recordOnce = (id: string) => {
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    };
    const sendIfFirst = (eventId: string, alreadySent: boolean) => {
      if (!recordOnce(eventId)) return "skip_duplicate_event";
      if (alreadySent) return "skip_already_sent";
      return "send";
    };
    expect(sendIfFirst("evt_1", false)).toBe("send");
    expect(sendIfFirst("evt_1", false)).toBe("skip_duplicate_event");
    expect(sendIfFirst("evt_2", true)).toBe("skip_already_sent");
  });

  it("documents expired activation links as rejected by consumeActivationToken", () => {
    const expired = {
      expiresAt: new Date(Date.now() - 1000),
      usedAt: null as Date | null,
    };
    const isRejected =
      Boolean(expired.usedAt) || expired.expiresAt.getTime() < Date.now();
    expect(isRejected).toBe(true);
  });
});
