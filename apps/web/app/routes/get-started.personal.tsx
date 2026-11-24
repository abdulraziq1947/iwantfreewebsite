import { Form, Link, redirect, useNavigation, data } from "react-router";
import { createDb } from "@iwfw/db";
import { QuestionnaireField } from "../components/questionnaire-field";
import {
  ArrowIcon,
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
import { readPersonalForm } from "../lib/questionnaire-form.server";
import type { Route } from "./+types/get-started.personal";

export function meta(_args: Route.MetaArgs) {
  return [{ title: "Personal details — iwantfreewebsite.com" }];
}

export async function loader({ request, context }: Route.LoaderArgs) {
  const db = createDb(getEnv(context).DB);
  const forceNew = new URL(request.url).searchParams.get("new") === "1";
  const { order, setCookie } = await getOrCreateDraftOrder(db, request, {
    forceNew,
  });
  return data(
    { data: orderQuestionnaire(order), addingSite: forceNew },
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

/** Which field each step-0 validation message belongs to. */
const ERROR_FIELD: Record<string, string> = {
  "Please enter your full name.": "fullName",
  "Please enter a valid email address.": "email",
  "Please enter a phone number.": "phone",
};

export default function GetStartedPersonal({
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

  return (
    <div className="st-step">
      <StepHeader
        kicker={
          loaderData.addingSite
            ? "Another website · Step 1 of 5"
            : "Step 1 of 5"
        }
        title="Your details"
        lead="So we know who to contact about your website. No technical knowledge needed, and it only takes a minute."
      />

      <Form method="post" className="st-sheet st-form">
        <DefaultSubmit disabled={busy} />
        <QuestionnaireField
          label="Full name"
          name="fullName"
          required
          defaultValue={data.contact.fullName}
          placeholder="Jane Smith"
          autoComplete="name"
          error={fieldError("fullName")}
        />
        <div className="st-pair">
          <QuestionnaireField
            label="Email"
            name="email"
            type="email"
            required
            defaultValue={data.contact.email}
            placeholder="jane@business.co.uk"
            autoComplete="email"
            hint="We’ll send your activation link here after payment."
            error={fieldError("email")}
          />
          <QuestionnaireField
            label="Phone"
            name="phone"
            type="tel"
            required
            defaultValue={data.contact.phone}
            placeholder="07xxx xxxxxx"
            autoComplete="tel"
            hint="In case we need to check anything about your site."
            error={fieldError("phone")}
          />
        </div>

        {error ? <FormAlert tone="error">{error}</FormAlert> : null}
        {actionData && "saved" in actionData && actionData.saved ? (
          <FormAlert tone="ok">
            Progress saved. You can pick up where you left off on this device.
          </FormAlert>
        ) : null}

        <div className="st-actions">
          <Link to="/get-started" className="st-btn st-btn--quiet st-actions__back">
            <ArrowIcon direction="left" />
            Package
          </Link>
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
