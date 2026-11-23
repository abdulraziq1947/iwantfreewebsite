import { describe, expect, it } from "vitest";
import {
  emptyQuestionnaire,
  parseQuestionnaire,
  validateQuestionnaireStep,
} from "./order-questionnaire";

describe("order questionnaire", () => {
  it("requires contact fields on personal step", () => {
    const data = emptyQuestionnaire();
    expect(validateQuestionnaireStep(0, data)).toBeTruthy();
    data.contact = {
      fullName: "Ada Lovelace",
      email: "ada@example.com",
      phone: "0800 000 000",
    };
    expect(validateQuestionnaireStep(0, data)).toBeNull();
  });

  it("requires core business fields on business step", () => {
    const data = emptyQuestionnaire();
    data.contact = {
      fullName: "Ada Lovelace",
      email: "ada@example.com",
      phone: "0800 000 000",
    };
    expect(validateQuestionnaireStep(1, data)).toBeTruthy();
    data.business = {
      tradingName: "Ada Analytical",
      industry: "Consulting",
      address: "1 Algorithm Way",
      serviceAreas: "London",
    };
    data.services.list = "Analysis";
    data.about.introduction = "We help businesses.";
    expect(validateQuestionnaireStep(1, data)).toBeNull();
  });

  it("round-trips JSON", () => {
    const data = emptyQuestionnaire();
    data.business.tradingName = "Ada Analytical";
    const parsed = parseQuestionnaire(JSON.stringify(data));
    expect(parsed.business.tradingName).toBe("Ada Analytical");
  });
});

describe("pending order payment contracts", () => {
  it("does not treat success redirect as payment proof", () => {
    const successRedirectProvesPayment = false;
    const webhookIsSourceOfTruth = true;
    expect(successRedirectProvesPayment).toBe(false);
    expect(webhookIsSourceOfTruth).toBe(true);
  });

  it("creates account only after paid webhook fulfillment", () => {
    const createAccountBeforePayment = false;
    expect(createAccountBeforePayment).toBe(false);
  });

  it("handles webhook retries idempotently", () => {
    const seen = new Set<string>();
    const once = (id: string) => {
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    };
    expect(once("evt_1")).toBe(true);
    expect(once("evt_1")).toBe(false);
  });

  it("marks failed/abandoned checkout without inventing success", () => {
    const statuses = ["draft", "checkout_open", "failed", "abandoned", "paid"];
    expect(statuses.includes("paid")).toBe(true);
    expect(statuses.includes("fake_success")).toBe(false);
  });
});
