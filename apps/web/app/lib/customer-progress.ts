import type { OnboardingData } from "./onboarding";

export type DomainTaskSnapshot = {
  domainName: string;
  domainMode: "new" | "existing";
  status: string;
  registeredAt: string | null;
  connectedAt: string | null;
} | null;

export type JourneyStage = {
  id: string;
  title: string;
  detail: string;
  state: "done" | "current" | "upcoming";
};

export type CustomerAction = {
  id: string;
  title: string;
  body: string;
  to: string;
  cta: string;
  tone: "primary" | "secondary";
};

export function domainTaskLabel(status: string | undefined): string {
  switch (status) {
    case "pending":
      return "Queued for our team";
    case "in_progress":
      return "In progress";
    case "registered":
      return "Registered — connecting DNS";
    case "connected":
      return "Connected";
    case "unavailable":
      return "Unavailable — we’ll contact you";
    case "cancelled":
      return "Cancelled";
    default:
      return status ? status.replaceAll("_", " ") : "Not started";
  }
}

export function websiteStageLabel(options: {
  needsSubscription: boolean;
  domainStatus?: string | null;
  briefReady: boolean;
}): string {
  if (options.needsSubscription) return "Awaiting payment";
  if (!options.briefReady) return "Brief incomplete";
  switch (options.domainStatus) {
    case "connected":
      return "Finishing build";
    case "registered":
    case "in_progress":
      return "Building your website";
    case "unavailable":
      return "Domain needs attention";
    case "pending":
    default:
      return "Brief received — build queued";
  }
}

/** Brief is ready once payment questionnaire (or legacy onboarding) has core fields. */
export function isBriefReady(
  data: OnboardingData | null | undefined,
  completed: boolean,
): boolean {
  if (completed) return true;
  if (!data) return false;
  return Boolean(
    data.business.tradingName.trim() &&
      (data.domain.preferredDomain.trim() ||
        data.domain.existingDomain.trim() ||
        data.domain.mode),
  );
}

export function buildJourneyStages(options: {
  needsSubscription: boolean;
  briefReady: boolean;
  domainTask: DomainTaskSnapshot;
}): JourneyStage[] {
  const { needsSubscription, briefReady, domainTask } = options;
  const domainStatus = domainTask?.status;
  const domainDone =
    domainStatus === "connected" || domainStatus === "registered";
  const domainCurrent =
    !needsSubscription &&
    briefReady &&
    Boolean(domainTask) &&
    !domainDone &&
    domainStatus !== "cancelled";
  const buildCurrent =
    !needsSubscription &&
    briefReady &&
    (domainDone || domainStatus === "in_progress");
  const liveDone = domainStatus === "connected";

  const paymentState: JourneyStage["state"] = needsSubscription
    ? "current"
    : "done";
  const briefState: JourneyStage["state"] = needsSubscription
    ? "upcoming"
    : briefReady
      ? "done"
      : "current";
  const domainState: JourneyStage["state"] = needsSubscription
    ? "upcoming"
    : !briefReady
      ? "upcoming"
      : domainDone
        ? "done"
        : domainCurrent
          ? "current"
          : "upcoming";
  const buildState: JourneyStage["state"] = needsSubscription
    ? "upcoming"
    : liveDone
      ? "done"
      : buildCurrent
        ? "current"
        : domainDone
          ? "current"
          : "upcoming";
  const liveState: JourneyStage["state"] = liveDone ? "done" : "upcoming";

  return [
    {
      id: "payment",
      title: "Payment confirmed",
      detail: needsSubscription
        ? "Subscribe to start your website package."
        : "Your £39.99/month plan is active.",
      state: paymentState,
    },
    {
      id: "brief",
      title: "Website brief received",
      detail: briefReady
        ? "We already have your questionnaire answers from checkout."
        : "We’ll use the details you submitted when you ordered.",
      state: briefState,
    },
    {
      id: "domain",
      title:
        domainTask?.domainMode === "existing"
          ? "Connect your domain"
          : "Register your domain",
      detail: domainTask
        ? `${domainTask.domainName} — ${domainTaskLabel(domainTask.status)}`
        : "Our team handles purchase and DNS manually after payment.",
      state: domainState,
    },
    {
      id: "build",
      title: "We build your website",
      detail: liveDone
        ? "Build complete — finishing launch checks."
        : buildCurrent
          ? "Designers are working from your brief, photos and domain."
          : "Starts once payment and your brief are in — usually alongside domain work.",
      state: buildState,
    },
    {
      id: "live",
      title: "Go live",
      detail: liveDone
        ? "Your site is connected. Ask support if you need the live URL."
        : "We’ll share a preview for approval, then put the site live.",
      state: liveState,
    },
  ];
}

export function buildCustomerActions(options: {
  needsSubscription: boolean;
  briefReady: boolean;
  domainTask: DomainTaskSnapshot;
  data: OnboardingData | null | undefined;
}): CustomerAction[] {
  const actions: CustomerAction[] = [];
  if (options.needsSubscription) {
    actions.push({
      id: "subscribe",
      title: "Start your website plan",
      body: "£39.99/month · £0 upfront design fee. Cancel anytime at period end.",
      to: "/get-started",
      cta: "View package",
      tone: "primary",
    });
    return actions;
  }

  const gbpDone = Boolean(options.data?.gbp.outcome);
  const emailSet = Boolean(options.data?.email.localPart?.trim());

  if (!gbpDone) {
    actions.push({
      id: "gbp",
      title: "Invite us to Google Business",
      body: "Add our manager email so we can post weekly and help with reviews.",
      to: "/dashboard/google-business",
      cta: "Open Google Business",
      tone: "primary",
    });
  }

  if (!emailSet) {
    actions.push({
      id: "email",
      title: "Choose your business email",
      body: "Tell us the mailbox you want (for example info@) once the domain is ready.",
      to: "/dashboard/email",
      cta: "Set email preference",
      tone: gbpDone ? "primary" : "secondary",
    });
  }

  actions.push({
    id: "images",
    title: "Add or update images",
    body: "Upload extra logos, photos or project images anytime — they stay private.",
    to: "/dashboard/media",
    cta: "Manage images",
    tone: "secondary",
  });

  if (options.domainTask?.status === "unavailable") {
    actions.unshift({
      id: "domain-help",
      title: "Domain needs a decision",
      body: "Your preferred domain looks unavailable. Contact us to pick another.",
      to: "/dashboard/support",
      cta: "Contact support",
      tone: "primary",
    });
  }

  actions.push({
    id: "add-site",
    title: "Add another website",
    body: "Start a new questionnaire and subscription for a second business or brand.",
    to: "/get-started?new=1",
    cta: "Add another site",
    tone: "secondary",
  });

  return actions;
}

export function currentFocusCopy(stages: JourneyStage[]): {
  title: string;
  body: string;
} {
  const current = stages.find((s) => s.state === "current") ?? stages[0];
  return {
    title: current?.title ?? "You’re all set",
    body: current?.detail ?? "There’s nothing you need to do right now.",
  };
}
