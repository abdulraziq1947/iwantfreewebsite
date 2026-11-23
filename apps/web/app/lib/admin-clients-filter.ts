export type AdminClientRow = {
  id: string;
  tradingName: string;
  status: string;
  websiteLive: boolean;
  contactName: string | null;
  contactEmail: string | null;
  subscriptionStatus: string | null;
  attentionCount: number;
  createdAt: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
};

export type AdminClientFilters = {
  q?: string;
  live?: "all" | "live" | "not_live";
  attention?: "all" | "needs";
};

export function filterAdminClients(
  clients: AdminClientRow[],
  filters: AdminClientFilters,
): AdminClientRow[] {
  const q = (filters.q ?? "").trim().toLowerCase();
  let rows = clients;
  if (q) {
    rows = rows.filter((c) => {
      const hay = [
        c.tradingName,
        c.contactName ?? "",
        c.contactEmail ?? "",
        c.id,
      ]
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }
  if (filters.live === "live") {
    rows = rows.filter((c) => c.websiteLive);
  } else if (filters.live === "not_live") {
    rows = rows.filter((c) => !c.websiteLive);
  }
  if (filters.attention === "needs") {
    rows = rows.filter((c) => c.attentionCount > 0);
  }
  return [...rows].sort((a, b) => {
    if (b.attentionCount !== a.attentionCount) {
      return b.attentionCount - a.attentionCount;
    }
    const aTime = a.createdAt ? Date.parse(a.createdAt) : 0;
    const bTime = b.createdAt ? Date.parse(b.createdAt) : 0;
    return bTime - aTime;
  });
}
