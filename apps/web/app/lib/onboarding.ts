export const ONBOARDING_STEPS = [
  { key: "business", title: "Business", blurb: "Who you are and how customers find you." },
  { key: "services", title: "Services", blurb: "What you offer and what makes you stand out." },
  { key: "branding", title: "Branding", blurb: "Colours, socials, and reference sites." },
  { key: "website", title: "Website", blurb: "Pages, forms, and preferences." },
  { key: "domain", title: "Domain", blurb: "New name or a domain you already own." },
  { key: "email", title: "Email", blurb: "Your business mailbox preference." },
  { key: "gbp", title: "Google Business", blurb: "Invite us as Manager — not Owner." },
  { key: "review", title: "Review", blurb: "Check everything before you submit." },
] as const;

export type OnboardingStepKey = (typeof ONBOARDING_STEPS)[number]["key"];

export type OnboardingData = {
  business: {
    tradingName: string;
    registeredCompanyName: string;
    contactName: string;
    phone: string;
    email: string;
    address: string;
    serviceAreas: string;
    companiesHouseNumber: string;
    description: string;
  };
  services: {
    list: string;
    prices: string;
    locations: string;
    offers: string;
    usps: string;
  };
  branding: {
    brandColours: string;
    socials: string;
    exampleSites: string;
    mediaNotes: string;
  };
  website: {
    style: string;
    pages: string;
    contactForm: boolean;
    quoteForm: boolean;
    whatsapp: boolean;
    testimonials: string;
    existingWebsite: string;
  };
  domain: {
    mode: "new" | "existing" | "";
    preferredDomain: string;
    existingDomain: string;
    acknowledgedNoGuarantee: boolean;
    registrantName: string;
    registrantOrg: string;
    registrantEmail: string;
    registrantPhone: string;
    registrantAddress: string;
    dnsNotes: string;
  };
  email: {
    localPart: string;
    existingProvider: string;
    migrationRequired: boolean;
    mxOverwriteApproved: boolean;
  };
  gbp: {
    profileUrl: string;
    outcome: "invitation_sent" | "help_requested" | "no_profile" | "";
    publishDirectly: boolean;
  };
};

export function emptyOnboardingData(): OnboardingData {
  return {
    business: {
      tradingName: "",
      registeredCompanyName: "",
      contactName: "",
      phone: "",
      email: "",
      address: "",
      serviceAreas: "",
      companiesHouseNumber: "",
      description: "",
    },
    services: {
      list: "",
      prices: "",
      locations: "",
      offers: "",
      usps: "",
    },
    branding: {
      brandColours: "",
      socials: "",
      exampleSites: "",
      mediaNotes: "",
    },
    website: {
      style: "",
      pages: "Home, Services, About, Contact",
      contactForm: true,
      quoteForm: true,
      whatsapp: false,
      testimonials: "",
      existingWebsite: "",
    },
    domain: {
      mode: "",
      preferredDomain: "",
      existingDomain: "",
      acknowledgedNoGuarantee: false,
      registrantName: "",
      registrantOrg: "",
      registrantEmail: "",
      registrantPhone: "",
      registrantAddress: "",
      dnsNotes: "",
    },
    email: {
      localPart: "info",
      existingProvider: "",
      migrationRequired: false,
      mxOverwriteApproved: false,
    },
    gbp: {
      profileUrl: "",
      outcome: "",
      publishDirectly: true,
    },
  };
}

export function parseOnboardingData(raw: string | null | undefined): OnboardingData {
  const base = emptyOnboardingData();
  if (!raw) return base;
  try {
    const parsed = JSON.parse(raw) as Partial<OnboardingData>;
    return {
      business: { ...base.business, ...parsed.business },
      services: { ...base.services, ...parsed.services },
      branding: { ...base.branding, ...parsed.branding },
      website: { ...base.website, ...parsed.website },
      domain: { ...base.domain, ...parsed.domain },
      email: { ...base.email, ...parsed.email },
      gbp: { ...base.gbp, ...parsed.gbp },
    };
  } catch {
    return base;
  }
}

export function clampStep(step: number): number {
  if (!Number.isFinite(step) || step < 0) return 0;
  if (step >= ONBOARDING_STEPS.length) return ONBOARDING_STEPS.length - 1;
  return Math.floor(step);
}

export function readStepFromForm(
  form: FormData,
  step: number,
  current: OnboardingData,
): OnboardingData {
  const next = structuredClone(current);
  const str = (key: string) => String(form.get(key) ?? "").trim();
  const bool = (key: string) => form.get(key) === "on" || form.get(key) === "true";

  switch (ONBOARDING_STEPS[step]?.key) {
    case "business":
      next.business = {
        tradingName: str("tradingName"),
        registeredCompanyName: str("registeredCompanyName"),
        contactName: str("contactName"),
        phone: str("phone"),
        email: str("email"),
        address: str("address"),
        serviceAreas: str("serviceAreas"),
        companiesHouseNumber: str("companiesHouseNumber"),
        description: str("description"),
      };
      break;
    case "services":
      next.services = {
        list: str("list"),
        prices: str("prices"),
        locations: str("locations"),
        offers: str("offers"),
        usps: str("usps"),
      };
      break;
    case "branding":
      next.branding = {
        brandColours: str("brandColours"),
        socials: str("socials"),
        exampleSites: str("exampleSites"),
        mediaNotes: str("mediaNotes"),
      };
      break;
    case "website":
      next.website = {
        style: str("style"),
        pages: str("pages"),
        contactForm: bool("contactForm"),
        quoteForm: bool("quoteForm"),
        whatsapp: bool("whatsapp"),
        testimonials: str("testimonials"),
        existingWebsite: str("existingWebsite"),
      };
      break;
    case "domain": {
      const mode = str("mode");
      next.domain = {
        mode: mode === "new" || mode === "existing" ? mode : "",
        preferredDomain: str("preferredDomain"),
        existingDomain: str("existingDomain"),
        acknowledgedNoGuarantee: bool("acknowledgedNoGuarantee"),
        registrantName: str("registrantName"),
        registrantOrg: str("registrantOrg"),
        registrantEmail: str("registrantEmail"),
        registrantPhone: str("registrantPhone"),
        registrantAddress: str("registrantAddress"),
        dnsNotes: str("dnsNotes"),
      };
      break;
    }
    case "email":
      next.email = {
        localPart: str("localPart") || "info",
        existingProvider: str("existingProvider"),
        migrationRequired: bool("migrationRequired"),
        mxOverwriteApproved: bool("mxOverwriteApproved"),
      };
      break;
    case "gbp": {
      const outcome = str("outcome");
      next.gbp = {
        profileUrl: str("profileUrl"),
        outcome:
          outcome === "invitation_sent" ||
          outcome === "help_requested" ||
          outcome === "no_profile"
            ? outcome
            : "",
        publishDirectly: bool("publishDirectly"),
      };
      break;
    }
    default:
      break;
  }

  return next;
}

export function onboardingProgress(currentStep: number, completed: boolean): number {
  if (completed) return 100;
  return Math.round((currentStep / ONBOARDING_STEPS.length) * 100);
}
