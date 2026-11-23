import { Form, Link, useLocation } from "react-router";
import { ACTIVE_ORG_QUERY } from "../lib/active-org";

export type WebsiteOption = {
  id: string;
  tradingName: string;
  domainName?: string | null;
  status?: string;
};

/**
 * Lets multi-site customers pick which website images / GMB / dashboard
 * actions apply to. Submits as GET `?org=` so loaders can scope data.
 */
export function WebsiteSwitcher({
  orgs,
  activeId,
  label = "Website",
  hint,
}: {
  orgs: WebsiteOption[];
  activeId: string | null | undefined;
  label?: string;
  hint?: string;
}) {
  const location = useLocation();
  if (orgs.length <= 1) return null;

  const active = orgs.find((o) => o.id === activeId) ?? orgs[0];

  return (
    <div className="iwfw-site-switcher">
      <Form method="get" action={location.pathname} className="iwfw-site-switcher__form">
        {/* Preserve unrelated query params if needed later; org is the selector. */}
        <label className="iwfw-site-switcher__label">
          <span>{label}</span>
          <select
            className="iwfw-control"
            name={ACTIVE_ORG_QUERY}
            defaultValue={active?.id ?? ""}
            onChange={(event) => {
              event.currentTarget.form?.requestSubmit();
            }}
            aria-describedby={hint ? "iwfw-site-switcher-hint" : undefined}
          >
            {orgs.map((org) => (
              <option key={org.id} value={org.id}>
                {org.tradingName}
                {org.domainName ? ` · ${org.domainName}` : ""}
              </option>
            ))}
          </select>
        </label>
        <noscript>
          <button type="submit" className="iwfw-btn iwfw-btn--outline iwfw-btn--sm">
            Switch website
          </button>
        </noscript>
      </Form>
      {hint ? (
        <p id="iwfw-site-switcher-hint" className="iwfw-site-switcher__hint">
          {hint}
        </p>
      ) : (
        <p className="iwfw-site-switcher__hint">
          Changes on this page apply to{" "}
          <strong>{active?.tradingName ?? "the selected website"}</strong> only.
        </p>
      )}
    </div>
  );
}

export function NewWebsiteButton({
  className = "iwfw-btn iwfw-btn--outline",
  children = "New website",
}: {
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <Link to="/get-started?new=1" className={className}>
      {children}
    </Link>
  );
}
