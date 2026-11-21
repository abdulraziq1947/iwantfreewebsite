import { describe, expect, it } from "vitest";
import { isResendConfigured, parseWorkerEnv } from "./index";

describe("parseWorkerEnv", () => {
  it("accepts valid local config", () => {
    const result = parseWorkerEnv({
      APP_URL: "http://localhost:5173",
      APP_ENV: "development",
      BETTER_AUTH_SECRET: "x".repeat(32),
    });
    expect(result.APP_ENV).toBe("development");
  });

  it("rejects short secrets", () => {
    expect(() =>
      parseWorkerEnv({
        APP_URL: "http://localhost:5173",
        BETTER_AUTH_SECRET: "too-short",
      }),
    ).toThrow();
  });

  it("accepts optional RESEND_API_KEY without requiring it locally", () => {
    const without = parseWorkerEnv({
      APP_URL: "http://localhost:5173",
      APP_ENV: "development",
      BETTER_AUTH_SECRET: "x".repeat(32),
    });
    expect(isResendConfigured(without)).toBe(false);

    const withKey = parseWorkerEnv({
      APP_URL: "http://localhost:5173",
      APP_ENV: "development",
      BETTER_AUTH_SECRET: "x".repeat(32),
      RESEND_API_KEY: "re_test_abc",
      RESEND_FROM_EMAIL: "accounts@iwantfreewebsite.com",
    });
    expect(isResendConfigured(withKey)).toBe(true);
    expect(withKey.RESEND_FROM_EMAIL).toBe("accounts@iwantfreewebsite.com");
  });
});
