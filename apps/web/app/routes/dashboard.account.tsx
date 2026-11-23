import { Form, Link } from "react-router";
import { Panel } from "@iwfw/ui";
import { requireAuth } from "../lib/session.server";
import { createDb } from "@iwfw/db";
import { getEnv, getConfig } from "../lib/env.server";
import { getCustomerWorkspace } from "../lib/customer-org.server";
import type { Route } from "./+types/dashboard.account";

export function meta(_args: Route.MetaArgs) {
  return [{ title: "Account — iwantfreewebsite" }];
}

export async function loader({ request, context }: Route.LoaderArgs) {
  const auth = await requireAuth(request, context);
  const db = createDb(getEnv(context).DB);
  const workspace = await getCustomerWorkspace(db, auth, getConfig(context));
  return {
    user: { name: auth.name, email: auth.email },
    workspace,
  };
}

export default function AccountPage({ loaderData }: Route.ComponentProps) {
  return (
    <div className="iwfw-dash-page">
      <header className="iwfw-dash-page__header">
        <div>
          <h1>Account</h1>
          <p>Your login details and business profile summary.</p>
        </div>
        <Form method="post" action="/logout">
          <button type="submit" className="iwfw-btn iwfw-btn--outline">
            Log out
          </button>
        </Form>
      </header>

      <div className="iwfw-dash-split">
        <Panel>
          <h2>Profile</h2>
          <dl className="iwfw-dash-dl">
            <div>
              <dt>Name</dt>
              <dd>{loaderData.user.name}</dd>
            </div>
            <div>
              <dt>Email</dt>
              <dd>{loaderData.user.email}</dd>
            </div>
            <div>
              <dt>Business</dt>
              <dd>{loaderData.workspace.primary?.tradingName ?? "—"}</dd>
            </div>
          </dl>
        </Panel>
        <Panel>
          <h2>Security</h2>
          <p className="iwfw-dash-copy">
            Reset your password with a secure one-time email link. You’ll stay
            signed in on this device until you log out.
          </p>
          <Link to="/forgot-password" className="iwfw-btn iwfw-btn--outline">
            Reset password
          </Link>
          <p className="iwfw-dash-fine" style={{ marginTop: "0.75rem" }}>
            Prefer help from a person?{" "}
            <a href="mailto:support@iwantfreewebsite.com">Email support</a>.
          </p>
        </Panel>
      </div>
    </div>
  );
}
