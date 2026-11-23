import { describe, expect, it } from "vitest";
import { emptyOnboardingData } from "./onboarding";
import { buildAttentionBoard, gbpAccessSummary } from "./attention";

describe("attention board", () => {
  it("flags GMB as not granted until staff confirm", () => {
    const data = emptyOnboardingData();
    data.gbp.outcome = "invitation_sent";
    const gbp = gbpAccessSummary(data);
    expect(gbp.granted).toBe(false);
    expect(gbp.state).toBe("invite_sent");
    expect(gbp.awaitingStaff).toBe(true);

    data.gbp.accessGranted = true;
    expect(gbpAccessSummary(data).state).toBe("granted");
    expect(gbpAccessSummary(data).granted).toBe(true);
  });

  it("lists customer and staff pending items separately", () => {
    const data = emptyOnboardingData();
    const board = buildAttentionBoard({
      needsSubscription: false,
      briefReady: true,
      domainTask: {
        domainName: "acme.co.uk",
        domainMode: "new",
        status: "pending",
        registeredAt: null,
        connectedAt: null,
      },
      data,
      uploadCount: 0,
      openDomainCount: 1,
    });

    // GBP invite is deferred until the website is live (FB-12).
    expect(board.customer.some((i) => i.id === "gbp-invite")).toBe(false);
    expect(board.staff.some((i) => i.id === "domain-task")).toBe(true);
    expect(board.staff.some((i) => i.id === "build-live")).toBe(true);
    expect(board.gbp.label).toMatch(/manager access|optional|not confirmed/i);
    // Pre-live: no customer GBP action (FB-12); staff still have build work.
    expect(board.customerPendingCount).toBe(0);
    expect(board.staffPendingCount).toBeGreaterThan(0);
  });

  it("shows GBP invite only after website is live", () => {
    const data = emptyOnboardingData();
    const board = buildAttentionBoard({
      needsSubscription: false,
      briefReady: true,
      domainTask: {
        domainName: "acme.co.uk",
        domainMode: "new",
        status: "connected",
        registeredAt: null,
        connectedAt: "2026-01-01T00:00:00.000Z",
        liveUrl: "https://acme.co.uk",
      },
      data,
      uploadCount: 2,
    });
    expect(board.customer.some((i) => i.id === "gbp-invite")).toBe(true);
  });

  it("clears customer GMB action once access is granted", () => {
    const data = emptyOnboardingData();
    data.gbp.accessGranted = true;
    data.gbp.outcome = "invitation_sent";
    const board = buildAttentionBoard({
      needsSubscription: false,
      briefReady: true,
      domainTask: {
        domainName: "acme.co.uk",
        domainMode: "new",
        status: "connected",
        registeredAt: null,
        connectedAt: "2026-01-01T00:00:00.000Z",
        liveUrl: "https://acme.co.uk",
      },
      data,
      uploadCount: 2,
    });
    expect(board.gbp.granted).toBe(true);
    expect(board.customer.some((i) => i.id === "gbp-invite")).toBe(false);
    expect(board.staff.some((i) => i.id === "build-live")).toBe(false);
    expect(board.customerPendingCount).toBe(0);
  });

  it("has no customer pending items after invite sent and nothing else required", () => {
    const data = emptyOnboardingData();
    data.gbp.outcome = "invitation_sent";
    const board = buildAttentionBoard({
      needsSubscription: false,
      briefReady: true,
      domainTask: {
        domainName: "acme.co.uk",
        domainMode: "new",
        status: "pending",
        registeredAt: null,
        connectedAt: null,
      },
      data,
      uploadCount: 0,
      openDomainCount: 1,
    });
    expect(board.customerPendingCount).toBe(0);
    expect(board.customer.every((i) => i.severity !== "action")).toBe(true);
    expect(board.staffPendingCount).toBeGreaterThan(0);
  });
});
