import {
  createDb,
  eq,
  desc,
  organisations,
  onboardingProfiles,
  subscriptions,
  domainRegistrationTasks,
  customerUploads,
  inArray,
} from "@iwfw/db";
import type { AuthContext } from "@iwfw/auth";
import type { WorkerEnvConfig } from "@iwfw/config";
import { newId } from "./ids";
import { parseOnboardingData } from "./onboarding";
import { isBlockingSubscriptionStatus } from "./stripe.server";
import {
  isBriefReady,
  type DomainTaskSnapshot,
} from "./customer-progress";
import { buildAttentionBoard } from "./attention";
import { getOrganisationMailbox } from "./mailbox.server";

export async function getCustomerWorkspace(
  db: ReturnType<typeof createDb>,
  auth: AuthContext,
  config: WorkerEnvConfig,
) {
  const orgIds = auth.memberships.map((m) => m.organisationId);
  const orgs =
    orgIds.length > 0
      ? await db
          .select()
          .from(organisations)
          .where(inArray(organisations.id, orgIds))
      : [];

  const primary = orgs[0] ?? null;
  if (!primary) {
    return {
      orgs: [],
      primary: null,
      onboarding: null,
      domainTask: null as DomainTaskSnapshot,
      needsSubscription: true,
      briefReady: false,
      uploadCount: 0,
      mailbox: null,
      attention: buildAttentionBoard({
        needsSubscription: true,
        briefReady: false,
        domainTask: null,
        data: null,
        uploadCount: 0,
      }),
    };
  }

  let profile = await db
    .select()
    .from(onboardingProfiles)
    .where(eq(onboardingProfiles.organisationId, primary.id))
    .get();

  if (!profile) {
    const id = newId("onb");
    await db.insert(onboardingProfiles).values({
      id,
      organisationId: primary.id,
      currentStep: 0,
      dataJson: "{}",
    });
    profile = await db
      .select()
      .from(onboardingProfiles)
      .where(eq(onboardingProfiles.id, id))
      .get();
  }

  const data = parseOnboardingData(profile?.dataJson);
  const completed = Boolean(profile?.completedAt);
  const briefReady = isBriefReady(data, completed);

  const subscriptionRows = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.organisationId, primary.id))
    .all();
  const subscription =
    subscriptionRows.find((row) => isBlockingSubscriptionStatus(row.status)) ??
    null;

  const hasPaidAccess =
    primary.status === "active" ||
    primary.status === "cancelling" ||
    Boolean(subscription);

  const taskRow = await db
    .select()
    .from(domainRegistrationTasks)
    .where(eq(domainRegistrationTasks.organisationId, primary.id))
    .orderBy(desc(domainRegistrationTasks.createdAt))
    .get();

  const domainTask: DomainTaskSnapshot = taskRow
    ? {
        domainName: taskRow.domainName,
        domainMode: taskRow.domainMode,
        status: taskRow.status,
        registeredAt: taskRow.registeredAt
          ? new Date(taskRow.registeredAt).toISOString()
          : null,
        connectedAt: taskRow.connectedAt
          ? new Date(taskRow.connectedAt).toISOString()
          : null,
        previewUrl: taskRow.previewUrl ?? null,
        liveUrl: taskRow.liveUrl ?? null,
      }
    : null;

  const uploadRows = await db
    .select()
    .from(customerUploads)
    .where(eq(customerUploads.organisationId, primary.id))
    .all();
  const uploadCount = uploadRows.filter((u) => u.status === "ready").length;

  const attention = buildAttentionBoard({
    needsSubscription: !hasPaidAccess,
    briefReady,
    domainTask,
    data,
    uploadCount,
  });

  const mailbox = await getOrganisationMailbox(db, primary.id, config);

  return {
    orgs: orgs.map((o) => ({
      id: o.id,
      tradingName: o.tradingName,
      status: o.status,
    })),
    primary: {
      id: primary.id,
      tradingName: primary.tradingName,
      status: primary.status,
      registeredCompanyName: primary.registeredCompanyName,
    },
    onboarding: profile
      ? {
          id: profile.id,
          currentStep: profile.currentStep,
          completedAt: profile.completedAt
            ? new Date(profile.completedAt).toISOString()
            : null,
          completed,
          data,
        }
      : null,
    domainTask,
    needsSubscription: !hasPaidAccess,
    briefReady,
    uploadCount,
    mailbox,
    attention,
  };
}
