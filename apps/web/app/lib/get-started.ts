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

export const GET_STARTED_STEPS = [
  { key: "package", label: "Package", path: "/get-started" },
  { key: "account", label: "Account", path: "/get-started/account" },
  { key: "review", label: "Review & pay", path: "/get-started/review" },
] as const;

export type GetStartedStepKey = (typeof GET_STARTED_STEPS)[number]["key"];

export function stepIndex(pathname: string): number {
  if (pathname.startsWith("/get-started/review")) return 2;
  if (pathname.startsWith("/get-started/account")) return 1;
  if (pathname.startsWith("/get-started/confirmation")) return 2;
  return 0;
}
