import {
  hashPassword,
  generateRandomString,
} from "@iwfw/auth";
import {
  createDb,
  eq,
  and,
  or,
  organisations,
  memberships,
  onboardingProfiles,
  pendingOrders,
  domainRegistrationTasks,
  accountActivationTokens,
  user,
  account,
  checkoutSessions,
} from "@iwfw/db";
import type { WorkerEnvConfig } from "@iwfw/config";
import type Stripe from "stripe";
import { newId } from "./ids";
import { log } from "./logger";
import { parseQuestionnaire } from "./order-questionnaire";
import { emptyOnboardingData } from "./onboarding";
import { upsertSubscriptionFromStripe } from "./billing.server";
import { associateUploadsWithOrganisation } from "./uploads.server";

type Db = ReturnType<typeof createDb>;

async function sha256Hex(value: string): Promise<string> {
  const data = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(digest)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function mapQuestionnaireToOnboarding(raw: string) {
  const q = parseQuestionnaire(raw);
  const base = emptyOnboardingData();
  return {
    ...base,
    business: {
      ...base.business,
      tradingName: q.business.tradingName,
      contactName: q.contact.fullName,
      phone: q.contact.phone,
      email: q.contact.email,
      address: q.business.address,
      serviceAreas: q.business.serviceAreas,
      description: q.about.introduction,
    },
    services: {
      ...base.services,
      list: q.services.list,
      prices: "",
      locations: q.business.serviceAreas,
      offers: "",
      usps: q.services.descriptions,
    },
    branding: {
      ...base.branding,
      brandColours: q.website.colours,
      socials: q.media.socialLinks,
      exampleSites: q.website.exampleWebsites,
      mediaNotes: [q.media.logoNotes, q.media.imageNotes, q.media.uploadNotes]
        .filter(Boolean)
        .join("\n"),
    },
    website: {
      ...base.website,
      style: q.website.designPreferences,
      pages: q.website.preferredPages,
      existingWebsite: q.about.existingWebsite,
      testimonials: "",
    },
    gbp: {
      ...base.gbp,
      profileUrl: q.media.gbpLink,
    },
  };
}

/**
 * After verified Stripe payment: create/link user + org, copy questionnaire,
 * create domain registration task, issue activation token.
 * Idempotent when called again for the same paid order.
 */
export async function fulfillPaidPendingOrder(options: {
  db: Db;
  config: WorkerEnvConfig;
  pendingOrderId: string;
  stripeSession: Stripe.Checkout.Session;
  stripeSubscription?: Stripe.Subscription | null;
}): Promise<{
  organisationId: string;
  userId: string;
  activationToken: string | null;
  activationTokenId: string | null;
  createdDomainTask: boolean;
}> {
  const order = await options.db
    .select()
    .from(pendingOrders)
    .where(eq(pendingOrders.id, options.pendingOrderId))
    .get();
  if (!order) throw new Error("Pending order not found");

  // Already fulfilled
  if (order.status === "paid" && order.organisationId && order.userId) {
    await ensureDomainRegistrationTask({
      db: options.db,
      organisationId: order.organisationId,
      pendingOrderId: order.id,
      domainName: order.domainName || "pending.example",
      domainMode: (order.domainMode as "new" | "existing") || "new",
    });
    if (options.stripeSubscription) {
      await upsertSubscriptionFromStripe({
        db: options.db,
        organisationId: order.organisationId,
        stripeSubscription: options.stripeSubscription,
      });
    }
    await associateUploadsWithOrganisation({
      db: options.db,
      pendingOrderId: order.id,
      organisationId: order.organisationId,
    });
    return {
      organisationId: order.organisationId,
      userId: order.userId,
      activationToken: null,
      activationTokenId: null,
      createdDomainTask: false,
    };
  }

  const email = (order.email || options.stripeSession.customer_details?.email || "")
    .trim()
    .toLowerCase();
  const fullName =
    order.fullName ||
    options.stripeSession.customer_details?.name ||
    "Customer";
  const tradingName = order.tradingName || fullName;
  if (!email) throw new Error("Paid order missing email");

  const customerId =
    typeof options.stripeSession.customer === "string"
      ? options.stripeSession.customer
      : options.stripeSession.customer?.id || null;

  let existingUser = await options.db
    .select()
    .from(user)
    .where(eq(user.email, email))
    .get();

  let userId = existingUser?.id;
  let activationToken: string | null = null;
  let activationTokenId: string | null = null;

  if (!userId) {
    userId = newId("user");
    const now = new Date();
    const tempPassword = generateRandomString(32);
    const hashed = await hashPassword(tempPassword);
    await options.db.insert(user).values({
      id: userId,
      name: fullName,
      email,
      emailVerified: true,
      phone: order.phone || null,
      createdAt: now,
      updatedAt: now,
    });
    await options.db.insert(account).values({
      id: newId("acc"),
      accountId: userId,
      providerId: "credential",
      userId,
      password: hashed,
      createdAt: now,
      updatedAt: now,
    });
  }

  // Each paid order gets its own organisation so “add another site” works.
  let organisationId = order.organisationId;
  if (!organisationId) {
    organisationId = newId("org");
    await options.db.insert(organisations).values({
      id: organisationId,
      tradingName,
      status: "active",
      stripeCustomerId: customerId,
    });
    await options.db.insert(memberships).values({
      id: newId("mem"),
      organisationId,
      userId,
      role: "customer",
    });
  } else {
    await options.db
      .update(organisations)
      .set({
        tradingName,
        status: "active",
        ...(customerId ? { stripeCustomerId: customerId } : {}),
        updatedAt: new Date(),
      })
      .where(eq(organisations.id, organisationId));
  }

  const onboardingData = mapQuestionnaireToOnboarding(order.questionnaireJson);
  if (order.domainMode && order.domainName) {
    onboardingData.domain = {
      ...onboardingData.domain,
      mode: order.domainMode,
      preferredDomain: order.domainMode === "new" ? order.domainName : "",
      existingDomain: order.domainMode === "existing" ? order.domainName : "",
      acknowledgedNoGuarantee: Boolean(order.domainAcknowledged),
    };
  }
  if (order.termsVersion) {
    onboardingData.checkout = {
      ...onboardingData.checkout,
      termsVersion: order.termsVersion,
      termsAcceptedAt: order.termsAcceptedAt
        ? new Date(order.termsAcceptedAt).toISOString()
        : "",
      marketingOptIn: Boolean(order.marketingOptIn),
    };
  }

  // Questionnaire at checkout is the brief — do not send customers through it again.
  const briefCompletedAt = new Date();
  const existingProfile = await options.db
    .select()
    .from(onboardingProfiles)
    .where(eq(onboardingProfiles.organisationId, organisationId))
    .get();
  if (existingProfile) {
    await options.db
      .update(onboardingProfiles)
      .set({
        dataJson: JSON.stringify(onboardingData),
        currentStep: 7,
        completedAt: existingProfile.completedAt ?? briefCompletedAt,
        updatedAt: new Date(),
      })
      .where(eq(onboardingProfiles.id, existingProfile.id));
  } else {
    await options.db.insert(onboardingProfiles).values({
      id: newId("onb"),
      organisationId,
      currentStep: 7,
      completedAt: briefCompletedAt,
      dataJson: JSON.stringify(onboardingData),
    });
  }

  if (options.stripeSubscription) {
    await upsertSubscriptionFromStripe({
      db: options.db,
      organisationId,
      stripeSubscription: options.stripeSubscription,
    });
  }

  if (options.stripeSession.id) {
    const existingCs = await options.db
      .select()
      .from(checkoutSessions)
      .where(eq(checkoutSessions.stripeSessionId, options.stripeSession.id))
      .get();
    if (!existingCs) {
      await options.db.insert(checkoutSessions).values({
        id: newId("cs"),
        organisationId,
        stripeSessionId: options.stripeSession.id,
        stripePriceId:
          order.stripePriceId || options.config.STRIPE_PRICE_ID || "price_unknown",
        status: "complete",
      });
    }
  }

  const domainTask = await ensureDomainRegistrationTask({
    db: options.db,
    organisationId,
    pendingOrderId: order.id,
    domainName: order.domainName || "unspecified",
    domainMode: (order.domainMode as "new" | "existing") || "new",
  });

  // Issue activation token for new users (never log the raw token)
  if (!existingUser && userId) {
    activationToken = generateRandomString(48);
    activationTokenId = newId("act");
    const tokenHash = await sha256Hex(activationToken);
    await options.db.insert(accountActivationTokens).values({
      id: activationTokenId,
      userId,
      organisationId,
      pendingOrderId: order.id,
      tokenHash,
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 48),
      emailSendCount: 0,
    });
    log("info", "account_activation_token_created", {
      userId,
      organisationId,
      tokenId: activationTokenId,
    });
  }

  if (!userId || !organisationId) {
    throw new Error("Fulfillment failed to resolve user/organisation");
  }

  await options.db
    .update(pendingOrders)
    .set({
      status: "paid",
      organisationId,
      userId,
      stripeCustomerId: customerId,
      paidAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(pendingOrders.id, order.id));

  await associateUploadsWithOrganisation({
    db: options.db,
    pendingOrderId: order.id,
    organisationId,
  });

  return {
    organisationId,
    userId,
    activationToken,
    activationTokenId,
    createdDomainTask: domainTask === "created",
  };
}

export async function ensureDomainRegistrationTask(options: {
  db: Db;
  organisationId: string;
  pendingOrderId: string;
  domainName: string;
  domainMode: "new" | "existing";
}): Promise<"created" | "exists"> {
  const open = await options.db
    .select()
    .from(domainRegistrationTasks)
    .where(
      and(
        eq(domainRegistrationTasks.organisationId, options.organisationId),
        or(
          eq(domainRegistrationTasks.status, "pending"),
          eq(domainRegistrationTasks.status, "in_progress"),
          eq(domainRegistrationTasks.status, "registered"),
        ),
      ),
    )
    .get();
  if (open) return "exists";
  try {
    await options.db.insert(domainRegistrationTasks).values({
      id: newId("domtask"),
      organisationId: options.organisationId,
      pendingOrderId: options.pendingOrderId,
      domainName: options.domainName,
      domainMode: options.domainMode,
      status: "pending",
    });
    return "created";
  } catch {
    return "exists";
  }
}

export async function consumeActivationToken(options: {
  db: Db;
  token: string;
  password: string;
}): Promise<{ ok: true; email: string } | { ok: false; error: string }> {
  if (options.password.length < 10) {
    return { ok: false, error: "Password must be at least 10 characters." };
  }
  const tokenHash = await sha256Hex(options.token);
  const row = await options.db
    .select()
    .from(accountActivationTokens)
    .where(eq(accountActivationTokens.tokenHash, tokenHash))
    .get();
  if (!row || row.usedAt) {
    return { ok: false, error: "This activation link is invalid or already used." };
  }
  if (row.expiresAt.getTime() < Date.now()) {
    return { ok: false, error: "This activation link has expired." };
  }

  const hashed = await hashPassword(options.password);
  const now = new Date();
  const cred = await options.db
    .select()
    .from(account)
    .where(
      and(
        eq(account.userId, row.userId),
        eq(account.providerId, "credential"),
      ),
    )
    .get();
  if (cred) {
    await options.db
      .update(account)
      .set({ password: hashed, updatedAt: now })
      .where(eq(account.id, cred.id));
  } else {
    await options.db.insert(account).values({
      id: newId("acc"),
      accountId: row.userId,
      providerId: "credential",
      userId: row.userId,
      password: hashed,
      createdAt: now,
      updatedAt: now,
    });
  }

  await options.db
    .update(accountActivationTokens)
    .set({ usedAt: now })
    .where(eq(accountActivationTokens.id, row.id));

  const u = await options.db
    .select()
    .from(user)
    .where(eq(user.id, row.userId))
    .get();
  return { ok: true, email: u?.email || "" };
}
