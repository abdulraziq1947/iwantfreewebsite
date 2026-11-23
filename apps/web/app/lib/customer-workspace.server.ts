import { createDb } from "@iwfw/db";
import type { AuthContext } from "@iwfw/auth";
import { getConfig, getEnv } from "./env.server";
import { getCustomerWorkspace } from "./customer-org.server";
import {
  maybeActiveOrganisationSetCookie,
  readActiveOrganisationPreference,
} from "./active-org";

type AppLoadContext = Parameters<typeof getEnv>[0];

/**
 * Load the customer's workspace for the active website (org).
 * Honours `?org=` and the active-org cookie; persists `?org=` into the cookie.
 */
export async function loadCustomerWorkspace(
  request: Request,
  context: AppLoadContext,
  auth: AuthContext,
) {
  const preferred = readActiveOrganisationPreference(request);
  const db = createDb(getEnv(context).DB);
  const workspace = await getCustomerWorkspace(
    db,
    auth,
    getConfig(context),
    { organisationId: preferred },
  );
  const setCookie = maybeActiveOrganisationSetCookie(
    request,
    workspace.primary?.id ?? null,
  );
  return {
    db,
    workspace,
    headers: setCookie ? { "Set-Cookie": setCookie } : undefined,
  };
}
