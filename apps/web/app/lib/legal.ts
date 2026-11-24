/** Shared legal / privacy contact copy for UK GDPR & PECR notices. */

export const LEGAL_CONTROLLER_NAME = "iwantfreewebsite.com";
export const LEGAL_SUPPORT_EMAIL = "support@iwantfreewebsite.com";
/** Same inbox today — use this wording for DSAR / privacy rights requests. */
export const LEGAL_PRIVACY_EMAIL = "support@iwantfreewebsite.com";
export const LEGAL_SUPPORT_PHONE_DISPLAY = "0800 852 7267";
export const LEGAL_SUPPORT_PHONE_HREF = "tel:08008527267";
export const LEGAL_ICO_URL = "https://ico.org.uk/make-a-complaint/";
export const PRIVACY_POLICY_VERSION = "2026-11-24";
export const COOKIE_POLICY_VERSION = "2026-11-24";

export const PROCESSORS = [
  {
    name: "Cloudflare",
    role: "Hosting, CDN, DDoS/WAF protection, Workers runtime, D1 database, R2 file storage",
  },
  {
    name: "Stripe",
    role: "Subscription billing and card payments",
  },
  {
    name: "Resend",
    role: "Transactional email (password reset and service messages)",
  },
  {
    name: "MXroute",
    role: "Business email mailbox hosting for subscribed customers",
  },
] as const;
