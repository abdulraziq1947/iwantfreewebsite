/** Shared copy and step metadata for the conversion funnel. */

export const PACKAGE_PRICE_LABEL = "£39.99";
export const PACKAGE_PRICE_PERIOD = "/month";
export const PACKAGE_NAME = "Professional Business Website";

export const TERMS_VERSION = "2026-11-23";

export const PACKAGE_INCLUDES = [
  "Professionally built business website",
  "Domain registration and renewal (we handle it after payment)",
  "Website hosting and maintenance",
  "One business email mailbox",
  "Google Business Profile help (Manager access & posting guidance)",
  "Help with Google review replies",
  "UK-based support",
] as const;

export const DOMAIN_DISCLAIMER =
  "Domain availability is provisional and not guaranteed until our team completes registration after payment. Selecting a domain does not reserve or purchase it.";

/** Numbered progress after the package intro page. */
export const GET_STARTED_STEPS = [
  {
    key: "personal",
    label: "Personal details",
    path: "/get-started/personal",
  },
  {
    key: "business",
    label: "Business details",
    path: "/get-started/business",
  },
  {
    key: "media",
    label: "Media & logos",
    path: "/get-started/media",
  },
  { key: "domain", label: "Domain", path: "/get-started/domain" },
  { key: "review", label: "Review & pay", path: "/get-started/review" },
] as const;

export type GetStartedStepKey = (typeof GET_STARTED_STEPS)[number]["key"];

export function stepIndex(pathname: string): number {
  if (pathname.startsWith("/get-started/confirmation")) return 4;
  if (pathname.startsWith("/get-started/activate")) return 4;
  if (pathname.startsWith("/get-started/review")) return 4;
  if (pathname.startsWith("/get-started/domain")) return 3;
  if (pathname.startsWith("/get-started/media")) return 2;
  if (pathname.startsWith("/get-started/business")) return 1;
  if (pathname.startsWith("/get-started/personal")) return 0;
  if (pathname.startsWith("/get-started/website")) return 0;
  if (pathname.startsWith("/get-started/account")) return -1;
  // Package intro — no numbered step active yet.
  if (pathname === "/get-started" || pathname === "/get-started/") return -1;
  return -1;
}
