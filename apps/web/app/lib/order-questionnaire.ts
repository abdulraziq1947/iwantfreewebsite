/** Pre-payment website questionnaire stored on pending_orders. */

export const QUESTIONNAIRE_STEPS = [
  {
    key: "contact",
    title: "Your details",
    blurb: "How we should reach you about this website order.",
  },
  {
    key: "business",
    title: "Your business",
    blurb: "Trading name, industry and where you work from.",
  },
  {
    key: "services",
    title: "Services",
    blurb: "What customers hire you for — keep it clear and specific.",
  },
  {
    key: "about",
    title: "About & hours",
    blurb: "Your story, public contact details and opening hours.",
  },
  {
    key: "website",
    title: "Website preferences",
    blurb: "Pages, look-and-feel and any sites you like as references.",
  },
  {
    key: "media",
    title: "Brand & media",
    blurb: "Upload logos and photos, then add any notes for our designers.",
  },
] as const;

export type QuestionnaireStepKey = (typeof QUESTIONNAIRE_STEPS)[number]["key"];

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
  }
  if (step === 2) {
    if (!data.services.list.trim()) return "Please list your services.";
  }
  if (step === 3) {
    if (!data.about.introduction.trim()) {
      return "Please add a short business introduction.";
    }
  }
  if (step === 4) {
    if (!data.website.preferredPages.trim()) {
      return "Please list the pages you want.";
    }
  }
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
