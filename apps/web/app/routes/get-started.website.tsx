import { redirect } from "react-router";
import { createDb } from "@iwfw/db";
import { getEnv } from "../lib/env.server";
import { getOrCreateDraftOrder } from "../lib/pending-order.server";
import { questionnaireResumePath } from "../lib/order-questionnaire";
import type { Route } from "./+types/get-started.website";

/** Legacy URL — send customers to the right step in the new funnel. */
export async function loader({ request, context }: Route.LoaderArgs) {
  const db = createDb(getEnv(context).DB);
  const { order, setCookie } = await getOrCreateDraftOrder(db, request);
  throw redirect(questionnaireResumePath(order.questionnaireStep), {
    headers: setCookie ? { "Set-Cookie": setCookie } : undefined,
  });
}

export default function GetStartedWebsiteRedirect(_props: Route.ComponentProps) {
  return null;
}
