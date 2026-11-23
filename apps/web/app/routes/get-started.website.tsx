import { Form, Link, redirect, useNavigation, data } from "react-router";
import { createDb } from "@iwfw/db";
import { MediaUploader } from "../components/media-uploader";
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
import type { ReactNode } from "react";

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

function Field({
  label,
  name,
  defaultValue,
  required,
  hint,
  placeholder,
  type = "text",
  multiline,
  rows = 3,
  autoComplete,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  required?: boolean;
  hint?: string;
  placeholder?: string;
  type?: string;
  multiline?: boolean;
  rows?: number;
  autoComplete?: string;
}) {
  return (
    <label className="iwfw-field">
      <span className="iwfw-field__label">
        {label}
        {required ? <span className="iwfw-field__req">*</span> : null}
      </span>
      {hint ? <em className="iwfw-field__hint">{hint}</em> : null}
      {multiline ? (
        <textarea
          name={name}
          rows={rows}
          required={required}
          defaultValue={defaultValue}
          placeholder={placeholder}
        />
      ) : (
        <input
          type={type}
          name={name}
          required={required}
          defaultValue={defaultValue}
          placeholder={placeholder}
          autoComplete={autoComplete}
        />
      )}
    </label>
  );
}

function StepFields({
  step,
  data,
}: {
  step: number;
  data: OrderQuestionnaire;
}): ReactNode {
  if (step === 0) {
    return (
      <>
        <Field
          label="Full name"
          name="fullName"
          required
          defaultValue={data.contact.fullName}
          placeholder="Jane Smith"
          autoComplete="name"
        />
        <div className="iwfw-field-grid iwfw-field-grid--2">
          <Field
            label="Email"
            name="email"
            type="email"
            required
            defaultValue={data.contact.email}
            placeholder="jane@business.co.uk"
            autoComplete="email"
            hint="We’ll send your activation link here after payment."
          />
          <Field
            label="Phone"
            name="phone"
            required
            defaultValue={data.contact.phone}
            placeholder="07xxx xxxxxx"
            autoComplete="tel"
          />
        </div>
      </>
    );
  }

  if (step === 1) {
    return (
      <>
        <Field
          label="Business / trading name"
          name="tradingName"
          required
          defaultValue={data.business.tradingName}
          placeholder="Acme Plumbing"
          autoComplete="organization"
        />
        <Field
          label="Industry / category"
          name="industry"
          required
          defaultValue={data.business.industry}
          placeholder="Plumbing, dental, removals…"
        />
        <Field
          label="Business address"
          name="address"
          required
          multiline
          rows={3}
          defaultValue={data.business.address}
          placeholder="Street, town, postcode"
        />
        <Field
          label="Service areas"
          name="serviceAreas"
          multiline
          rows={2}
          defaultValue={data.business.serviceAreas}
          placeholder="Towns, postcodes, or nationwide"
          hint="Optional — helps us write location pages that match how you trade."
        />
      </>
    );
  }

  if (step === 2) {
    return (
      <>
        <Field
          label="Services offered"
          name="list"
          required
          multiline
          rows={5}
          defaultValue={data.services.list}
          placeholder={"Boiler repairs\nBathroom installation\nEmergency call-outs"}
          hint="One service per line works best."
        />
        <Field
          label="Service descriptions"
          name="descriptions"
          multiline
          rows={4}
          defaultValue={data.services.descriptions}
          placeholder="Short detail for each service if you have it"
          hint="Optional — pricing ranges or what customers should expect."
        />
      </>
    );
  }

  if (step === 3) {
    return (
      <>
        <Field
          label="About your business"
          name="introduction"
          required
          multiline
          rows={5}
          defaultValue={data.about.introduction}
          placeholder="A short introduction customers can trust…"
        />
        <div className="iwfw-field-grid iwfw-field-grid--2">
          <Field
            label="Phone to show on the website"
            name="displayPhone"
            defaultValue={data.about.displayPhone}
            placeholder="Same as contact phone is fine"
          />
          <Field
            label="Email to show on the website"
            name="displayEmail"
            type="email"
            defaultValue={data.about.displayEmail}
            placeholder="hello@yourbusiness.co.uk"
          />
        </div>
        <Field
          label="Opening hours"
          name="openingHours"
          multiline
          rows={3}
          defaultValue={data.about.openingHours}
          placeholder={"Mon–Fri 8am–6pm\nSat 9am–1pm"}
        />
        <Field
          label="Existing website or domain"
          name="existingWebsite"
          defaultValue={data.about.existingWebsite}
          placeholder="https://… or leave blank"
        />
      </>
    );
  }

  if (step === 4) {
    return (
      <>
        <Field
          label="Preferred pages"
          name="preferredPages"
          required
          multiline
          rows={3}
          defaultValue={data.website.preferredPages}
          placeholder="Home, Services, About, Contact…"
        />
        <Field
          label="Design preferences"
          name="designPreferences"
          multiline
          rows={3}
          defaultValue={data.website.designPreferences}
          placeholder="Clean and modern, bold and trustworthy…"
        />
        <Field
          label="Brand colours"
          name="colours"
          defaultValue={data.website.colours}
          placeholder="Navy and white, or leave blank"
        />
        <Field
          label="Example websites you like"
          name="exampleWebsites"
          multiline
          rows={2}
          defaultValue={data.website.exampleWebsites}
          placeholder="Links or brand names"
        />
        <Field
          label="Additional instructions"
          name="additionalInstructions"
          multiline
          rows={3}
          defaultValue={data.website.additionalInstructions}
          placeholder="Anything else we should know before we build"
        />
      </>
    );
  }

  return (
    <>
      <MediaUploader
        mode="order"
        title="Upload your brand images"
        description="Drag in logos, business photos, team shots or portfolio images. Files stay private and carry over when you resume or after payment."
      />
      <div className="iwfw-field-grid iwfw-field-grid--2">
        <Field
          label="Logo notes"
          name="logoNotes"
          multiline
          rows={2}
          defaultValue={data.media.logoNotes}
          placeholder="Which logo version to use"
        />
        <Field
          label="Business image notes"
          name="imageNotes"
          multiline
          rows={2}
          defaultValue={data.media.imageNotes}
          placeholder="Preferred photos for Home / About"
        />
      </div>
      <Field
        label="Anything else about your images?"
        name="uploadNotes"
        multiline
        rows={2}
        defaultValue={data.media.uploadNotes}
        placeholder="e.g. use the navy logo on light backgrounds"
      />
      <Field
        label="Social media links"
        name="socialLinks"
        multiline
        rows={2}
        defaultValue={data.media.socialLinks}
        placeholder="Facebook, Instagram, LinkedIn…"
      />
      <Field
        label="Google Business Profile link"
        name="gbpLink"
        defaultValue={data.media.gbpLink}
        placeholder="https://g.page/…"
      />
    </>
  );
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

        <StepFields step={step} data={data} />

        {actionData?.error && (
          <p className="iwfw-start__error" role="alert">
            {actionData.error}
          </p>
        )}
        {actionData && "saved" in actionData && actionData.saved && (
          <p className="iwfw-start__ok" role="status">
            Progress saved. You can close this page and resume later on this
            device.
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
            {busy
              ? "Saving…"
              : step >= QUESTIONNAIRE_STEPS.length - 1
                ? "Continue to domain"
                : "Continue"}
          </button>
        </div>
        <p className="iwfw-start__fine">
          No account needed yet — you pay first, then we create your dashboard
          login. <Link to="/get-started">← Package</Link>
        </p>
      </Form>
    </div>
  );
}
