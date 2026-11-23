/**
 * Client-safe helpers for staff TOTP enrollment UI.
 * Secrets stay in memory only — never log or send to analytics.
 */

/** Extract the Base32 secret from an otpauth:// TOTP URI. */
export function extractTotpSecret(totpURI: string): string | null {
  try {
    const url = new URL(totpURI);
    if (url.protocol !== "otpauth:") return null;
    const secret = url.searchParams.get("secret");
    if (!secret) return null;
    const cleaned = secret.replace(/\s+/g, "").toUpperCase();
    if (!/^[A-Z2-7]+=*$/.test(cleaned)) return null;
    return cleaned;
  } catch {
    return null;
  }
}

/** Format a Base32 secret into space-separated groups for manual entry. */
export function formatManualSetupKey(secret: string, groupSize = 4): string {
  const cleaned = secret.replace(/\s+/g, "").toUpperCase();
  const parts: string[] = [];
  for (let i = 0; i < cleaned.length; i += groupSize) {
    parts.push(cleaned.slice(i, i + groupSize));
  }
  return parts.join(" ");
}

export function manualSetupKeyFromUri(totpURI: string): string | null {
  const secret = extractTotpSecret(totpURI);
  if (!secret) return null;
  return formatManualSetupKey(secret);
}
