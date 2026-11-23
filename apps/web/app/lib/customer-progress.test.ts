import { describe, expect, it } from "vitest";
import { emptyOnboardingData } from "./onboarding";
import {
  buildCustomerActions,
  buildJourneyStages,
  buildStatusBanner,
  isBriefReady,
  needsGbpInvite,
  websiteStageLabel,
} from "./customer-progress";

describe("customer progress", () => {
  it("treats checkout brief as ready without wizard completion flag", () => {
    const data = emptyOnboardingData();
    data.business.tradingName = "Acme";
    data.domain.mode = "new";
    data.domain.preferredDomain = "acme.co.uk";
    expect(isBriefReady(data, false)).toBe(true);
    expect(isBriefReady(emptyOnboardingData(), false)).toBe(false);
  });

  it("tells paid customers nothing more is required", () => {
    const banner = buildStatusBanner({
      needsSubscription: false,
      briefReady: true,
      domainTask: {
        domainName: "acme.co.uk",
        domainMode: "new",
        status: "pending",
        registeredAt: null,
        connectedAt: null,
      },
      tradingName: "Acme",
    });
    expect(banner.title).toMatch(/nothing more/i);
    expect(banner.body).toMatch(/working on your website|get back to you/i);
  });

  it("hides domain as its own stage and shows working on website", () => {
    const stages = buildJourneyStages({
      needsSubscription: false,
      briefReady: true,
      domainTask: {
        domainName: "acme.co.uk",
        domainMode: "new",
        status: "pending",
        registeredAt: null,
        connectedAt: null,
      },
    });
    expect(stages.map((s) => s.id)).toEqual([
      "payment",
      "brief",
      "working",
      "live",
    ]);
    expect(stages.find((s) => s.id === "working")?.title).toMatch(
      /working on your website/i,
    );
    expect(stages.find((s) => s.id === "working")?.state).toBe("current");
  });

  it("surfaces optional GBP manager access for paid customers", () => {
    const data = emptyOnboardingData();
    expect(needsGbpInvite(data)).toBe(true);
    const actions = buildCustomerActions({
      needsSubscription: false,
      briefReady: true,
      domainTask: null,
      data,
    });
    const gbp = actions.find((a) => a.id === "gbp");
    expect(gbp?.cta).toBe("Give Manager access");
    expect(actions.some((a) => a.id === "add-site")).toBe(true);
  });

  it("labels website stage clearly for the team-owned phase", () => {
    expect(
      websiteStageLabel({
        needsSubscription: false,
        briefReady: true,
        domainStatus: "pending",
      }),
    ).toBe("We’re working on it");
  });

  it("celebrates a live website with the public URL", () => {
    const task = {
      domainName: "acme.co.uk",
      domainMode: "new" as const,
      status: "connected",
      registeredAt: null,
      connectedAt: "2026-01-01T00:00:00.000Z",
      liveUrl: "https://acme.co.uk",
    };
    expect(
      websiteStageLabel({
        needsSubscription: false,
        briefReady: true,
        domainStatus: "connected",
      }),
    ).toBe("Live");
    const banner = buildStatusBanner({
      needsSubscription: false,
      briefReady: true,
      domainTask: task,
      tradingName: "Acme",
    });
    expect(banner.kicker).toMatch(/congratulat/i);
    expect(banner.title).toMatch(/live/i);
    expect(banner.href).toBe("https://acme.co.uk");
    expect(banner.cta).toMatch(/visit live site/i);
    const stages = buildJourneyStages({
      needsSubscription: false,
      briefReady: true,
      domainTask: task,
    });
    expect(stages.find((s) => s.id === "live")?.title).toBe("Website live");
    expect(stages.find((s) => s.id === "live")?.detail).toMatch(
      /https:\/\/acme\.co\.uk/,
    );
    const actions = buildCustomerActions({
      needsSubscription: false,
      briefReady: true,
      domainTask: task,
      data: emptyOnboardingData(),
    });
    expect(actions.find((a) => a.id === "visit-live")?.to).toBe(
      "https://acme.co.uk",
    );
  });
});
