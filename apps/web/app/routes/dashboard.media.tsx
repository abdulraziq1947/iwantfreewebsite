import { Panel } from "@iwfw/ui";
import { createDb } from "@iwfw/db";
import { MediaUploader } from "../components/media-uploader";
import {getEnv, getConfig} from "../lib/env.server";
import { requireAuth } from "../lib/session.server";
import { getCustomerWorkspace } from "../lib/customer-org.server";
import type { Route } from "./+types/dashboard.media";

export function meta(_args: Route.MetaArgs) {
  return [{ title: "Images — iwantfreewebsite" }];
}

export async function loader({ request, context }: Route.LoaderArgs) {
  const auth = await requireAuth(request, context);
  const db = createDb(getEnv(context).DB);
  const workspace = await getCustomerWorkspace(db, auth, getConfig(context));
  return {
    organisationId: workspace.primary?.id ?? null,
    tradingName: workspace.primary?.tradingName ?? null,
  };
}

export default function DashboardMediaPage({
  loaderData,
}: Route.ComponentProps) {
  const { organisationId, tradingName } = loaderData;

  return (
    <div className="iwfw-dash-page">
      <header className="iwfw-dash-page__header">
        <div>
          <h1>Images</h1>
          <p>
            Manage logos and photos for{" "}
            {tradingName ? <strong>{tradingName}</strong> : "your website"}.
            Only you and our build team can view these files.
          </p>
        </div>
      </header>

      {!organisationId ? (
        <Panel>
          <h2>No business yet</h2>
          <p className="iwfw-dash-copy">
            Finish checkout and account activation first. Images you uploaded
            during Get Started are linked automatically after payment.
          </p>
        </Panel>
      ) : (
        <Panel>
          <MediaUploader
            mode="organisation"
            organisationId={organisationId}
            title="Your website images"
            description="Add or replace logos, business photos, team shots and portfolio images. Files are private and served only through authorised links."
          />
        </Panel>
      )}
    </div>
  );
}
