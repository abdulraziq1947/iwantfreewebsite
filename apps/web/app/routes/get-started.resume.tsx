import { redirect } from "react-router";
import { createDb, eq, pendingOrders } from "@iwfw/db";
import { getEnv } from "../lib/env.server";
import { unpaidOrderResumePath } from "../lib/order-questionnaire";
import {
  cookieMaxAgeSecFromExpiry,
  getPendingOrderByResumeToken,
  isUnpaidFunnelStatus,
  orderCookieHeader,
  revivedUnpaidOrderStatus,
  unpaidOrderNeedsRevive,
} from "../lib/pending-order.server";
import type { Route } from "./+types/get-started.resume";

/**
 * Magic link from a staff reminder: bind the saved order cookie and continue
 * the funnel. Never logs the token.
 */
export async function loader({ request, context }: Route.LoaderArgs) {
  const token = new URL(request.url).searchParams.get("token")?.trim() || "";
  const start = "/get-started";
  if (!token) throw redirect(start);

  const db = createDb(getEnv(context).DB);
  const order = await getPendingOrderByResumeToken(db, token);
  if (!order) throw redirect(start);

  if (order.status === "paid") {
    throw redirect("/get-started/account?mode=login");
  }

  const now = Date.now();
  if (!isUnpaidFunnelStatus(order.status) || order.expiresAt.getTime() <= now) {
    throw redirect(start);
  }

  let status = order.status;
  if (unpaidOrderNeedsRevive(order.status)) {
    status = revivedUnpaidOrderStatus(order);
    await db
      .update(pendingOrders)
      .set({ status, updatedAt: new Date(now) })
      .where(eq(pendingOrders.id, order.id));
  }

  const path = unpaidOrderResumePath({
    status,
    questionnaireStep: order.questionnaireStep,
  });
  throw redirect(path, {
    headers: {
      "Set-Cookie": orderCookieHeader(
        order.resumeToken,
        cookieMaxAgeSecFromExpiry(order.expiresAt, now),
      ),
    },
  });
}

export default function GetStartedResumeRedirect() {
  return null;
}
