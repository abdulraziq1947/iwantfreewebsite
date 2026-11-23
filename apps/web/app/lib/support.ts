export const TICKET_CATEGORIES = [
  "issue",
  "request",
  "billing",
  "website",
  "other",
] as const;

export type TicketCategory = (typeof TICKET_CATEGORIES)[number];

export const TICKET_STATUSES = [
  "open",
  "awaiting_customer",
  "awaiting_staff",
  "resolved",
  "closed",
] as const;

export type TicketStatus = (typeof TICKET_STATUSES)[number];

export function isTicketCategory(value: string): value is TicketCategory {
  return (TICKET_CATEGORIES as readonly string[]).includes(value);
}

export function isTicketStatus(value: string): value is TicketStatus {
  return (TICKET_STATUSES as readonly string[]).includes(value);
}

export function ticketCategoryLabel(category: string): string {
  switch (category) {
    case "issue":
      return "Issue";
    case "request":
      return "Request";
    case "billing":
      return "Billing";
    case "website":
      return "Website";
    case "other":
      return "Other";
    default:
      return category;
  }
}

export function ticketStatusLabel(status: string): string {
  switch (status) {
    case "open":
      return "Open";
    case "awaiting_customer":
      return "Waiting for you";
    case "awaiting_staff":
      return "We’re on it";
    case "resolved":
      return "Resolved";
    case "closed":
      return "Closed";
    default:
      return status.replaceAll("_", " ");
  }
}
