import { data } from "react-router";
import { Panel } from "@iwfw/ui";
import { MediaUploader } from "../components/media-uploader";
import { requireAuth } from "../lib/session.server";
import { loadCustomerWorkspace } from "../lib/customer-workspace.server";
import {
  NewWebsiteButton,
  WebsiteSwitcher,
} from "../components/website-switcher";
import type { Route } from "./+types/dashboard.media";

export function meta(_args: Route.MetaArgs) {
  return [{ title: "Images — iwantfreewebsite" }];
}

export async function loader({ request, context }: Route.LoaderArgs) {
  const auth = await requireAuth(request, context);
  const { workspace, headers } = await loadCustomerWorkspace(
    request,
    context,
    auth,
  );
  return data(
    {
      organisationId: workspace.primary?.id ?? null,
      tradingName: workspace.primary?.tradingName ?? null,
      orgs: workspace.orgs,
    },
    headers ? { headers } : undefined,
  );
}

export default function DashboardMediaPage({
  loaderData,
}: Route.ComponentProps) {
  const { organisationId, tradingName, orgs } = loaderData;

  return (
    <div className="iwfw-dash-page">
      <header className="iwfw-dash-page__header">
        <div>
          <h1>Images</h1>
          <p>
            Upload logos and photos for the selected website. Our build team
            only uses files linked to that site.
          </p>
        </div>
        {orgs.length > 0 ? <NewWebsiteButton /> : null}
      </header>

      <WebsiteSwitcher
        orgs={orgs}
        activeId={organisationId}
        hint="Choose which website these images belong to before uploading."
      />

      {!organisationId ? (
        <Panel>
          <h2>No business yet</h2>
          <p className="iwfw-dash-copy">
            Finish checkout and account activation first. Images you uploaded
            during Get Started are linked automatically after payment.
          </p>
        </Panel>
      ) : (
        <Panel key={organisationId}>
          <MediaUploader
            mode="organisation"
            organisationId={organisationId}
            title={
              tradingName
                ? `Images for ${tradingName}`
                : "Your website images"
            }
            description="Add or replace logos, business photos, team shots and portfolio images for this website only. Files are private and served only through authorised links."
          />
        </Panel>
      )}
    </div>
  );
}
