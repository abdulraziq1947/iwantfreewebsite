export function formatGbpFromPence(pence: number): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
  }).format(pence / 100);
}

export function formatAdminDate(value: Date | string | null | undefined): string {
  if (!value) return "—";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export const ADMIN_NAV = [
  { to: "/admin", label: "Overview", end: true },
  { to: "/admin/clients", label: "Clients" },
  { to: "/admin/subscriptions", label: "Subscriptions" },
  { to: "/admin/orders", label: "Orders" },
  { to: "/admin/domains", label: "Domains" },
  { to: "/admin/transfers", label: "Transfers" },
  { to: "/admin/media", label: "Images" },
] as const;
