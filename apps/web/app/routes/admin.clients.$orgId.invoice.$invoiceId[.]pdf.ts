import { createDb } from "@iwfw/db";
import { getConfig, getEnv } from "../lib/env.server";
import { requireStaffSession } from "../lib/session.server";
import { getOrganisationInvoicePdfUrl } from "../lib/billing.server";
import type { Route } from "./+types/admin.clients.$orgId.invoice.$invoiceId[.]pdf";

export async function loader({ request, context, params }: Route.LoaderArgs) {
  await requireStaffSession(request, context);
  const invoiceId = params.invoiceId.replace(/\.pdf$/i, "");
  const result = await getOrganisationInvoicePdfUrl({
    config: getConfig(context),
    db: createDb(getEnv(context).DB),
    organisationId: params.orgId,
    invoiceId,
  });
  if ("error" in result) {
    throw new Response(result.error, { status: 404 });
  }
  return new Response(null, {
    status: 302,
    headers: { Location: result.url },
  });
}
