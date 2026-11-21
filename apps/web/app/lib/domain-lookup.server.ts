/**
 * Live domain availability via public RDAP (no purchase API).
 * Supports .com (Verisign RDAP) and .uk / .co.uk (Nominet RDAP).
 * Availability is provisional until manual registration.
 */

export const SUPPORTED_TLDS = ["co.uk", "com", "uk"] as const;
export type SupportedTld = (typeof SUPPORTED_TLDS)[number];

export type DomainAvailability =
  | "available"
  | "unavailable"
  | "invalid"
  | "unknown";

export type DomainCheckResult = {
  domain: string;
  tld: SupportedTld | null;
  availability: DomainAvailability;
  source: "rdap" | "validation";
  message: string;
};

const LABEL_RE = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i;

export function normalizeDomainInput(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .split("/")[0]
    .replace(/\.$/, "");
}

export function parseDomain(raw: string): {
  domain: string;
  label: string;
  tld: SupportedTld | null;
} {
  const domain = normalizeDomainInput(raw);
  for (const tld of SUPPORTED_TLDS) {
    const suffix = `.${tld}`;
    if (domain.endsWith(suffix)) {
      const label = domain.slice(0, -suffix.length);
      return { domain, label, tld };
    }
  }
  // Bare label — default to checking as label only
  if (domain && !domain.includes(".")) {
    return { domain, label: domain, tld: null };
  }
  return { domain, label: domain.split(".")[0] || domain, tld: null };
}

export function isValidLabel(label: string): boolean {
  if (!label || label.length > 63) return false;
  if (label.startsWith("-") || label.endsWith("-")) return false;
  return LABEL_RE.test(label);
}

function rdapUrl(domain: string, tld: SupportedTld): string {
  if (tld === "com") {
    return `https://rdap.verisign.com/com/v1/domain/${encodeURIComponent(domain)}`;
  }
  return `https://rdap.nominet.uk/uk/domain/${encodeURIComponent(domain)}`;
}

export async function checkDomainAvailability(
  raw: string,
  fetchImpl: typeof fetch = fetch,
): Promise<DomainCheckResult> {
  const { domain, label, tld } = parseDomain(raw);
  if (!tld) {
    return {
      domain,
      tld: null,
      availability: "invalid",
      source: "validation",
      message: "Use a full domain ending in .co.uk, .com or .uk.",
    };
  }
  if (!isValidLabel(label)) {
    return {
      domain,
      tld,
      availability: "invalid",
      source: "validation",
      message: "That domain name format is not valid.",
    };
  }

  try {
    const res = await fetchImpl(rdapUrl(domain, tld), {
      method: "GET",
      headers: { accept: "application/rdap+json, application/json" },
    });
    if (res.status === 404) {
      return {
        domain,
        tld,
        availability: "available",
        source: "rdap",
        message:
          "Looks available right now. Availability is provisional until we register it manually after payment.",
      };
    }
    if (res.ok) {
      return {
        domain,
        tld,
        availability: "unavailable",
        source: "rdap",
        message: "This domain appears to be taken.",
      };
    }
    return {
      domain,
      tld,
      availability: "unknown",
      source: "rdap",
      message:
        "We could not confirm availability automatically. Our team can check manually after payment.",
    };
  } catch {
    return {
      domain,
      tld,
      availability: "unknown",
      source: "rdap",
      message:
        "Domain lookup is temporarily unavailable. You can still continue — our team will verify before registration.",
    };
  }
}

/** Suggest alternate labels / TLDs when preferred name is taken. */
export async function suggestDomainAlternatives(
  raw: string,
  fetchImpl: typeof fetch = fetch,
  limit = 6,
): Promise<DomainCheckResult[]> {
  const { label, tld } = parseDomain(raw);
  if (!isValidLabel(label)) return [];

  const candidates: string[] = [];
  const tlds: SupportedTld[] = tld
    ? [tld, ...SUPPORTED_TLDS.filter((t) => t !== tld)]
    : [...SUPPORTED_TLDS];

  const suffixes = ["hq", "uk", "online", "site", "group", "co"];
  for (const t of tlds) {
    candidates.push(`${label}.${t}`);
    for (const s of suffixes) {
      candidates.push(`${label}${s}.${t}`);
      candidates.push(`${label}-${s}.${t}`);
    }
  }

  const unique = [...new Set(candidates)].filter(
    (d) => normalizeDomainInput(raw) !== d,
  );
  const available: DomainCheckResult[] = [];
  for (const candidate of unique) {
    if (available.length >= limit) break;
    const result = await checkDomainAvailability(candidate, fetchImpl);
    if (result.availability === "available") available.push(result);
  }
  return available;
}

export function isSupportedDomainName(domain: string): boolean {
  const parsed = parseDomain(domain);
  return Boolean(parsed.tld && isValidLabel(parsed.label));
}
