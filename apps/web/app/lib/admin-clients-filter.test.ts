import { describe, expect, it } from "vitest";
import { filterAdminClients, type AdminClientRow } from "./admin-clients-filter";

const sample: AdminClientRow[] = [
  {
    id: "org_1",
    tradingName: "Acme Plumbing",
    status: "active",
    websiteLive: true,
    contactName: "Ada",
    contactEmail: "ada@acme.test",
    subscriptionStatus: "active",
    attentionCount: 0,
    createdAt: "2026-01-02T00:00:00.000Z",
    currentPeriodEnd: null,
    cancelAtPeriodEnd: false,
  },
  {
    id: "org_2",
    tradingName: "Bright Bakery",
    status: "active",
    websiteLive: false,
    contactName: "Ben",
    contactEmail: "ben@bakery.test",
    subscriptionStatus: "active",
    attentionCount: 3,
    createdAt: "2026-01-01T00:00:00.000Z",
    currentPeriodEnd: null,
    cancelAtPeriodEnd: false,
  },
];

describe("filterAdminClients", () => {
  it("searches trading name and email", () => {
    expect(filterAdminClients(sample, { q: "bakery" }).map((c) => c.id)).toEqual([
      "org_2",
    ]);
    expect(filterAdminClients(sample, { q: "ada@" }).map((c) => c.id)).toEqual([
      "org_1",
    ]);
  });

  it("filters live / not live and attention", () => {
    expect(
      filterAdminClients(sample, { live: "not_live" }).map((c) => c.id),
    ).toEqual(["org_2"]);
    expect(
      filterAdminClients(sample, { attention: "needs" }).map((c) => c.id),
    ).toEqual(["org_2"]);
  });

  it("sorts by attention then recency", () => {
    expect(filterAdminClients(sample, {}).map((c) => c.id)).toEqual([
      "org_2",
      "org_1",
    ]);
  });
});
