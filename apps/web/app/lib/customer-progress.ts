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

export type StatusBanner = {
  kicker: string;
  title: string;
  body: string;
  meta?: string;
};

export function domainTaskLabel(status: string | undefined): string {
  switch (status) {
    case "pending":
      return "Queued with our team";
    case "in_progress":
      return "In progress with our team";
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
      return "Almost live";
    case "registered":
    case "in_progress":
      return "We’re building it";
    case "unavailable":
      return "Domain needs attention";
    case "pending":
    default:
      return "We’re on it";
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

export function needsGbpInvite(
  data: OnboardingData | null | undefined,
): boolean {
  return !Boolean(data?.gbp.outcome);
}

export function buildStatusBanner(options: {
  needsSubscription: boolean;
  briefReady: boolean;
  domainTask: DomainTaskSnapshot;
  tradingName?: string | null;
}): StatusBanner {
  const name = options.tradingName?.trim() || "Your business";
  const domain = options.domainTask?.domainName;

  if (options.needsSubscription) {
    return {
      kicker: "Next step",
      title: "Choose your website plan",
      body: "Subscribe for £39.99/month to start domain setup and website build.",
      meta: name,
    };
  }

  if (!options.briefReady) {
    return {
      kicker: "Almost ready",
      title: "We’re missing a few order details",
      body: "Contact support and we’ll sort this quickly — you shouldn’t need to fill the questionnaire again.",
      meta: name,
    };
  }

  if (options.domainTask?.status === "unavailable") {
    return {
      kicker: "Needs a quick decision",
      title: "Your preferred domain looks unavailable",
      body: "Nothing else is blocked on the brief — message us and we’ll help pick another name.",
      meta: domain ? `${name} · ${domain}` : name,
    };
  }

  if (options.domainTask?.status === "connected") {
    return {
      kicker: "You’re all set",
      title: "Nothing more for you to do right now",
      body: "Your domain is connected and we’re finishing launch. We’ll get back to you when the site is ready.",
      meta: domain ? `${name} · ${domain}` : name,
    };
  }

  return {
    kicker: "You’re all set",
    title: "Nothing more for you to do right now",
    body: domain
      ? `We’ve got your brief and ${domain} is with our team. We’ll start work shortly and get back to you once the website is live.`
      : "We’ve got your brief. Our team will start work shortly and get back to you once the website is live.",
    meta: name,
  };
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
          ? "Our team is building from your brief and photos."
          : "Our team handles this next — no extra forms from you.",
      state: buildState,
    },
    {
      id: "live",
      title: "Go live",
      detail: liveDone
        ? "Your site is connected. Ask support if you need the live URL."
        : "We’ll get back to you when it’s ready to review and go live.",
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

  if (options.domainTask?.status === "unavailable") {
    actions.push({
      id: "domain-help",
      title: "Domain needs a decision",
      body: "Your preferred domain looks unavailable. Contact us to pick another.",
      to: "/dashboard/support",
      cta: "Contact support",
      tone: "primary",
    });
  }

  if (needsGbpInvite(options.data)) {
    actions.push({
      id: "gbp",
      title: "Optional: Google Business access",
      body: "If you’d like us to handle weekly posts and review replies, give us Manager access on your Google Business Profile.",
      to: "/dashboard/google-business",
      cta: "Give Manager access",
      tone: "primary",
    });
  }

  actions.push({
    id: "add-site",
    title: "Add another website",
    body: "Start a new order for another business or brand whenever you like.",
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
