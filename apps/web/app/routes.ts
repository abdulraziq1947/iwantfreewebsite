import {
  type RouteConfig,
  index,
  layout,
  route,
} from "@react-router/dev/routes";

export default [
  layout("routes/public-layout.tsx", [
    index("routes/home.tsx"),
    route("login", "routes/login.tsx"),
    route("signup", "routes/signup.tsx"),
    route("pricing", "routes/pricing.tsx"),
    route("terms", "routes/terms.tsx"),
    route("privacy", "routes/privacy.tsx"),
    layout("routes/get-started._layout.tsx", [
      route("get-started", "routes/get-started.tsx"),
      route("get-started/account", "routes/get-started.account.tsx"),
      route("get-started/review", "routes/get-started.review.tsx"),
      route("get-started/confirmation", "routes/get-started.confirmation.tsx"),
    ]),
  ]),
  route("logout", "routes/logout.tsx"),
  layout("routes/customer-layout.tsx", [
    route("dashboard", "routes/dashboard.tsx"),
    route("dashboard/onboarding", "routes/dashboard.onboarding.tsx"),
    route("dashboard/website", "routes/dashboard.website.tsx"),
    route("dashboard/billing", "routes/dashboard.billing.tsx"),
    route("dashboard/domain", "routes/dashboard.domain.tsx"),
    route("dashboard/email", "routes/dashboard.email.tsx"),
    route("dashboard/google-business", "routes/dashboard.google-business.tsx"),
    route("dashboard/support", "routes/dashboard.support.tsx"),
    route("dashboard/account", "routes/dashboard.account.tsx"),
  ]),
  layout("routes/admin-layout.tsx", [
    route("admin", "routes/admin._index.tsx"),
  ]),
] satisfies RouteConfig;
