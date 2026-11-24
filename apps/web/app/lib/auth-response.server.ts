import { data, redirect } from "react-router";

function copyAuthCookies(authResponse: Response, headers: Headers) {
  const anyHeaders = authResponse.headers as Headers & {
    getSetCookie?: () => string[];
  };
  const cookies =
    typeof anyHeaders.getSetCookie === "function"
      ? anyHeaders.getSetCookie()
      : [];

  if (cookies.length > 0) {
    for (const cookie of cookies) {
      headers.append("Set-Cookie", cookie);
    }
    return;
  }
  const single = authResponse.headers.get("set-cookie");
  if (single) headers.append("Set-Cookie", single);
}

/**
 * Forward Better Auth Set-Cookie headers onto a React Router redirect.
 * Prefer this over a raw Response so client-side navigations re-render.
 */
export function redirectWithAuthCookies(
  authResponse: Response,
  location: string,
): Response {
  const headers = new Headers();
  copyAuthCookies(authResponse, headers);
  return redirect(location, { headers });
}

/**
 * Return action/loader data while forwarding Better Auth Set-Cookie headers.
 * Use for same-route steps (e.g. MFA challenge) so the UI updates without a
 * full remount race.
 */
export function dataWithAuthCookies<T>(authResponse: Response, payload: T) {
  const headers = new Headers();
  copyAuthCookies(authResponse, headers);
  return data(payload, { headers });
}

export async function readAuthJson<T>(response: Response): Promise<T | null> {
  try {
    return (await response.clone().json()) as T;
  } catch {
    return null;
  }
}
