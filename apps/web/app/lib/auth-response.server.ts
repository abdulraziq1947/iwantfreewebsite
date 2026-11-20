/** Forward Better Auth Set-Cookie headers onto a redirect response. */
export function redirectWithAuthCookies(
  authResponse: Response,
  location: string,
): Response {
  const headers = new Headers();
  headers.set("Location", location);

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
  } else {
    const single = authResponse.headers.get("set-cookie");
    if (single) headers.append("Set-Cookie", single);
  }

  return new Response(null, { status: 302, headers });
}

export async function readAuthJson<T>(response: Response): Promise<T | null> {
  try {
    return (await response.clone().json()) as T;
  } catch {
    return null;
  }
}
