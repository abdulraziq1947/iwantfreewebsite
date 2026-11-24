import { Form, redirect, useNavigation, data } from "react-router";
import { createDb } from "@iwfw/db";
import { MediaUploader } from "../components/media-uploader";
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
import { readMediaForm } from "../lib/questionnaire-form.server";
import type { Route } from "./+types/get-started.media";

export function meta(_args: Route.MetaArgs) {
  return [{ title: "Media & logos — iwantfreewebsite.com" }];
}

export async function loader({ request, context }: Route.LoaderArgs) {
  const db = createDb(getEnv(context).DB);
  const { order, setCookie } = await getOrCreateDraftOrder(db, request);
  const q = orderQuestionnaire(order);
  if (!q.contact.email.trim() || !q.business.tradingName.trim()) {
    throw redirect(
      q.contact.email.trim()
        ? "/get-started/business"
        : "/get-started/personal",
    );
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
  const nextData = readMediaForm(form, current);
  // Notes fields removed from the form — keep stored values empty going forward.
  nextData.media.logoNotes = "";
  nextData.media.imageNotes = "";
  nextData.media.uploadNotes = "";

  if (intent === "back") {
    await saveQuestionnaireProgress({
      db,
      orderId: order.id,
      data: nextData,
      step: 1,
    });
    throw redirect("/get-started/business");
  }

  if (intent === "save") {
    await saveQuestionnaireProgress({
      db,
      orderId: order.id,
      data: nextData,
      step: 2,
    });
    return { ok: true, saved: true, data: nextData };
  }

  await saveQuestionnaireProgress({
    db,
    orderId: order.id,
    data: nextData,
    step: 3,
  });
  throw redirect("/get-started/domain");
}

export default function GetStartedMedia({
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

  return (
    <div className="st-step">
      <StepHeader
        kicker="Step 3 of 5"
        title="Logo, photos and links"
        lead="Upload what you have. No logo or photos yet? That’s fine: continue, and add them later. Files stay private and carry over after payment."
      />

      <Form method="post" className="st-sheet st-form">
        <DefaultSubmit disabled={busy} />

        <div className="st-group st-uploads">
          <MediaUploader
            mode="order"
            fixedCategory="logo"
            title="Business logo"
            description="Your main logo. JPG, PNG or WebP, up to 10 MB each."
          />
          <MediaUploader
            mode="order"
            fixedCategory="business_photo"
            title="Business photographs"
            description="Your premises, team at work, vehicles or shop front."
          />
          <MediaUploader
            mode="order"
            fixedCategory="portfolio"
            title="Project images"
            description="Before and after shots, finished jobs or portfolio examples."
          />
        </div>

        <section className="st-group" aria-labelledby="st-media-profiles">
          <div className="st-group__head">
            <h2 id="st-media-profiles">Online profiles</h2>
            <p>So your website can point to where customers already find you.</p>
          </div>
          <QuestionnaireField
            label="Social media links"
            name="socialLinks"
            multiline
            rows={2}
            defaultValue={data.media.socialLinks}
            placeholder="Facebook, Instagram, LinkedIn…"
          />
          <QuestionnaireField
            label="Google Business Profile link"
            name="gbpLink"
            inputMode="url"
            defaultValue={data.media.gbpLink}
            placeholder="https://g.page/…"
          />
        </section>

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
            {submitting === "next" ? "Saving…" : "Continue to domain"}
            <ArrowIcon />
          </button>
        </div>
      </Form>
    </div>
  );
}
