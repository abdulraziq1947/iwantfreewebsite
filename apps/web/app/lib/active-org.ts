/** Cookie + query helpers for the customer's active website (organisation). */

export const ACTIVE_ORG_COOKIE = "iwfw_active_org";
export const ACTIVE_ORG_QUERY = "org";

export function pickActiveOrganisationId(
  membershipOrgIds: string[],
  preferredId: string | null | undefined,
): string | null {
  if (preferredId && membershipOrgIds.includes(preferredId)) {
    return preferredId;
  }
  return membershipOrgIds[0] ?? null;
}

export function readActiveOrganisationPreference(
  request: Request,
): string | null {
  const fromQuery = new URL(request.url).searchParams.get(ACTIVE_ORG_QUERY);
  if (fromQuery?.trim()) return fromQuery.trim();

  const cookie = request.headers.get("Cookie") ?? "";
  const match = cookie.match(
    new RegExp(`(?:^|;\\s*)${ACTIVE_ORG_COOKIE}=([^;]+)`),
  );
  if (!match?.[1]) return null;
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return match[1];
  }
}

export function activeOrganisationCookieHeader(organisationId: string): string {
  return `${ACTIVE_ORG_COOKIE}=${encodeURIComponent(organisationId)}; Path=/; Max-Age=31536000; SameSite=Lax`;
}

/** When `?org=` is present and valid, persist it as the active website cookie. */
export function maybeActiveOrganisationSetCookie(
  request: Request,
  activeOrganisationId: string | null,
): string | null {
  if (!activeOrganisationId) return null;
  const requested = new URL(request.url).searchParams.get(ACTIVE_ORG_QUERY);
  if (!requested || requested !== activeOrganisationId) return null;
  return activeOrganisationCookieHeader(activeOrganisationId);
}

/** Keep the active website selected across dashboard links. */
export function withActiveOrg(
  path: string,
  organisationId: string | null | undefined,
): string {
  if (!organisationId) return path;
  const url = new URL(path, "https://iwfw.local");
  url.searchParams.set(ACTIVE_ORG_QUERY, organisationId);
  return `${url.pathname}${url.search}`;
}
