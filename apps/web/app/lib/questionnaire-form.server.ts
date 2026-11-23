import type { OrderQuestionnaire } from "./order-questionnaire";

export function readPersonalForm(
  form: FormData,
  current: OrderQuestionnaire,
): OrderQuestionnaire {
  const next = structuredClone(current);
  next.contact = {
    fullName: String(form.get("fullName") ?? ""),
    email: String(form.get("email") ?? ""),
    phone: String(form.get("phone") ?? ""),
  };
  return next;
}

export function readBusinessForm(
  form: FormData,
  current: OrderQuestionnaire,
): OrderQuestionnaire {
  const next = structuredClone(current);
  next.business = {
    tradingName: String(form.get("tradingName") ?? ""),
    industry: String(form.get("industry") ?? ""),
    address: String(form.get("address") ?? ""),
    serviceAreas: String(form.get("serviceAreas") ?? ""),
  };
  next.services = {
    list: String(form.get("list") ?? ""),
    descriptions: String(form.get("descriptions") ?? ""),
  };
  next.about = {
    introduction: String(form.get("introduction") ?? ""),
    displayPhone: String(form.get("displayPhone") ?? ""),
    displayEmail: String(form.get("displayEmail") ?? ""),
    openingHours: String(form.get("openingHours") ?? ""),
    existingWebsite: String(form.get("existingWebsite") ?? ""),
  };
  next.website = {
    preferredPages: String(form.get("preferredPages") ?? ""),
    designPreferences: String(form.get("designPreferences") ?? ""),
    colours: String(form.get("colours") ?? ""),
    exampleWebsites: String(form.get("exampleWebsites") ?? ""),
    additionalInstructions: String(form.get("additionalInstructions") ?? ""),
  };
  return next;
}

export function readMediaForm(
  form: FormData,
  current: OrderQuestionnaire,
): OrderQuestionnaire {
  const next = structuredClone(current);
  next.media = {
    logoNotes: String(form.get("logoNotes") ?? ""),
    imageNotes: String(form.get("imageNotes") ?? ""),
    socialLinks: String(form.get("socialLinks") ?? ""),
    gbpLink: String(form.get("gbpLink") ?? ""),
    uploadNotes: String(form.get("uploadNotes") ?? ""),
  };
  return next;
}
