import type { OnboardingData } from "./onboarding";
import type { DomainTaskSnapshot } from "./customer-progress";

export type AttentionOwner = "customer" | "staff";

export type AttentionSeverity = "action" | "waiting" | "info";

export type AttentionItem = {
  id: string;
  title: string;
  body: string;
  owner: AttentionOwner;
  severity: AttentionSeverity;
  /** Customer dashboard path or admin relative path */
  to?: string;
  cta?: string;
};

export type GbpAccessState =
  | "granted"
  | "invite_sent"
  | "help_requested"
  | "no_profile"
  | "not_started";

export type GbpAccessSummary = {
  state: GbpAccessState;
  label: string;
  detail: string;
  granted: boolean;
  /** Still waiting on the customer to send an invite / respond */
  awaitingCustomer: boolean;
  /** Staff still need to accept or chase access */
  awaitingStaff: boolean;
  profileUrl: string;
  outcome: OnboardingData["gbp"]["outcome"];
};

export type AttentionBoard = {
  gbp: GbpAccessSummary;
  customer: AttentionItem[];
  staff: AttentionItem[];
  /** Any customer-facing action still needed */
  customerPendingCount: number;
  /** Any staff-facing action still needed */
  staffPendingCount: number;
  hasAttention: boolean;
};

export function gbpAccessSummary(
  data: OnboardingData | null | undefined,
): GbpAccessSummary {
  const gbp = data?.gbp;
  const profileUrl = gbp?.profileUrl?.trim() || "";
  const outcome = gbp?.outcome ?? "";
  const granted = Boolean(gbp?.accessGranted);

  if (granted) {
    return {
      state: "granted",
      label: "GMB access granted",
      detail: profileUrl
        ? `Manager access confirmed${profileUrl ? ` · ${profileUrl}` : ""}.`
        : "Manager access confirmed by the team.",
      granted: true,
      awaitingCustomer: false,
      awaitingStaff: false,
      profileUrl,
      outcome,
    };
  }

  if (outcome === "invitation_sent") {
    return {
      state: "invite_sent",
      label: "Invite sent — awaiting accept",
      detail:
        "Customer says the Manager invite was sent. Staff still need to accept it in Google and mark access granted.",
      granted: false,
      awaitingCustomer: false,
      awaitingStaff: true,
      profileUrl,
      outcome,
    };
  }

  if (outcome === "help_requested") {
    return {
      state: "help_requested",
      label: "Customer needs help with GMB",
      detail: "Customer asked for help inviting us as Manager.",
      granted: false,
      awaitingCustomer: false,
      awaitingStaff: true,
      profileUrl,
      outcome,
    };
  }

  if (outcome === "no_profile") {
    return {
      state: "no_profile",
      label: "No Google Business profile yet",
      detail: "Customer doesn’t have a profile — optional for now, or help them create one.",
      granted: false,
      awaitingCustomer: false,
      awaitingStaff: false,
      profileUrl,
      outcome,
    };
  }

  return {
    state: "not_started",
    label: "GMB access not granted",
    detail:
      "Customer hasn’t confirmed a Manager invite yet. Helpful for weekly posts and review replies.",
    granted: false,
    awaitingCustomer: true,
    awaitingStaff: false,
    profileUrl,
    outcome,
  };
}

export function buildAttentionBoard(options: {
  needsSubscription: boolean;
  briefReady: boolean;
  domainTask: DomainTaskSnapshot;
  data: OnboardingData | null | undefined;
  uploadCount?: number;
  openDomainCount?: number;
  openTransferCount?: number;
  /** When true, treat image uploads as optional (e.g. already live). */
  websiteLive?: boolean;
}): AttentionBoard {
  const gbp = gbpAccessSummary(options.data);
  const customer: AttentionItem[] = [];
  const staff: AttentionItem[] = [];
  const isLive =
    options.websiteLive ?? options.domainTask?.status === "connected";
  const uploadCount = options.uploadCount ?? 0;
  const openDomainCount =
    options.openDomainCount ??
    (options.domainTask &&
    ["pending", "in_progress", "registered"].includes(options.domainTask.status)
      ? 1
      : 0);
  const openTransferCount = options.openTransferCount ?? 0;

  if (options.needsSubscription) {
    customer.push({
      id: "pay",
      title: "Subscribe to start",
      body: "Payment is still needed before we can build the website.",
      owner: "customer",
      severity: "action",
      to: "/get-started",
      cta: "View package",
    });
    staff.push({
      id: "await-pay",
      title: "Waiting on payment",
      body: "Customer has not subscribed yet — nothing to build until they pay.",
      owner: "staff",
      severity: "waiting",
    });
  }

  if (!options.briefReady) {
    customer.push({
      id: "brief",
      title: "Order details incomplete",
      body: "We’re missing some questionnaire details. Contact support if you already paid.",
      owner: "customer",
      severity: "action",
      to: "/dashboard/support",
      cta: "Contact support",
    });
    staff.push({
      id: "chase-brief",
      title: "Brief incomplete",
      body: "Chase missing questionnaire / order details before design starts.",
      owner: "staff",
      severity: "action",
    });
  }

  if (options.domainTask?.status === "unavailable") {
    customer.push({
      id: "domain-decision",
      title: "Domain needs a decision",
      body: "Your preferred domain looks unavailable — pick another with support.",
      owner: "customer",
      severity: "action",
      to: "/dashboard/support",
      cta: "Contact support",
    });
    staff.push({
      id: "domain-unavailable",
      title: "Domain unavailable — customer decision",
      body: "Preferred domain is unavailable. Wait for the customer to choose another.",
      owner: "staff",
      severity: "waiting",
    });
  }

  if (gbp.awaitingCustomer && !options.needsSubscription) {
    customer.push({
      id: "gbp-invite",
      title: "Google Business Manager access",
      body: "Invite us as Manager (not Owner) so we can handle weekly posts and reviews.",
      owner: "customer",
      severity: "action",
      to: "/dashboard/google-business",
      cta: "Give Manager access",
    });
  }

  if (gbp.state === "invite_sent") {
    staff.push({
      id: "gbp-accept",
      title: "Accept GMB Manager invite",
      body: "Customer says the invite was sent. Accept it in Google, then mark access granted.",
      owner: "staff",
      severity: "action",
      to: "?tab=overview",
      cta: "Mark GMB granted",
    });
  } else if (gbp.state === "help_requested") {
    staff.push({
      id: "gbp-help",
      title: "Help customer with GMB access",
      body: "Customer asked for help inviting us as Manager.",
      owner: "staff",
      severity: "action",
    });
    customer.push({
      id: "gbp-help-customer",
      title: "We’ll help with Google Business",
      body: "Thanks — our team will follow up on Manager access. You can still update your status anytime.",
      owner: "customer",
      severity: "waiting",
      to: "/dashboard/google-business",
      cta: "View GMB status",
    });
  } else if (gbp.state === "not_started" && !options.needsSubscription) {
    staff.push({
      id: "gbp-chase",
      title: "GMB access not granted yet",
      body: "Optional but useful — customer has not confirmed a Manager invite.",
      owner: "staff",
      severity: "info",
    });
  }

  // Images are helpful for staff, but optional for the customer — do not
  // treat as a customer “needs attention” action (that keeps the card open).
  if (
    !options.needsSubscription &&
    options.briefReady &&
    !isLive &&
    uploadCount === 0
  ) {
    staff.push({
      id: "no-images",
      title: "No customer images yet",
      body: "Customer hasn’t uploaded media — chase if the brief needs photos.",
      owner: "staff",
      severity: "info",
    });
  }

  if (openDomainCount > 0 && !isLive) {
    staff.push({
      id: "domain-task",
      title:
        openDomainCount === 1
          ? "Domain task open"
          : `${openDomainCount} domain tasks open`,
      body: "Register / connect the domain before go-live.",
      owner: "staff",
      severity: "action",
      to: "/admin/domains",
      cta: "Open domain queue",
    });
  }

  if (openTransferCount > 0) {
    staff.push({
      id: "transfers",
      title:
        openTransferCount === 1
          ? "Asset transfer open"
          : `${openTransferCount} asset transfers open`,
      body: "Complete the transfer task for this client.",
      owner: "staff",
      severity: "action",
      to: "/admin/transfers",
      cta: "Open transfers",
    });
  }

  if (
    !options.needsSubscription &&
    options.briefReady &&
    !isLive &&
    options.domainTask?.status !== "unavailable"
  ) {
    staff.push({
      id: "build-live",
      title: "Website build / go-live in progress",
      body: "Finish the site and mark it live when ready.",
      owner: "staff",
      severity: "action",
    });
  }

  const customerPendingCount = customer.filter(
    (i) => i.severity === "action",
  ).length;
  const staffPendingCount = staff.filter((i) => i.severity === "action").length;

  return {
    gbp,
    customer,
    staff,
    customerPendingCount,
    staffPendingCount,
    /** True when the viewer still has action items (customer or staff). */
    hasAttention: customerPendingCount > 0 || staffPendingCount > 0,
  };
}
