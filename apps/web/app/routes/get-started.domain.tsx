import { Form, Link, redirect, useNavigation } from "react-router";
import { data } from "react-router";
import { createDb, eq, pendingOrders } from "@iwfw/db";
import { getEnv } from "../lib/env.server";
import {
  getOrCreateDraftOrder,
  orderQuestionnaire,
} from "../lib/pending-order.server";
import {
  checkDomainAvailability,
  suggestDomainAlternatives,
  isSupportedDomainName,
  normalizeDomainInput,
  type DomainCheckResult,
} from "../lib/domain-lookup.server";
import { DOMAIN_DISCLAIMER } from "../lib/get-started";
import type { Route } from "./+types/get-started.domain";

export function meta(_args: Route.MetaArgs) {
  return [{ title: "Choose your domain — iwantfreewebsite.com" }];
}

export async function loader({ request, context }: Route.LoaderArgs) {
  const db = createDb(getEnv(context).DB);
  const { order, setCookie } = await getOrCreateDraftOrder(db, request);
  const q = orderQuestionnaire(order);
  if (!q.contact.email || !q.business.tradingName) {
    throw redirect("/get-started/website");
  }
  return data(
    {
      domainMode: order.domainMode || "new",
      domainName: order.domainName || "",
      acknowledged: Boolean(order.domainAcknowledged),
      tradingName: order.tradingName || q.business.tradingName,
      disclaimer: DOMAIN_DISCLAIMER,
    },
    setCookie ? { headers: { "Set-Cookie": setCookie } } : undefined,
  );
}

export async function action({ request, context }: Route.ActionArgs) {
  const db = createDb(getEnv(context).DB);
  const { order } = await getOrCreateDraftOrder(db, request);
  const form = await request.formData();
  const intent = String(form.get("intent") ?? "save");

  if (intent === "check") {
    const query = String(form.get("query") ?? "");
    const normalized = normalizeDomainInput(query);
    const primary = await checkDomainAvailability(query);
    let alternatives: DomainCheckResult[] = [];
    if (primary.tld === null && normalized && !normalized.includes(".")) {
      for (const tld of ["co.uk", "com", "uk"] as const) {
        alternatives.push(
          await checkDomainAvailability(`${normalized}.${tld}`),
        );
      }
    } else if (
      primary.availability === "unavailable" ||
      primary.availability === "invalid"
    ) {
      alternatives = await suggestDomainAlternatives(query);
    }
    return {
      check: primary,
      alternatives,
      domainMode: "new" as const,
      query,
    };
  }

  const mode = String(form.get("domainMode") ?? "new") === "existing" ? "existing" : "new";
  const domainName = normalizeDomainInput(String(form.get("domainName") ?? ""));
  const acknowledged = form.get("acknowledged") === "on";

  if (!domainName) {
    return { error: "Please enter or select a domain." };
  }
  if (!isSupportedDomainName(domainName) && mode === "new") {
    return {
      error: "New domains must end in .co.uk, .com or .uk.",
    };
  }
  if (!acknowledged) {
    return { error: "Please acknowledge that availability is provisional." };
  }

  let lastAvailable: boolean | null = null;
  let lastCheckedAt: Date | null = null;
  if (mode === "new") {
    const recheck = await checkDomainAvailability(domainName);
    lastCheckedAt = new Date();
    if (recheck.availability === "unavailable") {
      return {
        error:
          "That domain no longer appears available. Please choose another or enter a domain you already own.",
        check: recheck,
      };
    }
    lastAvailable = recheck.availability === "available";
  }

  await db
    .update(pendingOrders)
    .set({
      domainMode: mode,
      domainName,
      domainAcknowledged: true,
      domainLastCheckedAt: lastCheckedAt,
      domainLastAvailable: lastAvailable,
      status: "ready_for_checkout",
      updatedAt: new Date(),
    })
    .where(eq(pendingOrders.id, order.id));

  throw redirect("/get-started/review");
}

export default function GetStartedDomain({
  loaderData,
  actionData,
}: Route.ComponentProps) {
  const navigation = useNavigation();
  const busy = navigation.state !== "idle";
  const selectedFromCheck =
    actionData && "check" in actionData && actionData.check?.availability === "available"
      ? actionData.check.domain
      : null;

  return (
    <div className="iwfw-start">
      <header className="iwfw-start__intro">
        <p className="iwfw-start__kicker">Domain selection</p>
        <h1>Find your web address</h1>
        <p className="iwfw-start__lead">
          Search .co.uk, .com or .uk — or tell us a domain you already own. We
          register new domains manually after payment.
        </p>
      </header>

      <section className="iwfw-start__card">
        <Form method="post" className="iwfw-start__form">
          <input type="hidden" name="intent" value="check" />
          <label className="iwfw-field">
            <span>Search a domain</span>
            <input
              name="query"
              placeholder="yourbusiness.co.uk"
              defaultValue={
                (actionData && "query" in actionData && actionData.query) ||
                loaderData.domainName ||
                ""
              }
            />
          </label>
          <button type="submit" className="iwfw-btn iwfw-btn--outline" disabled={busy}>
            {busy ? "Checking…" : "Check availability"}
          </button>
        </Form>

        {actionData && "check" in actionData && actionData.check && (
          <div className="iwfw-domain-result">
            <p>
              <strong>{actionData.check.domain}</strong> — {actionData.check.message}
            </p>
            {actionData.alternatives && actionData.alternatives.length > 0 && (
              <ul className="iwfw-domain-alts">
                {actionData.alternatives.map((alt) => (
                  <li key={alt.domain}>
                    {alt.domain}{" "}
                    <span data-avail={alt.availability}>{alt.availability}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </section>

      <section className="iwfw-start__card">
        <h2>Confirm your choice</h2>
        <Form method="post" className="iwfw-start__form">
          <input type="hidden" name="intent" value="save" />
          <fieldset className="iwfw-fieldset">
            <legend>Domain type</legend>
            <label className="iwfw-check">
              <input
                type="radio"
                name="domainMode"
                value="new"
                defaultChecked={loaderData.domainMode !== "existing"}
              />
              <span>Register a new domain for me (manual after payment)</span>
            </label>
            <label className="iwfw-check">
              <input
                type="radio"
                name="domainMode"
                value="existing"
                defaultChecked={loaderData.domainMode === "existing"}
              />
              <span>I already own a domain</span>
            </label>
          </fieldset>
          <label className="iwfw-field">
            <span>Domain name *</span>
            <input
              name="domainName"
              required
              defaultValue={selectedFromCheck || loaderData.domainName}
              placeholder="yourbusiness.co.uk"
            />
          </label>
          <label className="iwfw-check">
            <input type="checkbox" name="acknowledged" required />
            <span>{loaderData.disclaimer}</span>
          </label>
          {actionData && "error" in actionData && actionData.error && (
            <p className="iwfw-start__error" role="alert">
              {actionData.error}
            </p>
          )}
          <button type="submit" className="iwfw-btn iwfw-btn--green" disabled={busy}>
            Continue to review
          </button>
          <p className="iwfw-start__fine">
            <Link to="/get-started/website">← Website details</Link>
          </p>
        </Form>
      </section>
    </div>
  );
}
