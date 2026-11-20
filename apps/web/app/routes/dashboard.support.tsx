import { Panel } from "@iwfw/ui";
import type { Route } from "./+types/dashboard.support";

export function meta(_args: Route.MetaArgs) {
  return [{ title: "Support — iwantfreewebsite" }];
}

export default function SupportPage(_props: Route.ComponentProps) {
  return (
    <div className="iwfw-dash-page">
      <header className="iwfw-dash-page__header">
        <div>
          <h1>Support</h1>
          <p>Talk to a real person when you need help with your website or account.</p>
        </div>
      </header>

      <div className="iwfw-dash-split">
        <Panel>
          <h2>Call us</h2>
          <p className="iwfw-dash-copy">Prefer to talk it through? We’re on the phone.</p>
          <a href="tel:08008527267" className="iwfw-btn iwfw-btn--blue">
            0800 852 7267
          </a>
        </Panel>
        <Panel>
          <h2>Email support</h2>
          <p className="iwfw-dash-copy">
            Send account, billing, or website questions and we’ll get back to you.
          </p>
          <a
            href="mailto:support@iwantfreewebsite.com"
            className="iwfw-btn iwfw-btn--outline"
          >
            support@iwantfreewebsite.com
          </a>
          <p className="iwfw-dash-fine">
            In-app support tickets are coming next. Until then, phone and email
            are the fastest routes.
          </p>
        </Panel>
      </div>
    </div>
  );
}
