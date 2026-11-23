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
import { readPersonalForm } from "../lib/questionnaire-form.server";
import type { Route } from "./+types/get-started.personal";

export function meta(_args: Route.MetaArgs) {
  return [{ title: "Personal details — iwantfreewebsite.com" }];
}

export async function loader({ request, context }: Route.LoaderArgs) {
  const db = createDb(getEnv(context).DB);
  const { order, setCookie } = await getOrCreateDraftOrder(db, request);
  return data(
    { data: orderQuestionnaire(order) },
    setCookie ? { headers: { "Set-Cookie": setCookie } } : undefined,
  );
}

export async function action({ request, context }: Route.ActionArgs) {
  const db = createDb(getEnv(context).DB);
  const { order } = await getOrCreateDraftOrder(db, request);
  const form = await request.formData();
  const intent = String(form.get("intent") ?? "next");
  const current = orderQuestionnaire(order);
  const nextData = readPersonalForm(form, current);

  if (intent === "save") {
    await saveQuestionnaireProgress({
      db,
      orderId: order.id,
      data: nextData,
      step: 0,
    });
    return { ok: true, saved: true, data: nextData };
  }

  const error = validateQuestionnaireStep(0, nextData);
  if (error) return { error, data: nextData };

  await saveQuestionnaireProgress({
    db,
    orderId: order.id,
    data: nextData,
    step: 1,
  });
  throw redirect("/get-started/business");
}

export default function GetStartedPersonal({
  loaderData,
  actionData,
}: Route.ComponentProps) {
  const navigation = useNavigation();
  const busy = navigation.state !== "idle";
  const data = actionData?.data ?? loaderData.data;

  return (
    <div className="iwfw-start">
      <header className="iwfw-start__intro">
        <p className="iwfw-start__kicker">Step 1 of 5 · Personal details</p>
        <h1>Personal details</h1>
        <p className="iwfw-start__lead">
          How we should reach you about this website order.
        </p>
        <div className="iwfw-order-progress" aria-hidden>
          <span style={{ width: "20%" }} />
        </div>
      </header>

      <Form method="post" className="iwfw-start__card iwfw-start__form">
        <QuestionnaireField
          label="Full name"
          name="fullName"
          required
          defaultValue={data.contact.fullName}
          placeholder="Jane Smith"
          autoComplete="name"
        />
        <div className="iwfw-field-grid iwfw-field-grid--2">
          <QuestionnaireField
            label="Email"
            name="email"
            type="email"
            required
            defaultValue={data.contact.email}
            placeholder="jane@business.co.uk"
            autoComplete="email"
            hint="We’ll send your activation link here after payment."
          />
          <QuestionnaireField
            label="Phone"
            name="phone"
            required
            defaultValue={data.contact.phone}
            placeholder="07xxx xxxxxx"
            autoComplete="tel"
          />
        </div>

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
          <Link to="/get-started" className="iwfw-btn iwfw-btn--outline">
            ← Package
          </Link>
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
