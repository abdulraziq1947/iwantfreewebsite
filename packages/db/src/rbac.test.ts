import { describe, expect, it } from "vitest";
import { isStaffRole } from "@iwfw/config";

describe("RBAC helpers", () => {
  it("recognises staff roles", () => {
    expect(isStaffRole("platform_owner")).toBe(true);
    expect(isStaffRole("customer")).toBe(false);
  });
});
