export function orgStatusLabel(status: string): string {
  switch (status) {
    case "prospect":
      return "Setup needed";
    case "active":
      return "Active";
    case "cancelling":
      return "Cancelling";
    case "cancelled":
      return "Cancelled";
    case "churned":
      return "Ended";
    default:
      return status;
  }
}

export function orgStatusTone(
  status: string,
): "neutral" | "success" | "warning" | "danger" {
  switch (status) {
    case "active":
      return "success";
    case "prospect":
    case "cancelling":
      return "warning";
    case "cancelled":
    case "churned":
      return "danger";
    default:
      return "neutral";
  }
}

export const CUSTOMER_NAV = [
  { to: "/dashboard", label: "Overview", end: true },
  { to: "/dashboard/onboarding", label: "Progress" },
  { to: "/dashboard/website", label: "Website" },
  { to: "/dashboard/media", label: "Images" },
  { to: "/dashboard/billing", label: "Billing" },
  { to: "/dashboard/domain", label: "Domain" },
  { to: "/dashboard/email", label: "Email" },
  { to: "/dashboard/google-business", label: "Google Business" },
  { to: "/dashboard/support", label: "Support" },
  { to: "/dashboard/account", label: "Account" },
] as const;
