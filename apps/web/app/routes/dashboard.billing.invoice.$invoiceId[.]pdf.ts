import { createDb } from "@iwfw/db";
import { getConfig, getEnv } from "../lib/env.server";
import { requireAuth } from "../lib/session.server";
import { getCustomerWorkspace } from "../lib/customer-org.server";
import { getOrganisationInvoicePdfUrl } from "../lib/billing.server";
import type { Route } from "./+types/dashboard.billing.invoice.$invoiceId[.]pdf";

export async function loader({ request, context, params }: Route.LoaderArgs) {
  const auth = await requireAuth(request, context);
  const db = createDb(getEnv(context).DB);
  const workspace = await getCustomerWorkspace(db, auth);
  if (!workspace.primary) {
    throw new Response("No organisation", { status: 404 });
  }
  const invoiceId = params.invoiceId.replace(/\.pdf$/i, "");
  const result = await getOrganisationInvoicePdfUrl({
    config: getConfig(context),
    db,
    organisationId: workspace.primary.id,
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
