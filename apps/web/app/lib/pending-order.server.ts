import {
  createDb,
  eq,
  pendingOrders,
} from "@iwfw/db";
import { newId } from "./ids";
import {
  emptyQuestionnaire,
  parseQuestionnaire,
  type OrderQuestionnaire,
} from "./order-questionnaire";

export const ORDER_COOKIE = "iwfw_order";
export const ORDER_TTL_MS = 1000 * 60 * 60 * 24 * 14; // 14 days

type Db = ReturnType<typeof createDb>;

export function orderCookieHeader(resumeToken: string, maxAgeSec: number): string {
  return `${ORDER_COOKIE}=${encodeURIComponent(resumeToken)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAgeSec}`;
}

export function clearOrderCookieHeader(): string {
  return `${ORDER_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}

export function readResumeToken(request: Request): string | null {
  const cookie = request.headers.get("cookie") || "";
  const match = cookie.match(new RegExp(`(?:^|;\\s*)${ORDER_COOKIE}=([^;]+)`));
  return match ? decodeURIComponent(match[1]) : null;
}

export async function getPendingOrderByResumeToken(db: Db, token: string) {
  return db
    .select()
    .from(pendingOrders)
    .where(eq(pendingOrders.resumeToken, token))
    .get();
}

export async function getPendingOrderById(db: Db, id: string) {
  return db.select().from(pendingOrders).where(eq(pendingOrders.id, id)).get();
}

export async function getOrCreateDraftOrder(
  db: Db,
  request: Request,
): Promise<{ order: NonNullable<Awaited<ReturnType<typeof getPendingOrderById>>>; setCookie?: string }> {
  const existingToken = readResumeToken(request);
  if (existingToken) {
    const existing = await getPendingOrderByResumeToken(db, existingToken);
    if (
      existing &&
      existing.status !== "expired" &&
      existing.status !== "paid" &&
      (!existing.expiresAt || existing.expiresAt.getTime() > Date.now())
    ) {
      return { order: existing };
    }
  }

  const id = newId("ord");
  const resumeToken = newId("resume");
  const now = new Date();
  const expiresAt = new Date(now.getTime() + ORDER_TTL_MS);
  await db.insert(pendingOrders).values({
    id,
    resumeToken,
    status: "draft",
    questionnaireJson: JSON.stringify(emptyQuestionnaire()),
    expiresAt,
  });
  const order = await getPendingOrderById(db, id);
  if (!order) throw new Error("Failed to create pending order");
  return {
    order,
    setCookie: orderCookieHeader(resumeToken, Math.floor(ORDER_TTL_MS / 1000)),
  };
}

export function orderQuestionnaire(
  order: { questionnaireJson: string },
): OrderQuestionnaire {
  return parseQuestionnaire(order.questionnaireJson);
}

export async function saveQuestionnaireProgress(options: {
  db: Db;
  orderId: string;
  data: OrderQuestionnaire;
  step: number;
}) {
  const now = new Date();
  await options.db
    .update(pendingOrders)
    .set({
      questionnaireJson: JSON.stringify(options.data),
      questionnaireStep: options.step,
      email: options.data.contact.email.trim().toLowerCase() || null,
      fullName: options.data.contact.fullName.trim() || null,
      phone: options.data.contact.phone.trim() || null,
      tradingName: options.data.business.tradingName.trim() || null,
      updatedAt: now,
    })
    .where(eq(pendingOrders.id, options.orderId));
}
