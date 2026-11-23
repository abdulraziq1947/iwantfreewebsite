import { redirect } from "react-router";
import type { Route } from "./+types/dashboard.onboarding";

/**
 * FB-11: Progress duplicated Overview journey stages.
 * Keep the deep link but send customers to the Overview home.
 */
export async function loader(_args: Route.LoaderArgs) {
  throw redirect("/dashboard");
}

export default function ProgressRedirect() {
  return null;
}
