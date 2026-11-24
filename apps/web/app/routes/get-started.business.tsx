import { Form, Link, redirect, useNavigation, data } from "react-router";
import { createDb } from "@iwfw/db";
import { QuestionnaireField } from "../components/questionnaire-field";
import { getEnv } from "../lib/env.server";
import {
  getOrCreateDraftOrder,
  orderQuestionnaire,
  saveQuestionnaireProgress,
} from "../lib/pending-order.server";
import { validateQuestionnaireStep } from "../lib/order-questionnaire";
import { readBusinessForm } from "../lib/questionnaire-form.server";
import type { Route } from "./+types/get-started.business";

export function meta(_args: Route.MetaArgs) {
  return [{ title: "Business details — iwantfreewebsite.com" }];
}

export async function loader({ request, context }: Route.LoaderArgs) {
  const db = createDb(getEnv(context).DB);
  const { order, setCookie } = await getOrCreateDraftOrder(db, request);
  const q = orderQuestionnaire(order);
  if (!q.contact.email.trim()) {
    throw redirect("/get-started/personal");
  }
  return data(
    { data: q },
    setCookie ? { headers: { "Set-Cookie": setCookie } } : undefined,
  );
}

export async function action({ request, context }: Route.ActionArgs) {
  const db = createDb(getEnv(context).DB);
  const { order } = await getOrCreateDraftOrder(db, request);
  const form = await request.formData();
  const intent = String(form.get("intent") ?? "next");
  const current = orderQuestionnaire(order);
  const nextData = readBusinessForm(form, current);

  if (intent === "back") {
    await saveQuestionnaireProgress({
      db,
      orderId: order.id,
      data: nextData,
      step: 0,
    });
    throw redirect("/get-started/personal");
  }

  if (intent === "save") {
    await saveQuestionnaireProgress({
      db,
      orderId: order.id,
      data: nextData,
      step: 1,
    });
    return { ok: true, saved: true, data: nextData };
  }

  const error = validateQuestionnaireStep(1, nextData);
  if (error) return { error, data: nextData };

  await saveQuestionnaireProgress({
    db,
    orderId: order.id,
    data: nextData,
    step: 2,
  });
  throw redirect("/get-started/media");
}

export default function GetStartedBusiness({
  loaderData,
  actionData,
}: Route.ComponentProps) {
  const navigation = useNavigation();
  const busy = navigation.state !== "idle";
  const data = actionData?.data ?? loaderData.data;

  return (
    <div className="iwfw-start">
      <header className="iwfw-start__intro">
        <p className="iwfw-start__kicker">Step 2 of 5 · Business details</p>
        <h1>Business details</h1>
        <p className="iwfw-start__lead">
          Tell us what you do in plain English. We use this to build a website
          that represents your business properly.
        </p>
        <div className="iwfw-order-progress" aria-hidden>
          <span style={{ width: "40%" }} />
        </div>
      </header>

      <Form method="post" className="iwfw-start__card iwfw-start__form">
        <h2 className="iwfw-start__subhead">Business</h2>
        <QuestionnaireField
          label="Business / trading name"
          name="tradingName"
          required
          defaultValue={data.business.tradingName}
          placeholder="Acme Plumbing"
          autoComplete="organization"
        />
        <QuestionnaireField
          label="Industry / category"
          name="industry"
          required
          defaultValue={data.business.industry}
          placeholder="Plumbing, dental, removals…"
        />
        <QuestionnaireField
          label="Business address"
          name="address"
          required
          multiline
          rows={3}
          defaultValue={data.business.address}
          placeholder="Street, town, postcode"
        />
        <QuestionnaireField
          label="Service areas"
          name="serviceAreas"
          multiline
          rows={2}
          defaultValue={data.business.serviceAreas}
          placeholder="Towns, postcodes, or nationwide"
          hint="Optional — helps us write location pages that match how you trade."
        />

        <h2 className="iwfw-start__subhead">Services</h2>
        <QuestionnaireField
          label="Services offered"
          name="list"
          required
          multiline
          rows={5}
          defaultValue={data.services.list}
          placeholder={"Boiler repairs\nBathroom installation\nEmergency call-outs"}
          hint="One service per line works best."
        />
        <input type="hidden" name="descriptions" value={data.services.descriptions} />

        <h2 className="iwfw-start__subhead">About &amp; hours</h2>
        <QuestionnaireField
          label="About your business"
          name="introduction"
          required
          multiline
          rows={4}
          defaultValue={data.about.introduction}
          placeholder="A short introduction customers can trust…"
        />
        <div className="iwfw-field-grid iwfw-field-grid--2">
          <QuestionnaireField
            label="Phone to show on the website"
            name="displayPhone"
            defaultValue={data.about.displayPhone}
            placeholder="Same as contact phone is fine"
          />
          <QuestionnaireField
            label="Email to show on the website"
            name="displayEmail"
            type="email"
            defaultValue={data.about.displayEmail}
            placeholder="hello@yourbusiness.co.uk"
          />
        </div>
        <QuestionnaireField
          label="Opening hours"
          name="openingHours"
          multiline
          rows={3}
          defaultValue={data.about.openingHours}
          placeholder={"Mon–Fri 8am–6pm\nSat 9am–1pm"}
        />
        <QuestionnaireField
          label="Existing website or domain"
          name="existingWebsite"
          defaultValue={data.about.existingWebsite}
          placeholder="https://… or leave blank"
        />

        <h2 className="iwfw-start__subhead">Website preferences</h2>
        <input
          type="hidden"
          name="preferredPages"
          value={data.website.preferredPages}
        />
        <QuestionnaireField
          label="Design preferences"
          name="designPreferences"
          multiline
          rows={2}
          defaultValue={data.website.designPreferences}
          placeholder="Clean and modern, bold and trustworthy…"
        />
        <QuestionnaireField
          label="Brand colours"
          name="colours"
          defaultValue={data.website.colours}
          placeholder="Navy and white, or leave blank"
        />
        <QuestionnaireField
          label="Example websites you like"
          name="exampleWebsites"
          multiline
          rows={2}
          defaultValue={data.website.exampleWebsites}
          placeholder="Links or brand names"
        />
        <QuestionnaireField
          label="Additional instructions"
          name="additionalInstructions"
          multiline
          rows={2}
          defaultValue={data.website.additionalInstructions}
          placeholder="Anything else we should know before we build"
        />

        {actionData?.error && (
          <p className="iwfw-start__error" role="alert">
            {actionData.error}
          </p>
        )}
        {actionData && "saved" in actionData && actionData.saved && (
          <p className="iwfw-start__ok" role="status">
            Progress saved. You can resume later on this device.
          </p>
        )}

        <div className="iwfw-order-actions">
          <button
            type="submit"
            name="intent"
            value="back"
            className="iwfw-btn iwfw-btn--outline"
            disabled={busy}
          >
            Back
          </button>
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
            {busy ? "Saving…" : "Continue"}
          </button>
        </div>
      </Form>
    </div>
  );
}
