import { Link } from "react-router";
import { Button, Panel } from "@iwfw/ui";
import type { Route } from "./+types/pricing";

export function meta(_args: Route.MetaArgs) {
  return [{ title: "Pricing — iwantfreewebsite" }];
}

export default function Pricing() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-16">
      <h1 className="text-4xl font-bold">Simple monthly pricing</h1>
      <p className="mt-3 text-[var(--iwfw-muted)]">
        No upfront website fee. No minimum contract. Cancel anytime.
      </p>
      <Panel className="mt-10">
        <p className="text-sm font-semibold uppercase tracking-wide text-[var(--iwfw-accent)]">
          Core package
        </p>
        <p className="mt-2 font-[family-name:var(--iwfw-font-display)] text-5xl font-bold">
          £39.99
          <span className="text-lg font-sans font-semibold text-[var(--iwfw-muted)]">
            /month
          </span>
        </p>
        <ul className="mt-6 space-y-2 text-[var(--iwfw-muted)]">
          <li>Professional managed website</li>
          <li>Hosting, maintenance and support</li>
          <li>Domain help (manual purchase by our team after payment)</li>
          <li>One business email mailbox</li>
          <li>Weekly Google Business Profile posting (manual)</li>
        </ul>
        <p className="mt-6 text-sm text-[var(--iwfw-muted)]">
          Optional Google Rank Tracking (£9.99/month) will be offered only once
          that feature is operational.
        </p>
        <div className="mt-8">
          <Link to="/signup">
            <Button type="button">Start signup</Button>
          </Link>
        </div>
      </Panel>
    </main>
  );
}
