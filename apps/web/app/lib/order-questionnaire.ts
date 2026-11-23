/** Pre-payment website questionnaire stored on pending_orders. */

/**
 * Progress stored in pending_orders.questionnaire_step:
 * 0 = personal, 1 = business, 2 = media, >=3 = questionnaire complete.
 */
export const FUNNEL_QUESTION_STEPS = [
  {
    key: "personal",
    title: "Personal details",
    blurb: "How we should reach you about this website order.",
    path: "/get-started/personal",
  },
  {
    key: "business",
    title: "Business details",
    blurb: "Tell us about your business, services and website preferences.",
    path: "/get-started/business",
  },
  {
    key: "media",
    title: "Media, logo & photos",
    blurb: "Upload logos and photos, then add any notes for our designers.",
    path: "/get-started/media",
  },
] as const;

/** @deprecated Prefer FUNNEL_QUESTION_STEPS — kept for older imports/tests. */
export const QUESTIONNAIRE_STEPS = FUNNEL_QUESTION_STEPS;

export type QuestionnaireStepKey = (typeof FUNNEL_QUESTION_STEPS)[number]["key"];

export type OrderQuestionnaire = {
  contact: {
    fullName: string;
    email: string;
    phone: string;
  };
  business: {
    tradingName: string;
    industry: string;
    address: string;
    serviceAreas: string;
  };
  services: {
    list: string;
    descriptions: string;
  };
  about: {
    introduction: string;
    displayPhone: string;
    displayEmail: string;
    openingHours: string;
    existingWebsite: string;
  };
  website: {
    preferredPages: string;
    designPreferences: string;
    colours: string;
    exampleWebsites: string;
    additionalInstructions: string;
  };
  media: {
    logoNotes: string;
    imageNotes: string;
    socialLinks: string;
    gbpLink: string;
    uploadNotes: string;
  };
};

export function emptyQuestionnaire(): OrderQuestionnaire {
  return {
    contact: { fullName: "", email: "", phone: "" },
    business: {
      tradingName: "",
      industry: "",
      address: "",
      serviceAreas: "",
    },
    services: { list: "", descriptions: "" },
    about: {
      introduction: "",
      displayPhone: "",
      displayEmail: "",
      openingHours: "",
      existingWebsite: "",
    },
    website: {
      preferredPages: "",
      designPreferences: "",
      colours: "",
      exampleWebsites: "",
      additionalInstructions: "",
    },
    media: {
      logoNotes: "",
      imageNotes: "",
      socialLinks: "",
      gbpLink: "",
      uploadNotes: "",
    },
  };
}

export function parseQuestionnaire(raw: string | null | undefined): OrderQuestionnaire {
  const empty = emptyQuestionnaire();
  if (!raw) return empty;
  try {
    const parsed = JSON.parse(raw) as Partial<OrderQuestionnaire>;
    return {
      contact: { ...empty.contact, ...parsed.contact },
      business: { ...empty.business, ...parsed.business },
      services: { ...empty.services, ...parsed.services },
      about: { ...empty.about, ...parsed.about },
      website: { ...empty.website, ...parsed.website },
      media: { ...empty.media, ...parsed.media },
    };
  } catch {
    return empty;
  }
}

/** Map legacy multi-step indices onto the 3-step funnel. */
export function normalizeQuestionnaireStep(step: number): number {
  if (!Number.isFinite(step) || step < 0) return 0;
  if (step >= 3) return 3; // complete (includes legacy steps 3–5 once remapped below)
  return step;
}

/**
 * Resume path for an in-progress order.
 * New: 0 personal, 1 business, 2 media, >=3 complete → domain.
 * Legacy: 5 was media; 3–4 were about/website (treat as business).
 */
export function questionnaireResumePath(rawStep: number): string {
  if (rawStep === 5) return "/get-started/media";
  if (rawStep === 3 || rawStep === 4) return "/get-started/business";
  if (rawStep >= 3) return "/get-started/domain";
  if (rawStep === 2) return "/get-started/media";
  if (rawStep === 1) return "/get-started/business";
  return "/get-started/personal";
}

export function validateQuestionnaireStep(
  step: number,
  data: OrderQuestionnaire,
): string | null {
  if (step === 0) {
    if (!data.contact.fullName.trim()) return "Please enter your full name.";
    if (!data.contact.email.trim() || !data.contact.email.includes("@")) {
      return "Please enter a valid email address.";
    }
    if (!data.contact.phone.trim()) return "Please enter a phone number.";
  }
  if (step === 1) {
    if (!data.business.tradingName.trim()) return "Please enter your business name.";
    if (!data.business.industry.trim()) return "Please enter your industry.";
    if (!data.business.address.trim()) return "Please enter your business address.";
    if (!data.services.list.trim()) return "Please list your services.";
    if (!data.about.introduction.trim()) {
      return "Please add a short business introduction.";
    }
    if (!data.website.preferredPages.trim()) {
      return "Please list the pages you want.";
    }
  }
  // Media step has no required fields — uploads are optional.
  return null;
}

export function questionnaireSummary(data: OrderQuestionnaire): string[] {
  return [
    `Contact: ${data.contact.fullName} · ${data.contact.email}`,
    `Business: ${data.business.tradingName} (${data.business.industry})`,
    `Services: ${data.services.list.slice(0, 120)}${data.services.list.length > 120 ? "…" : ""}`,
    `Pages: ${data.website.preferredPages.slice(0, 120)}${data.website.preferredPages.length > 120 ? "…" : ""}`,
  ];
}
