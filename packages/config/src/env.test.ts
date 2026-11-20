import { describe, expect, it } from "vitest";
import { parseWorkerEnv } from "./index";

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
});
