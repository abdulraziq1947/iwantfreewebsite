import { Form, redirect, useNavigation, data } from "react-router";
import { createDb } from "@iwfw/db";
import { QuestionnaireField } from "../components/questionnaire-field";
import {
  ArrowIcon,
  ChevronIcon,
  DefaultSubmit,
  FormAlert,
  StepHeader,
} from "../components/start-funnel";
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

/** Which field each step-1 validation message belongs to. */
const ERROR_FIELD: Record<string, string> = {
  "Please enter your business name.": "tradingName",
  "Please enter your industry.": "industry",
  "Please enter your business address.": "address",
  "Please list your services.": "list",
  "Please add a short business introduction.": "introduction",
};

export default function GetStartedBusiness({
  loaderData,
  actionData,
}: Route.ComponentProps) {
  const navigation = useNavigation();
  const busy = navigation.state !== "idle";
  const submitting =
    navigation.state === "submitting"
      ? String(navigation.formData?.get("intent") ?? "next")
      : null;
  const data = actionData?.data ?? loaderData.data;
  const error = actionData && "error" in actionData ? actionData.error : null;
  const fieldError = (name: string) =>
    error && ERROR_FIELD[error] === name ? error : null;
  const hasDesignNotes = [
    data.website.designPreferences,
    data.website.colours,
    data.website.exampleWebsites,
    data.website.additionalInstructions,
  ].some((value) => value.trim());

  return (
    <div className="st-step">
      <StepHeader
        kicker="Step 2 of 5"
        title="About your business"
        lead="Tell us what you do in plain English. We use this to build a website that represents your business properly."
      />

      <Form method="post" className="st-sheet st-form">
        <DefaultSubmit disabled={busy} />

        <section className="st-group" aria-labelledby="st-biz-basics">
          <div className="st-group__head">
            <h2 id="st-biz-basics">The basics</h2>
          </div>
          <QuestionnaireField
            label="Business or trading name"
            name="tradingName"
            required
            defaultValue={data.business.tradingName}
            placeholder="Acme Plumbing"
            autoComplete="organization"
            error={fieldError("tradingName")}
          />
          <QuestionnaireField
            label="Industry or trade"
            name="industry"
            required
            defaultValue={data.business.industry}
            placeholder="Plumbing, dental, removals…"
            error={fieldError("industry")}
          />
          <QuestionnaireField
            label="Business address"
            name="address"
            required
            multiline
            rows={3}
            defaultValue={data.business.address}
            placeholder="Street, town, postcode"
            autoComplete="street-address"
            error={fieldError("address")}
          />
          <QuestionnaireField
            label="Areas you cover"
            name="serviceAreas"
            multiline
            rows={2}
            defaultValue={data.business.serviceAreas}
            placeholder="Towns, postcodes, or nationwide"
            hint="Helps us write location pages that match how you trade."
          />
        </section>

        <section className="st-group" aria-labelledby="st-biz-services">
          <div className="st-group__head">
            <h2 id="st-biz-services">What you offer</h2>
          </div>
          <QuestionnaireField
            label="Services you offer"
            name="list"
            required
            multiline
            rows={5}
            defaultValue={data.services.list}
            placeholder={"Boiler repairs\nBathroom installation\nEmergency call-outs"}
            hint="One service per line works best."
            error={fieldError("list")}
          />
          <input type="hidden" name="descriptions" value={data.services.descriptions} />
          <QuestionnaireField
            label="About your business"
            name="introduction"
            required
            multiline
            rows={4}
            defaultValue={data.about.introduction}
            placeholder="How long you’ve been trading, what you’re known for, why customers choose you…"
            hint="A few sentences is plenty."
            error={fieldError("introduction")}
          />
        </section>

        <section className="st-group" aria-labelledby="st-biz-contact">
          <div className="st-group__head">
            <h2 id="st-biz-contact">On your website</h2>
            <p>How customers should reach you. Leave anything blank that you’d rather not show.</p>
          </div>
          <div className="st-pair">
            <QuestionnaireField
              label="Phone to show"
              name="displayPhone"
              type="tel"
              defaultValue={data.about.displayPhone}
              placeholder="Same as contact phone is fine"
            />
            <QuestionnaireField
              label="Email to show"
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
            inputMode="url"
            defaultValue={data.about.existingWebsite}
            placeholder="https://…"
          />
        </section>

        <input
          type="hidden"
          name="preferredPages"
          value={data.website.preferredPages}
        />
        <details className="st-group st-more" open={hasDesignNotes}>
          <summary>
            <span>
              <strong>Design preferences</strong>
              <span className="st-more__note">
                Optional. Add colours, styles or sites you like, or skip this.
              </span>
            </span>
            <ChevronIcon />
          </summary>
          <div className="st-more__body">
            <QuestionnaireField
              label="Look and feel"
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
              placeholder="Navy and white"
            />
            <QuestionnaireField
              label="Websites you like"
              name="exampleWebsites"
              multiline
              rows={2}
              defaultValue={data.website.exampleWebsites}
              placeholder="Links or brand names"
            />
            <QuestionnaireField
              label="Anything else we should know"
              name="additionalInstructions"
              multiline
              rows={2}
              defaultValue={data.website.additionalInstructions}
              placeholder="Pages you need, things to avoid, deadlines…"
            />
          </div>
        </details>

        {error ? <FormAlert tone="error">{error}</FormAlert> : null}
        {actionData && "saved" in actionData && actionData.saved ? (
          <FormAlert tone="ok">
            Progress saved. You can pick up where you left off on this device.
          </FormAlert>
        ) : null}

        <div className="st-actions">
          <button
            type="submit"
            name="intent"
            value="back"
            formNoValidate
            className="st-btn st-btn--quiet st-actions__back"
            disabled={busy}
          >
            <ArrowIcon direction="left" />
            Back
          </button>
          <button
            type="submit"
            name="intent"
            value="save"
            formNoValidate
            className="st-btn st-btn--quiet"
            disabled={busy}
          >
            {submitting === "save" ? "Saving…" : "Save and finish later"}
          </button>
          <button
            type="submit"
            name="intent"
            value="next"
            className="st-btn st-btn--go st-actions__next"
            disabled={busy}
          >
            {submitting === "next" ? "Saving…" : "Continue"}
            <ArrowIcon />
          </button>
        </div>
      </Form>
    </div>
  );
}
