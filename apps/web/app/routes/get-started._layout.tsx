import { Outlet, useLocation, useMatches } from "react-router";
import {
  ChevronIcon,
  OrderDocket,
  StepRail,
  readOrderContext,
} from "../components/start-funnel";
import {
  PACKAGE_PRICE_LABEL,
  PACKAGE_PRICE_PERIOD,
  stepIndex,
} from "../lib/get-started";
import type { Route } from "./+types/get-started._layout";
import "../start.css";

type ShellVariant = "intro" | "step" | "solo";

function shellVariant(pathname: string): ShellVariant {
  const path = pathname.replace(/\/+$/, "");
  if (path === "/get-started") return "intro";
  if (/^\/get-started\/(confirmation|activate|account)\b/.test(path)) {
    return "solo";
  }
  return "step";
}

export default function GetStartedLayout(_props: Route.ComponentProps) {
  const { pathname } = useLocation();
  const matches = useMatches();
  const variant = shellVariant(pathname);
  const order = readOrderContext(matches);

  return (
    <main className={`iwfw-start-shell iwfw-start-shell--${variant}`}>
      <div className="st-wrap">
        {variant === "step" ? <StepRail current={stepIndex(pathname)} /> : null}

        {variant === "solo" ? (
          <div className="st-solo">
            <Outlet />
          </div>
        ) : (
          <div className="st-grid">
            {variant === "step" ? (
              <details className="st-docket-toggle">
                <summary>
                  <span className="st-docket-toggle__label">
                    <span className="st-when-closed">Show</span>
                    <span className="st-when-open">Hide</span> order summary
                    <ChevronIcon />
                  </span>
                  <span className="st-docket-toggle__price">
                    {PACKAGE_PRICE_LABEL}
                    <small>{PACKAGE_PRICE_PERIOD}</small>
                  </span>
                </summary>
                <OrderDocket {...order} />
              </details>
            ) : null}
            <div className="st-main">
              <Outlet />
            </div>
            <aside
              className="st-aside"
              aria-label={variant === "intro" ? "Package summary" : "Order summary"}
            >
              <OrderDocket
                {...order}
                title={variant === "intro" ? "Your package" : "Your order"}
              />
            </aside>
          </div>
        )}
      </div>
    </main>
  );
}
