import { useId } from "react";
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
  const selectId = useId();
  const hintId = useId();
  if (orgs.length <= 1) return null;

  const active = orgs.find((o) => o.id === activeId) ?? orgs[0];

  return (
    <div className="dash-switcher">
      <Form method="get" action={location.pathname} className="dash-switcher__form">
        <label className="dash-switcher__label" htmlFor={selectId}>
          {label}
        </label>
        <select
          id={selectId}
          className="dash-switcher__select"
          name={ACTIVE_ORG_QUERY}
          defaultValue={active?.id ?? ""}
          onChange={(event) => {
            event.currentTarget.form?.requestSubmit();
          }}
          aria-describedby={hintId}
        >
          {orgs.map((org) => (
            <option key={org.id} value={org.id}>
              {org.tradingName}
              {org.domainName ? ` · ${org.domainName}` : ""}
            </option>
          ))}
        </select>
        <noscript>
          <button type="submit" className="dash-btn dash-btn--line dash-btn--sm">
            Switch website
          </button>
        </noscript>
      </Form>
      <p id={hintId} className="dash-switcher__hint">
        {hint ?? (
          <>
            Changes on this page apply to{" "}
            <strong>{active?.tradingName ?? "the selected website"}</strong>{" "}
            only.
          </>
        )}
      </p>
    </div>
  );
}

export function NewWebsiteButton({
  className = "dash-btn dash-btn--line dash-btn--sm",
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
