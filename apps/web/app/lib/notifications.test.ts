import { describe, expect, it } from "vitest";
import {
  NOTIFICATION_KINDS,
  staffBillingChangeFromStripe,
} from "./notifications.server";

describe("staff notification kinds", () => {
  it("covers client actions that affect ops", () => {
    expect(NOTIFICATION_KINDS).toContain("media_upload");
    expect(NOTIFICATION_KINDS).toContain("billing_update");
    expect(NOTIFICATION_KINDS).toContain("mailbox_update");
    expect(NOTIFICATION_KINDS).toContain("gbp_update");
    expect(NOTIFICATION_KINDS).toContain("ticket_created");
    expect(NOTIFICATION_KINDS).toContain("new_customer");
  });
});

describe("staffBillingChangeFromStripe", () => {
  it("skips the first snapshot so new-customer checkout is not double-notified", () => {
    expect(
      staffBillingChangeFromStripe(null, {
        status: "active",
        cancelAtPeriodEnd: false,
      }),
    ).toBeNull();
  });

  it("notifies when a customer schedules cancellation", () => {
    expect(
      staffBillingChangeFromStripe(
        { status: "active", cancelAtPeriodEnd: false },
        { status: "active", cancelAtPeriodEnd: true },
      ),
    ).toEqual({
      title: "Customer cancelled subscription",
      detail: "They asked to cancel at the end of the current period.",
    });
  });

  it("notifies when a customer resumes after cancelling", () => {
    expect(
      staffBillingChangeFromStripe(
        { status: "active", cancelAtPeriodEnd: true },
        { status: "active", cancelAtPeriodEnd: false },
      ),
    ).toEqual({
      title: "Customer resumed subscription",
      detail: "They kept the plan after cancelling.",
    });
  });

  it("notifies when a subscription fully ends", () => {
    expect(
      staffBillingChangeFromStripe(
        { status: "active", cancelAtPeriodEnd: true },
        { status: "canceled", cancelAtPeriodEnd: true },
      )?.title,
    ).toBe("Subscription ended");
  });

  it("notifies on past_due and unpaid, but not trial → active", () => {
    expect(
      staffBillingChangeFromStripe(
        { status: "active", cancelAtPeriodEnd: false },
        { status: "past_due", cancelAtPeriodEnd: false },
      )?.title,
    ).toBe("Subscription payment issue");
    expect(
      staffBillingChangeFromStripe(
        { status: "trialing", cancelAtPeriodEnd: false },
        { status: "active", cancelAtPeriodEnd: false },
      ),
    ).toBeNull();
  });

  it("skips period ticks that do not change status or cancel flag", () => {
    expect(
      staffBillingChangeFromStripe(
        { status: "active", cancelAtPeriodEnd: false },
        { status: "active", cancelAtPeriodEnd: false },
      ),
    ).toBeNull();
  });
});
