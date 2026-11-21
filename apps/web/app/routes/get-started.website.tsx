import { Form, Link, redirect, useNavigation, data } from "react-router";
import { createDb } from "@iwfw/db";
import { getEnv } from "../lib/env.server";
import {
  getOrCreateDraftOrder,
  orderQuestionnaire,
  saveQuestionnaireProgress,
} from "../lib/pending-order.server";
import {
  QUESTIONNAIRE_STEPS,
  validateQuestionnaireStep,
  type OrderQuestionnaire,
} from "../lib/order-questionnaire";
import type { Route } from "./+types/get-started.website";

export function meta(_args: Route.MetaArgs) {
  return [{ title: "Website details — iwantfreewebsite.com" }];
}

export async function loader({ request, context }: Route.LoaderArgs) {
  const db = createDb(getEnv(context).DB);
  const { order, setCookie } = await getOrCreateDraftOrder(db, request);
  const questionnaire = orderQuestionnaire(order);
  return data(
    {
      step: order.questionnaireStep,
      data: questionnaire,
      steps: QUESTIONNAIRE_STEPS,
      resumeHint: true,
    },
    setCookie ? { headers: { "Set-Cookie": setCookie } } : undefined,
  );
}

function readStepData(
  form: FormData,
  step: number,
  current: OrderQuestionnaire,
): OrderQuestionnaire {
  const next = structuredClone(current);
  if (step === 0) {
    next.contact = {
      fullName: String(form.get("fullName") ?? ""),
      email: String(form.get("email") ?? ""),
      phone: String(form.get("phone") ?? ""),
    };
  }
  if (step === 1) {
    next.business = {
      tradingName: String(form.get("tradingName") ?? ""),
      industry: String(form.get("industry") ?? ""),
      address: String(form.get("address") ?? ""),
      serviceAreas: String(form.get("serviceAreas") ?? ""),
    };
  }
  if (step === 2) {
    next.services = {
      list: String(form.get("list") ?? ""),
      descriptions: String(form.get("descriptions") ?? ""),
    };
  }
  if (step === 3) {
    next.about = {
      introduction: String(form.get("introduction") ?? ""),
      displayPhone: String(form.get("displayPhone") ?? ""),
      displayEmail: String(form.get("displayEmail") ?? ""),
      openingHours: String(form.get("openingHours") ?? ""),
      existingWebsite: String(form.get("existingWebsite") ?? ""),
    };
  }
  if (step === 4) {
    next.website = {
      preferredPages: String(form.get("preferredPages") ?? ""),
      designPreferences: String(form.get("designPreferences") ?? ""),
      colours: String(form.get("colours") ?? ""),
      exampleWebsites: String(form.get("exampleWebsites") ?? ""),
      additionalInstructions: String(form.get("additionalInstructions") ?? ""),
    };
  }
  if (step === 5) {
    next.media = {
      logoNotes: String(form.get("logoNotes") ?? ""),
      imageNotes: String(form.get("imageNotes") ?? ""),
      socialLinks: String(form.get("socialLinks") ?? ""),
      gbpLink: String(form.get("gbpLink") ?? ""),
      uploadNotes: String(form.get("uploadNotes") ?? ""),
    };
  }
  return next;
}

export async function action({ request, context }: Route.ActionArgs) {
  const db = createDb(getEnv(context).DB);
  const { order } = await getOrCreateDraftOrder(db, request);
  const form = await request.formData();
  const intent = String(form.get("intent") ?? "next");
  const step = Number(form.get("step") ?? order.questionnaireStep);
  const current = orderQuestionnaire(order);
  const data = readStepData(form, step, current);

  if (intent === "back") {
    const prev = Math.max(0, step - 1);
    await saveQuestionnaireProgress({
      db,
      orderId: order.id,
      data,
      step: prev,
    });
    return { ok: true, step: prev, data };
  }

  const error = validateQuestionnaireStep(step, data);
  if (error) return { error, step, data };

  if (intent === "save") {
    await saveQuestionnaireProgress({ db, orderId: order.id, data, step });
    return { ok: true, saved: true, step, data };
  }

  const nextStep = step + 1;
  if (nextStep >= QUESTIONNAIRE_STEPS.length) {
    await saveQuestionnaireProgress({
      db,
      orderId: order.id,
      data,
      step: QUESTIONNAIRE_STEPS.length - 1,
    });
    throw redirect("/get-started/domain");
  }

  await saveQuestionnaireProgress({
    db,
    orderId: order.id,
    data,
    step: nextStep,
  });
  return { ok: true, step: nextStep, data };
}

export default function GetStartedWebsite({
  loaderData,
  actionData,
}: Route.ComponentProps) {
  const navigation = useNavigation();
  const busy = navigation.state !== "idle";
  const step = actionData?.step ?? loaderData.step;
  const data = actionData?.data ?? loaderData.data;
  const meta = QUESTIONNAIRE_STEPS[step] ?? QUESTIONNAIRE_STEPS[0];
  const progress = Math.round(((step + 1) / QUESTIONNAIRE_STEPS.length) * 100);

  return (
    <div className="iwfw-start">
      <header className="iwfw-start__intro">
        <p className="iwfw-start__kicker">
          Website questionnaire · Step {step + 1} of {QUESTIONNAIRE_STEPS.length}
        </p>
        <h1>{meta.title}</h1>
        <p className="iwfw-start__lead">{meta.blurb}</p>
        <div className="iwfw-order-progress" aria-hidden>
          <span style={{ width: `${progress}%` }} />
        </div>
      </header>

      <Form method="post" className="iwfw-start__card iwfw-start__form">
        <input type="hidden" name="step" value={step} />

        {step === 0 && (
          <>
            <label className="iwfw-field">
              <span>Full name *</span>
              <input name="fullName" required defaultValue={data.contact.fullName} />
            </label>
            <label className="iwfw-field">
              <span>Email *</span>
              <input
                type="email"
                name="email"
                required
                defaultValue={data.contact.email}
              />
            </label>
            <label className="iwfw-field">
              <span>Phone *</span>
              <input name="phone" required defaultValue={data.contact.phone} />
            </label>
          </>
        )}

        {step === 1 && (
          <>
            <label className="iwfw-field">
              <span>Business / trading name *</span>
              <input
                name="tradingName"
                required
                defaultValue={data.business.tradingName}
              />
            </label>
            <label className="iwfw-field">
              <span>Industry / category *</span>
              <input name="industry" required defaultValue={data.business.industry} />
            </label>
            <label className="iwfw-field">
              <span>Business address *</span>
              <textarea name="address" rows={3} required defaultValue={data.business.address} />
            </label>
            <label className="iwfw-field">
              <span>Service areas</span>
              <textarea
                name="serviceAreas"
                rows={2}
                defaultValue={data.business.serviceAreas}
                placeholder="Towns, postcodes or 'nationwide'"
              />
            </label>
          </>
        )}

        {step === 2 && (
          <>
            <label className="iwfw-field">
              <span>Services offered *</span>
              <textarea
                name="list"
                rows={4}
                required
                defaultValue={data.services.list}
                placeholder="One service per line"
              />
            </label>
            <label className="iwfw-field">
              <span>Service descriptions</span>
              <textarea
                name="descriptions"
                rows={4}
                defaultValue={data.services.descriptions}
              />
            </label>
          </>
        )}

        {step === 3 && (
          <>
            <label className="iwfw-field">
              <span>About your business *</span>
              <textarea
                name="introduction"
                rows={4}
                required
                defaultValue={data.about.introduction}
              />
            </label>
            <label className="iwfw-field">
              <span>Phone to show on the website</span>
              <input name="displayPhone" defaultValue={data.about.displayPhone} />
            </label>
            <label className="iwfw-field">
              <span>Email to show on the website</span>
              <input name="displayEmail" defaultValue={data.about.displayEmail} />
            </label>
            <label className="iwfw-field">
              <span>Opening hours</span>
              <textarea name="openingHours" rows={3} defaultValue={data.about.openingHours} />
            </label>
            <label className="iwfw-field">
              <span>Existing website or domain</span>
              <input name="existingWebsite" defaultValue={data.about.existingWebsite} />
            </label>
          </>
        )}

        {step === 4 && (
          <>
            <label className="iwfw-field">
              <span>Preferred pages *</span>
              <textarea
                name="preferredPages"
                rows={3}
                required
                defaultValue={data.website.preferredPages}
                placeholder="Home, Services, About, Contact…"
              />
            </label>
            <label className="iwfw-field">
              <span>Design preferences</span>
              <textarea
                name="designPreferences"
                rows={3}
                defaultValue={data.website.designPreferences}
              />
            </label>
            <label className="iwfw-field">
              <span>Brand colours</span>
              <input name="colours" defaultValue={data.website.colours} />
            </label>
            <label className="iwfw-field">
              <span>Example websites you like</span>
              <textarea
                name="exampleWebsites"
                rows={2}
                defaultValue={data.website.exampleWebsites}
              />
            </label>
            <label className="iwfw-field">
              <span>Additional instructions</span>
              <textarea
                name="additionalInstructions"
                rows={3}
                defaultValue={data.website.additionalInstructions}
              />
            </label>
          </>
        )}

        {step === 5 && (
          <>
            <label className="iwfw-field">
              <span>Logo notes</span>
              <textarea name="logoNotes" rows={2} defaultValue={data.media.logoNotes} />
            </label>
            <label className="iwfw-field">
              <span>Business image notes</span>
              <textarea name="imageNotes" rows={2} defaultValue={data.media.imageNotes} />
            </label>
            <label className="iwfw-field">
              <span>Secure upload notes</span>
              <textarea
                name="uploadNotes"
                rows={2}
                defaultValue={data.media.uploadNotes}
                placeholder="Describe files you will send securely after payment (logo, photos). Direct file upload to private storage can be enabled with an R2 binding."
              />
            </label>
            <label className="iwfw-field">
              <span>Social media links</span>
              <textarea name="socialLinks" rows={2} defaultValue={data.media.socialLinks} />
            </label>
            <label className="iwfw-field">
              <span>Google Business Profile link</span>
              <input name="gbpLink" defaultValue={data.media.gbpLink} />
            </label>
          </>
        )}

        {actionData?.error && (
          <p className="iwfw-start__error" role="alert">
            {actionData.error}
          </p>
        )}
        {actionData && "saved" in actionData && actionData.saved && (
          <p className="iwfw-start__ok" role="status">
            Progress saved. You can close this page and resume later on this device.
          </p>
        )}

        <div className="iwfw-order-actions">
          {step > 0 && (
            <button
              type="submit"
              name="intent"
              value="back"
              className="iwfw-btn iwfw-btn--outline"
              disabled={busy}
            >
              Back
            </button>
          )}
          <button
            type="submit"
            name="intent"
            value="save"
            className="iwfw-btn iwfw-btn--outline"
            disabled={busy}
          >
            Save &amp; resume later
          </button>
          <button
            type="submit"
            name="intent"
            value="next"
            className="iwfw-btn iwfw-btn--green"
            disabled={busy}
          >
            {step >= QUESTIONNAIRE_STEPS.length - 1
              ? "Continue to domain"
              : "Continue"}
          </button>
        </div>
        <p className="iwfw-start__fine">
          No account needed yet — you pay first, then we create your dashboard login.{" "}
          <Link to="/get-started">← Package</Link>
        </p>
      </Form>
    </div>
  );
}
