import { describe, expect, it } from "vitest";
import {
  buildOrderResumeUrl,
  canDeletePendingOrder,
  canRemindPendingOrder,
  isOrderReminderRateLimited,
  ORDER_REMINDER_RATE_LIMIT_MS,
  renderOrderReminderEmail,
} from "./admin-orders.server";
import { unpaidOrderResumePath } from "./order-questionnaire";
import {
  cookieMaxAgeSecFromExpiry,
  isUnpaidFunnelStatus,
  revivedUnpaidOrderStatus,
} from "./pending-order.server";

describe("unpaid funnel order guards", () => {
  it("allows delete and remind for unpaid drafts with email", () => {
    const order = {
      status: "draft",
      organisationId: null,
      email: "sam@example.com",
    };
    expect(canDeletePendingOrder(order).ok).toBe(true);
    expect(canRemindPendingOrder(order).ok).toBe(true);
  });

  it("blocks delete and remind for paid orders", () => {
    const order = {
      status: "paid",
      organisationId: "org_1",
      email: "sam@example.com",
    };
    expect(canDeletePendingOrder(order).ok).toBe(false);
    const remind = canRemindPendingOrder(order);
    expect(remind.ok).toBe(false);
    if (!remind.ok) expect(remind.error).toMatch(/already paid/i);
  });

  it("blocks remind when there is no email yet", () => {
    const order = { status: "draft", organisationId: null, email: null };
    expect(canDeletePendingOrder(order).ok).toBe(true);
    expect(canRemindPendingOrder(order).ok).toBe(false);
  });

  it("allows delete and remind for expired and abandoned funnel orders", () => {
    const expired = {
      status: "expired",
      organisationId: null,
      email: "sam@example.com",
    };
    expect(canDeletePendingOrder(expired).ok).toBe(true);
    expect(canRemindPendingOrder(expired).ok).toBe(true);
    expect(
      canRemindPendingOrder({
        status: "abandoned",
        organisationId: null,
        email: "sam@example.com",
      }).ok,
    ).toBe(true);
  });

  it("treats expired and abandoned as unpaid funnel statuses", () => {
    expect(isUnpaidFunnelStatus("expired")).toBe(true);
    expect(isUnpaidFunnelStatus("abandoned")).toBe(true);
    expect(isUnpaidFunnelStatus("paid")).toBe(false);
  });
});

describe("order reminder email", () => {
  it("builds a resume URL without leaking the token into the path host", () => {
    const url = buildOrderResumeUrl(
      "https://iwantfreewebsite.com/",
      "resume_secret_token",
    );
    expect(url).toBe(
      "https://iwantfreewebsite.com/get-started/resume?token=resume_secret_token",
    );
  });

  it("renders a transactional reminder, not a marketing blast", () => {
    const content = renderOrderReminderEmail({
      fullName: "Sam Patel",
      tradingName: "Patel Plumbing",
      resumeUrl:
        "https://iwantfreewebsite.com/get-started/resume?token=resume_secret_token",
    });
    expect(content.subject.toLowerCase()).toContain("finish your website order");
    expect(content.text).toContain("Sam Patel");
    expect(content.text).toContain("Patel Plumbing");
    expect(content.text).toContain(
      "https://iwantfreewebsite.com/get-started/resume?token=resume_secret_token",
    );
    expect(content.text.toLowerCase()).toContain("ignore this email");
    expect(content.html).toContain("Continue your order");
    expect(content.html).not.toContain("<script");
  });

  it("rate-limits reminders to once per hour", () => {
    const now = Date.parse("2026-11-25T12:00:00.000Z");
    expect(isOrderReminderRateLimited(null, now)).toBe(false);
    expect(
      isOrderReminderRateLimited(
        new Date(now - ORDER_REMINDER_RATE_LIMIT_MS + 1000),
        now,
      ),
    ).toBe(true);
    expect(
      isOrderReminderRateLimited(
        new Date(now - ORDER_REMINDER_RATE_LIMIT_MS - 1000),
        now,
      ),
    ).toBe(false);
  });
});

describe("resume helpers", () => {
  it("sends checkout-ready orders back to review", () => {
    expect(
      unpaidOrderResumePath({
        status: "ready_for_checkout",
        questionnaireStep: 0,
      }),
    ).toBe("/get-started/review");
    expect(
      unpaidOrderResumePath({ status: "draft", questionnaireStep: 2 }),
    ).toBe("/get-started/media");
    expect(
      unpaidOrderResumePath({
        status: "checkout_open",
        questionnaireStep: 0,
      }),
    ).toBe("/get-started/review");
  });

  it("revives expired complete orders to ready_for_checkout", () => {
    expect(
      revivedUnpaidOrderStatus({
        status: "expired",
        termsAcceptedAt: new Date(),
        domainName: "example.co.uk",
        email: "sam@example.com",
      }),
    ).toBe("ready_for_checkout");
    expect(
      revivedUnpaidOrderStatus({
        status: "abandoned",
        termsAcceptedAt: null,
        domainName: null,
        email: "sam@example.com",
      }),
    ).toBe("draft");
  });

  it("keeps a minimum cookie lifetime of 60 seconds", () => {
    const now = Date.parse("2026-11-25T12:00:00.000Z");
    expect(cookieMaxAgeSecFromExpiry(new Date(now - 5000), now)).toBe(60);
    expect(cookieMaxAgeSecFromExpiry(new Date(now + 120_000), now)).toBe(120);
  });
});
