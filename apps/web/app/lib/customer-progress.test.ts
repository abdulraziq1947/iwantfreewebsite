import { describe, expect, it } from "vitest";
import { emptyOnboardingData } from "./onboarding";
import {
  buildCustomerActions,
  buildJourneyStages,
  isBriefReady,
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

  it("surfaces add-another-site and gbp actions for paid customers", () => {
    const actions = buildCustomerActions({
      needsSubscription: false,
      briefReady: true,
      domainTask: null,
      data: emptyOnboardingData(),
    });
    expect(actions.some((a) => a.id === "gbp")).toBe(true);
    expect(actions.some((a) => a.id === "add-site")).toBe(true);
    expect(actions.find((a) => a.id === "add-site")?.to).toBe(
      "/get-started?new=1",
    );
  });

  it("labels website stage from domain status", () => {
    expect(
      websiteStageLabel({
        needsSubscription: false,
        briefReady: true,
        domainStatus: "in_progress",
      }),
    ).toBe("Building your website");
  });
});
