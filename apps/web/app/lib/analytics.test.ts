import { describe, expect, it } from "vitest";
import { estimateMonthlyProfitPence } from "./analytics.server";

describe("estimateMonthlyProfitPence", () => {
  it("spreads annual domain cost across months", () => {
    const result = estimateMonthlyProfitPence({
      planMonthlyPence: 3999,
      domainAnnualPence: 1200,
      mailboxMonthlyPence: 200,
      hostingMonthlyPence: 300,
      otherMonthlyPence: 0,
    });
    expect(result.revenuePence).toBe(3999);
    expect(result.costMonthlyPence).toBe(100 + 200 + 300);
    expect(result.profitMonthlyPence).toBe(3999 - 600);
  });
});
