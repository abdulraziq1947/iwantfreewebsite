import { Form, redirect, useNavigation, data } from "react-router";
import { createDb } from "@iwfw/db";
import { MediaUploader } from "../components/media-uploader";
import { QuestionnaireField } from "../components/questionnaire-field";
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
  const data = actionData?.data ?? loaderData.data;

  return (
    <div className="iwfw-start">
      <header className="iwfw-start__intro">
        <p className="iwfw-start__kicker">Step 3 of 5 · Media &amp; logos</p>
        <h1>Media, logo &amp; photos</h1>
        <p className="iwfw-start__lead">
          Upload what you have — logo, photos of your work, or social links. No
          logo or photos yet? That&apos;s fine — you can continue and add them
          later. Files stay private and carry over after payment.
        </p>
        <div className="iwfw-order-progress" aria-hidden>
          <span style={{ width: "60%" }} />
        </div>
      </header>

      <Form method="post" className="iwfw-start__card iwfw-start__form">
        <MediaUploader
          mode="order"
          fixedCategory="logo"
          title="Business logo"
          description="Your main logo — JPG, PNG or WebP · max 10 MB each."
        />
        <MediaUploader
          mode="order"
          fixedCategory="business_photo"
          title="Business photographs"
          description="Photos of your premises, team at work, vehicles or shop front."
        />
        <MediaUploader
          mode="order"
          fixedCategory="portfolio"
          title="Project images"
          description="Before/after shots, completed jobs or portfolio examples."
        />

        <h2 className="iwfw-start__subhead">Online profiles</h2>
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
          defaultValue={data.media.gbpLink}
          placeholder="https://g.page/…"
        />

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
            {busy ? "Saving…" : "Continue to domain"}
          </button>
        </div>
      </Form>
    </div>
  );
}
