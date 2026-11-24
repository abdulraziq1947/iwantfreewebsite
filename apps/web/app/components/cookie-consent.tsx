"use client";

import { useEffect, useId, useState, type ReactNode } from "react";
import { Link } from "react-router";
import {
  buildConsent,
  type ConsentState,
  readConsentFromDocumentCookie,
  writeConsentCookie,
} from "../lib/cookie-consent";

type Props = {
  /** Open the preference panel when the URL hash is #cookie-settings */
  openOnHash?: boolean;
};

export function CookieConsentBanner({ openOnHash = true }: Props) {
  const titleId = useId();
  const [ready, setReady] = useState(false);
  const [consent, setConsent] = useState<ConsentState | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);

  useEffect(() => {
    const existing = readConsentFromDocumentCookie(document.cookie);
    setConsent(existing);
    if (existing) {
      setAnalytics(existing.categories.analytics);
      setMarketing(existing.categories.marketing);
    }
    setReady(true);

    if (!openOnHash) return;
    const syncHash = () => {
      if (window.location.hash === "#cookie-settings") {
        setPanelOpen(true);
      }
    };
    syncHash();
    window.addEventListener("hashchange", syncHash);
    return () => window.removeEventListener("hashchange", syncHash);
  }, [openOnHash]);

  useEffect(() => {
    const onOpen = () => setPanelOpen(true);
    window.addEventListener("iwfw:open-cookie-settings", onOpen);
    return () => window.removeEventListener("iwfw:open-cookie-settings", onOpen);
  }, []);

  function persist(next: ConsentState) {
    writeConsentCookie(next);
    setConsent(next);
    setAnalytics(next.categories.analytics);
    setMarketing(next.categories.marketing);
    setPanelOpen(false);
    if (window.location.hash === "#cookie-settings") {
      history.replaceState(null, "", window.location.pathname + window.location.search);
    }
    window.dispatchEvent(
      new CustomEvent("iwfw:consent-updated", { detail: next }),
    );
  }

  function acceptAll() {
    persist(buildConsent({ analytics: true, marketing: true }));
  }

  function rejectNonEssential() {
    persist(buildConsent({ analytics: false, marketing: false }));
  }

  function saveChoices() {
    persist(buildConsent({ analytics, marketing }));
  }

  if (!ready) return null;

  const showBanner = !consent;
  if (!showBanner && !panelOpen) return null;

  return (
    <div className="iwfw-cookie" role="region" aria-labelledby={titleId}>
      <div className="iwfw-cookie__panel">
        <div className="iwfw-cookie__copy">
          <h2 id={titleId}>
            {panelOpen ? "Cookie settings" : "Cookies on this site"}
          </h2>
          <p>
            We use essential cookies to run the site and keep you signed in.
            Optional analytics and marketing cookies stay off unless you switch
            them on. See our{" "}
            <Link to="/cookies">Cookie Policy</Link> and{" "}
            <Link to="/privacy">Privacy Policy</Link>.
          </p>
        </div>

        {panelOpen && (
          <fieldset className="iwfw-cookie__choices">
            <legend className="iwfw-sr-only">Optional cookie categories</legend>
            <label className="iwfw-cookie__choice">
              <input type="checkbox" checked disabled readOnly />
              <span>
                <strong>Essential</strong>
                <em>Always on — login, security, checkout and preferences.</em>
              </span>
            </label>
            <label className="iwfw-cookie__choice">
              <input
                type="checkbox"
                checked={analytics}
                onChange={(e) => setAnalytics(e.target.checked)}
              />
              <span>
                <strong>Analytics</strong>
                <em>
                  Help us understand how the site is used. Off by default; we
                  only load analytics tools if you enable this.
                </em>
              </span>
            </label>
            <label className="iwfw-cookie__choice">
              <input
                type="checkbox"
                checked={marketing}
                onChange={(e) => setMarketing(e.target.checked)}
              />
              <span>
                <strong>Marketing</strong>
                <em>
                  Advertising or remarketing tags if we ever use them. Off by
                  default.
                </em>
              </span>
            </label>
          </fieldset>
        )}

        <div className="iwfw-cookie__actions">
          {panelOpen ? (
            <>
              <button
                type="button"
                className="iwfw-btn iwfw-btn--blue"
                data-testid="cookie-save"
                onClick={saveChoices}
              >
                Save choices
              </button>
              <button
                type="button"
                className="iwfw-btn iwfw-btn--outline"
                data-testid="cookie-reject"
                onClick={rejectNonEssential}
              >
                Reject non-essential
              </button>
              <button
                type="button"
                className="iwfw-btn iwfw-btn--outline"
                data-testid="cookie-accept"
                onClick={acceptAll}
              >
                Accept all
              </button>
            </>
          ) : (
            <>
              {/* Equal prominence for Accept / Reject (ICO PECR guidance). */}
              <button
                type="button"
                className="iwfw-btn iwfw-btn--outline"
                data-testid="cookie-reject"
                onClick={rejectNonEssential}
              >
                Reject non-essential
              </button>
              <button
                type="button"
                className="iwfw-btn iwfw-btn--outline"
                data-testid="cookie-accept"
                onClick={acceptAll}
              >
                Accept all
              </button>
              <button
                type="button"
                className="iwfw-btn iwfw-btn--blue"
                data-testid="cookie-manage"
                onClick={() => setPanelOpen(true)}
              >
                Manage cookies
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/** Footer / settings control that re-opens the preference centre. */
export function CookieSettingsButton({
  className,
  children = "Cookie settings",
}: {
  className?: string;
  children?: ReactNode;
}) {
  return (
    <button
      type="button"
      className={className}
      onClick={() => {
        window.dispatchEvent(new Event("iwfw:open-cookie-settings"));
        if (window.location.hash !== "#cookie-settings") {
          window.location.hash = "cookie-settings";
        }
      }}
    >
      {children}
    </button>
  );
}
