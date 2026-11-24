/**
 * UK PECR / UK GDPR cookie consent helpers.
 *
 * Strictly necessary cookies do not need consent. Analytics and marketing
 * technologies must stay off until the visitor opts in.
 */

export const CONSENT_COOKIE = "iwfw_consent";
export const CONSENT_VERSION = 1;
/** ICO-friendly revisit window — ask again after about 6 months. */
export const CONSENT_MAX_AGE_SEC = 60 * 60 * 24 * 180;

export type ConsentCategories = {
  essential: true;
  analytics: boolean;
  marketing: boolean;
};

export type ConsentState = {
  version: number;
  updatedAt: string;
  categories: ConsentCategories;
};

export const DEFAULT_CONSENT: ConsentState = {
  version: CONSENT_VERSION,
  updatedAt: "",
  categories: {
    essential: true,
    analytics: false,
    marketing: false,
  },
};

export type CookieCategory = "essential" | "analytics" | "marketing";

export type CookieDisclosure = {
  name: string;
  category: CookieCategory;
  purpose: string;
  duration: string;
  provider: string;
};

/** First-party cookies this product sets (or may set) — keep Privacy/Cookies pages in sync. */
export const COOKIE_DISCLOSURES: CookieDisclosure[] = [
  {
    name: "better-auth.session_token (and related session cookies)",
    category: "essential",
    purpose: "Keep you signed in securely after login.",
    duration: "Session / as set by authentication",
    provider: "iwantfreewebsite.com",
  },
  {
    name: "iwfw_order",
    category: "essential",
    purpose: "Resume your get-started order before payment.",
    duration: "14 days",
    provider: "iwantfreewebsite.com",
  },
  {
    name: "iwfw_active_org",
    category: "essential",
    purpose: "Remember which website you are managing in the dashboard.",
    duration: "1 year",
    provider: "iwantfreewebsite.com",
  },
  {
    name: CONSENT_COOKIE,
    category: "essential",
    purpose: "Store your cookie preferences so we do not ask on every visit.",
    duration: "6 months",
    provider: "iwantfreewebsite.com",
  },
  {
    name: "Cloudflare security cookies (for example __cf_bm, cf_clearance)",
    category: "essential",
    purpose: "Protect the site from bots and abuse via our CDN / WAF.",
    duration: "As set by Cloudflare (typically minutes to hours)",
    provider: "Cloudflare",
  },
  {
    name: "Stripe cookies on checkout.stripe.com",
    category: "essential",
    purpose:
      "Process card payments securely when you complete Checkout (Stripe-hosted pages).",
    duration: "As set by Stripe",
    provider: "Stripe",
  },
];

export function parseConsent(raw: string | null | undefined): ConsentState | null {
  if (!raw?.trim()) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<ConsentState>;
    if (parsed.version !== CONSENT_VERSION) return null;
    if (!parsed.categories || typeof parsed.categories !== "object") return null;
    return {
      version: CONSENT_VERSION,
      updatedAt:
        typeof parsed.updatedAt === "string" ? parsed.updatedAt : "",
      categories: {
        essential: true,
        analytics: Boolean(parsed.categories.analytics),
        marketing: Boolean(parsed.categories.marketing),
      },
    };
  } catch {
    return null;
  }
}

export function buildConsent(partial: {
  analytics: boolean;
  marketing: boolean;
}): ConsentState {
  return {
    version: CONSENT_VERSION,
    updatedAt: new Date().toISOString(),
    categories: {
      essential: true,
      analytics: partial.analytics,
      marketing: partial.marketing,
    },
  };
}

export function consentCookieHeader(state: ConsentState): string {
  const value = encodeURIComponent(JSON.stringify(state));
  return `${CONSENT_COOKIE}=${value}; Path=/; Max-Age=${CONSENT_MAX_AGE_SEC}; SameSite=Lax`;
}

export function readConsentFromDocumentCookie(
  cookieHeader: string,
): ConsentState | null {
  const match = cookieHeader.match(
    new RegExp(`(?:^|;\\s*)${CONSENT_COOKIE}=([^;]+)`),
  );
  if (!match?.[1]) return null;
  try {
    return parseConsent(decodeURIComponent(match[1]));
  } catch {
    return parseConsent(match[1]);
  }
}

/** Client-side write (banner). Server can also Set-Cookie the same value. */
export function writeConsentCookie(state: ConsentState): void {
  if (typeof document === "undefined") return;
  document.cookie = consentCookieHeader(state);
}

export function hasAnalyticsConsent(state: ConsentState | null): boolean {
  return Boolean(state?.categories.analytics);
}

export function hasMarketingConsent(state: ConsentState | null): boolean {
  return Boolean(state?.categories.marketing);
}

/**
 * Load a third-party script only after analytics consent.
 * No-op when already present or consent is missing.
 */
export function loadScriptWhenAllowed(options: {
  id: string;
  src: string;
  allowed: boolean;
  async?: boolean;
}): void {
  if (typeof document === "undefined" || !options.allowed) return;
  if (document.getElementById(options.id)) return;
  const el = document.createElement("script");
  el.id = options.id;
  el.src = options.src;
  el.async = options.async ?? true;
  document.head.appendChild(el);
}
