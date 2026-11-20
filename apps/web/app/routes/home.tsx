import { Link } from "react-router";
import { Button } from "@iwfw/ui";
import type { Route } from "./+types/home";

export function meta(_args: Route.MetaArgs) {
  return [
    { title: "iwantfreewebsite — Managed websites for UK businesses" },
    {
      name: "description",
      content:
        "£39.99/month. No upfront website fee. No minimum contract. Cancel anytime.",
    },
  ];
}

export default function Home() {
  return (
    <main>
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_20%,rgba(13,110,79,0.18),transparent_45%)]" />
        <div className="relative mx-auto flex min-h-[78vh] max-w-6xl flex-col justify-center gap-8 px-4 py-20">
          <p className="font-[family-name:var(--iwfw-font-display)] text-5xl font-bold leading-none text-[var(--iwfw-ink)] sm:text-7xl">
            iwantfreewebsite
          </p>
          <h1 className="max-w-2xl text-3xl font-semibold leading-tight text-[var(--iwfw-ink)] sm:text-4xl">
            A professional website for your UK business, fully managed.
          </h1>
          <p className="max-w-xl text-lg text-[var(--iwfw-muted)]">
            £39.99/month. No upfront website fee. No minimum contract. Cancel
            anytime.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link to="/signup">
              <Button type="button">Get started</Button>
            </Link>
            <Link to="/pricing">
              <Button type="button" variant="secondary">
                See pricing
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
