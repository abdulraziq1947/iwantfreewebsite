/** Shared copy and step metadata for the conversion funnel. */

export const PACKAGE_PRICE_LABEL = "£39.99";
export const PACKAGE_PRICE_PERIOD = "/month";
export const PACKAGE_NAME = "Professional Business Website";

export const TERMS_VERSION = "2026-11-21-draft";

export const PACKAGE_INCLUDES = [
  "Professionally built business website",
  "Domain registration and renewal (manual, after payment)",
  "Website hosting and maintenance",
  "One business email mailbox",
  "Weekly Google Business Profile post",
  "Help with Google review replies",
  "UK-based support",
] as const;

export const DOMAIN_DISCLAIMER =
  "Domain availability is provisional and not guaranteed until our team completes registration after payment. Selecting a domain does not reserve or purchase it.";

export const GET_STARTED_STEPS = [
  { key: "package", label: "Package", path: "/get-started" },
  { key: "website", label: "Website details", path: "/get-started/website" },
  { key: "domain", label: "Domain", path: "/get-started/domain" },
  { key: "review", label: "Review & pay", path: "/get-started/review" },
] as const;

export type GetStartedStepKey = (typeof GET_STARTED_STEPS)[number]["key"];

export function stepIndex(pathname: string): number {
  if (pathname.startsWith("/get-started/confirmation")) return 3;
  if (pathname.startsWith("/get-started/activate")) return 3;
  if (pathname.startsWith("/get-started/review")) return 3;
  if (pathname.startsWith("/get-started/domain")) return 2;
  if (pathname.startsWith("/get-started/website")) return 1;
  if (pathname.startsWith("/get-started/account")) return 0;
  return 0;
}
