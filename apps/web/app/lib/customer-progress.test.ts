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
    expect(banner.body).toMatch(/get back to you/i);
  });

  it("marks payment and brief done after subscribe", () => {
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
    expect(stages.find((s) => s.id === "payment")?.state).toBe("done");
    expect(stages.find((s) => s.id === "brief")?.state).toBe("done");
    expect(stages.find((s) => s.id === "domain")?.state).toBe("current");
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
    ).toBe("We’re on it");
  });
});
