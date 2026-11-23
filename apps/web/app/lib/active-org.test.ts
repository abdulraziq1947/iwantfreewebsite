import { describe, expect, it } from "vitest";
import {
  ACTIVE_ORG_COOKIE,
  pickActiveOrganisationId,
  readActiveOrganisationPreference,
  withActiveOrg,
} from "./active-org";

describe("active-org", () => {
  it("prefers a membership-owned organisation id", () => {
    expect(pickActiveOrganisationId(["a", "b"], "b")).toBe("b");
    expect(pickActiveOrganisationId(["a", "b"], "z")).toBe("a");
    expect(pickActiveOrganisationId([], "a")).toBeNull();
  });

  it("reads org from query before cookie", () => {
    const req = new Request("https://example.com/dashboard/media?org=org_b", {
      headers: { Cookie: `${ACTIVE_ORG_COOKIE}=org_a` },
    });
    expect(readActiveOrganisationPreference(req)).toBe("org_b");
  });

  it("falls back to the cookie when query is absent", () => {
    const req = new Request("https://example.com/dashboard/media", {
      headers: { Cookie: `${ACTIVE_ORG_COOKIE}=org_a` },
    });
    expect(readActiveOrganisationPreference(req)).toBe("org_a");
  });

  it("appends the active org query to dashboard paths", () => {
    expect(withActiveOrg("/dashboard/media", "org_1")).toBe(
      "/dashboard/media?org=org_1",
    );
    expect(withActiveOrg("/dashboard/media?tab=x", "org_1")).toBe(
      "/dashboard/media?tab=x&org=org_1",
    );
  });
});
