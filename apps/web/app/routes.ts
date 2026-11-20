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
  ]),
  layout("routes/customer-layout.tsx", [
    route("dashboard", "routes/dashboard.tsx"),
  ]),
  layout("routes/admin-layout.tsx", [
    route("admin", "routes/admin._index.tsx"),
  ]),
] satisfies RouteConfig;
