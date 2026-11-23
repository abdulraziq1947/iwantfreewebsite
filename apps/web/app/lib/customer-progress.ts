import type { OnboardingData } from "./onboarding";

export type DomainTaskSnapshot = {
  domainName: string;
  domainMode: "new" | "existing";
  status: string;
  registeredAt: string | null;
  connectedAt: string | null;
  liveUrl?: string | null;
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
  external?: boolean;
};

export type StatusBanner = {
  kicker: string;
  title: string;
  body: string;
  meta?: string;
  href?: string;
  cta?: string;
  external?: boolean;
};

/** Normalise a customer-facing live website URL. */
export function normaliseLiveUrl(
  value: string | null | undefined,
  domainName?: string | null,
): string | null {
  const raw = (value ?? "").trim();
  if (raw) {
    if (/^https?:\/\//i.test(raw)) return raw;
    return `https://${raw.replace(/^\/+/, "")}`;
  }
  const domain = (domainName ?? "").trim().replace(/^https?:\/\//i, "");
  if (!domain) return null;
  return `https://${domain}`;
}

export function liveWebsiteUrl(task: DomainTaskSnapshot): string | null {
  if (!task || task.status !== "connected") return null;
  return normaliseLiveUrl(task.liveUrl, task.domainName);
}

export function domainTaskLabel(status: string | undefined): string {
  switch (status) {
    case "pending":
      return "Queued with our team";
    case "in_progress":
      return "In progress with our team";
    case "registered":
      return "Registered — connecting DNS";
    case "connected":
      return "Live";
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
      return "Live";
    case "unavailable":
      return "Needs a quick decision";
    case "registered":
    case "in_progress":
    case "pending":
    default:
      return "We’re working on it";
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
  if (data?.gbp.accessGranted) return false;
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
  const liveUrl = liveWebsiteUrl(options.domainTask);

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
      kicker: "Congratulations",
      title: "Your website is live",
      body: liveUrl
        ? `Great news — ${name} is live at ${liveUrl}. Share it with customers and keep the link handy.`
        : `Great news — ${name} is live. Open your site from the button below.`,
      meta: domain ? `${name} · ${domain}` : name,
      href: liveUrl ?? undefined,
      cta: liveUrl ? "Visit live site" : undefined,
      external: true,
    };
  }

  return {
    kicker: "You’re all set",
    title: "Nothing more for you to do right now",
    body: domain
      ? `We’ve got everything we need for ${domain}. Our team is working on your website and will get back to you once it’s live.`
      : "We’ve got everything we need. Our team is working on your website and will get back to you once it’s live.",
    meta: name,
  };
}

/**
 * Customer-facing journey — keep domain work behind “we’re working on your website”.
 */
export function buildJourneyStages(options: {
  needsSubscription: boolean;
  briefReady: boolean;
  domainTask: DomainTaskSnapshot;
}): JourneyStage[] {
  const { needsSubscription, briefReady, domainTask } = options;
  const domainStatus = domainTask?.status;
  const liveDone = domainStatus === "connected";
  const liveUrl = liveWebsiteUrl(domainTask);
  const workingCurrent =
    !needsSubscription && briefReady && !liveDone && domainStatus !== "unavailable";

  const paymentState: JourneyStage["state"] = needsSubscription
    ? "current"
    : "done";
  const briefState: JourneyStage["state"] = needsSubscription
    ? "upcoming"
    : briefReady
      ? "done"
      : "current";
  const workingState: JourneyStage["state"] = needsSubscription
    ? "upcoming"
    : !briefReady
      ? "upcoming"
      : liveDone
        ? "done"
        : workingCurrent
          ? "current"
          : "upcoming";
  const liveState: JourneyStage["state"] = liveDone ? "done" : "upcoming";

  const workingDetail = liveDone
    ? "Build complete — your site is launched."
    : domainTask?.domainName
      ? `Including ${domainTask.domainName}, hosting and setup — handled by our team.`
      : "Domain, hosting and setup are handled by our team.";

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
      title: "Brief received",
      detail: briefReady
        ? "Your checkout answers are with the team."
        : "We’ll use the details you submitted when you ordered.",
      state: briefState,
    },
    {
      id: "working",
      title: "We’re working on your website",
      detail: workingDetail,
      state: workingState,
    },
    {
      id: "live",
      title: liveDone ? "Website live" : "Go live",
      detail: liveDone
        ? liveUrl
          ? `Your site is live at ${liveUrl}.`
          : "Your site is live — open it from your dashboard."
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

  const liveUrl = liveWebsiteUrl(options.domainTask);
  if (liveUrl) {
    actions.push({
      id: "visit-live",
      title: "Your website is live",
      body: `Open ${liveUrl} anytime — share it with customers.`,
      to: liveUrl,
      cta: "Visit live site",
      tone: "primary",
      external: true,
    });
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
      title: "Google Business access",
      body: "If you’d like us to handle weekly posts and review replies, give us Manager access on your Google Business Profile.",
      to: "/dashboard/google-business",
      cta: "Give Manager access",
      tone: liveUrl ? "secondary" : "primary",
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
