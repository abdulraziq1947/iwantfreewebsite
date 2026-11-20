import { Form, Link, redirect, useNavigation } from "react-router";
import { createDb, eq, onboardingProfiles, organisations } from "@iwfw/db";
import { Button, Input } from "@iwfw/ui";
import { getConfig, getEnv } from "../lib/env.server";
import { requireAuth } from "../lib/session.server";
import { getCustomerWorkspace } from "../lib/customer-org.server";
import {
  ONBOARDING_STEPS,
  clampStep,
  onboardingProgress,
  readStepFromForm,
} from "../lib/onboarding";
import type { Route } from "./+types/dashboard.onboarding";

export function meta(_args: Route.MetaArgs) {
  return [{ title: "Onboarding — iwantfreewebsite" }];
}

export async function loader({ request, context }: Route.LoaderArgs) {
  const auth = await requireAuth(request, context);
  const env = getEnv(context);
  const config = getConfig(context);
  const db = createDb(env.DB);
  const workspace = await getCustomerWorkspace(db, auth);

  if (!workspace.primary || !workspace.onboarding) {
    throw redirect("/dashboard");
  }

  const url = new URL(request.url);
  const requested = Number(url.searchParams.get("step"));
  const step = Number.isFinite(requested)
    ? clampStep(requested)
    : clampStep(workspace.onboarding.currentStep);

  return {
    step,
    steps: ONBOARDING_STEPS,
    data: workspace.onboarding.data,
    completed: workspace.onboarding.completed,
    progress: onboardingProgress(
      workspace.onboarding.currentStep,
      workspace.onboarding.completed,
    ),
    tradingName: workspace.primary.tradingName,
    orgStatus: workspace.primary.status,
    gbpManagerEmail:
      config.GBP_MANAGER_EMAIL ?? "manager@iwantfreewebsite.com",
    user: { name: auth.name, email: auth.email },
  };
}

export async function action({ request, context }: Route.ActionArgs) {
  const auth = await requireAuth(request, context);
  const env = getEnv(context);
  const db = createDb(env.DB);
  const workspace = await getCustomerWorkspace(db, auth);
  if (!workspace.primary || !workspace.onboarding) {
    return { error: "No organisation found." };
  }

  const form = await request.formData();
  const intent = String(form.get("intent") ?? "save");
  const step = clampStep(Number(form.get("step") ?? 0));
  const merged = readStepFromForm(form, step, workspace.onboarding.data);
  const now = new Date();

  let nextStep = step;
  let completedAt: Date | null = workspace.onboarding.completedAt
    ? new Date(workspace.onboarding.completedAt)
    : null;

  if (intent === "back") {
    nextStep = clampStep(step - 1);
  } else if (intent === "continue") {
    nextStep = clampStep(step + 1);
  } else if (intent === "submit") {
    nextStep = ONBOARDING_STEPS.length - 1;
    completedAt = now;
  } else if (intent === "save") {
    nextStep = step;
  }

  // Keep furthest progress when moving forward.
  const storedStep = Math.max(workspace.onboarding.currentStep, nextStep);

  await db
    .update(onboardingProfiles)
    .set({
      currentStep: intent === "back" ? nextStep : storedStep,
      dataJson: JSON.stringify(merged),
      completedAt,
      updatedAt: now,
    })
    .where(eq(onboardingProfiles.id, workspace.onboarding.id));

  if (merged.business.tradingName) {
    await db
      .update(organisations)
      .set({
        tradingName: merged.business.tradingName,
        registeredCompanyName:
          merged.business.registeredCompanyName || null,
        companiesHouseNumber:
          merged.business.companiesHouseNumber || null,
        updatedAt: now,
      })
      .where(eq(organisations.id, workspace.primary.id));
  }

  if (intent === "submit") {
    throw redirect("/dashboard/website?onboarding=done");
  }

  if (intent === "save-exit") {
    throw redirect("/dashboard");
  }

  throw redirect(`/dashboard/onboarding?step=${nextStep}`);
}

export default function OnboardingWizard({ loaderData }: Route.ComponentProps) {
  const { step, steps, data, completed, progress, gbpManagerEmail } = loaderData;
  const navigation = useNavigation();
  const busy = navigation.state !== "idle";
  const current = steps[step];
  const isLast = step === steps.length - 1;

  return (
    <div className="iwfw-onboard">
      <header className="iwfw-onboard__header">
        <div>
          <p className="iwfw-onboard__kicker">Onboarding wizard</p>
          <h1>{current.title}</h1>
          <p>{current.blurb}</p>
        </div>
        <div className="iwfw-onboard__progress" aria-label={`${progress}% complete`}>
          <span>{completed ? "Submitted" : `${progress}% complete`}</span>
          <div className="iwfw-onboard__bar">
            <i style={{ width: `${progress}%` }} />
          </div>
        </div>
      </header>

      <ol className="iwfw-onboard__steps">
        {steps.map((item, index) => (
          <li
            key={item.key}
            className={
              index === step
                ? "is-current"
                : index < step || completed
                  ? "is-done"
                  : undefined
            }
          >
            <Link to={`/dashboard/onboarding?step=${index}`}>
              <em>{index + 1}</em>
              <span>{item.title}</span>
            </Link>
          </li>
        ))}
      </ol>

      <Form method="post" className="iwfw-onboard__panel">
        <input type="hidden" name="step" value={step} />

        {current.key === "business" && (
          <div className="iwfw-onboard__fields">
            <Field label="Trading / business name" name="tradingName" defaultValue={data.business.tradingName} required />
            <Field label="Registered company name (if different)" name="registeredCompanyName" defaultValue={data.business.registeredCompanyName} />
            <Field label="Contact person" name="contactName" defaultValue={data.business.contactName || loaderData.user.name} required />
            <Field label="Phone" name="phone" defaultValue={data.business.phone} />
            <Field label="Email" name="email" type="email" defaultValue={data.business.email || loaderData.user.email} required />
            <Field label="Business address" name="address" defaultValue={data.business.address} multiline />
            <Field label="Service areas" name="serviceAreas" defaultValue={data.business.serviceAreas} hint="Towns or regions you cover" multiline />
            <Field label="Companies House number (optional)" name="companiesHouseNumber" defaultValue={data.business.companiesHouseNumber} />
            <Field label="About your business" name="description" defaultValue={data.business.description} multiline />
          </div>
        )}

        {current.key === "services" && (
          <div className="iwfw-onboard__fields">
            <Field label="Services you offer" name="list" defaultValue={data.services.list} multiline required hint="One per line is fine" />
            <Field label="Prices (optional)" name="prices" defaultValue={data.services.prices} multiline />
            <Field label="Main service locations" name="locations" defaultValue={data.services.locations} multiline />
            <Field label="Special offers" name="offers" defaultValue={data.services.offers} multiline />
            <Field label="What makes you different?" name="usps" defaultValue={data.services.usps} multiline />
          </div>
        )}

        {current.key === "branding" && (
          <div className="iwfw-onboard__fields">
            <Field label="Brand colours" name="brandColours" defaultValue={data.branding.brandColours} hint="e.g. navy and gold" />
            <Field label="Social profile links" name="socials" defaultValue={data.branding.socials} multiline />
            <Field label="Websites you like" name="exampleSites" defaultValue={data.branding.exampleSites} multiline />
            <Field label="Logo / photo notes" name="mediaNotes" defaultValue={data.branding.mediaNotes} multiline hint="We’ll arrange secure uploads next — note what you have ready." />
          </div>
        )}

        {current.key === "website" && (
          <div className="iwfw-onboard__fields">
            <Field label="Preferred style" name="style" defaultValue={data.website.style} hint="Clean, bold, traditional…" />
            <Field label="Pages you want" name="pages" defaultValue={data.website.pages} multiline />
            <label className="iwfw-check">
              <input type="checkbox" name="contactForm" defaultChecked={data.website.contactForm} />
              Include a contact form
            </label>
            <label className="iwfw-check">
              <input type="checkbox" name="quoteForm" defaultChecked={data.website.quoteForm} />
              Include a quote / enquiry form
            </label>
            <label className="iwfw-check">
              <input type="checkbox" name="whatsapp" defaultChecked={data.website.whatsapp} />
              Add a WhatsApp button
            </label>
            <Field label="Testimonials (optional)" name="testimonials" defaultValue={data.website.testimonials} multiline />
            <Field label="Existing website (if any)" name="existingWebsite" defaultValue={data.website.existingWebsite} />
          </div>
        )}

        {current.key === "domain" && (
          <div className="iwfw-onboard__fields">
            <fieldset className="iwfw-onboard__choice">
              <legend>Domain preference</legend>
              <label className="iwfw-check">
                <input type="radio" name="mode" value="new" defaultChecked={data.domain.mode === "new"} />
                I need a new domain
              </label>
              <label className="iwfw-check">
                <input type="radio" name="mode" value="existing" defaultChecked={data.domain.mode === "existing"} />
                I already have a domain
              </label>
            </fieldset>
            <Field label="Preferred new domain" name="preferredDomain" defaultValue={data.domain.preferredDomain} hint=".com or .co.uk preferred" />
            <Field label="Existing domain" name="existingDomain" defaultValue={data.domain.existingDomain} />
            <label className="iwfw-check">
              <input type="checkbox" name="acknowledgedNoGuarantee" defaultChecked={data.domain.acknowledgedNoGuarantee} />
              I understand selecting a domain does not reserve or guarantee it. Your team will purchase it manually after payment, subject to final availability.
            </label>
            <h3 className="iwfw-onboard__subhead">Registrant details</h3>
            <Field label="Registrant full name" name="registrantName" defaultValue={data.domain.registrantName} />
            <Field label="Registrant organisation" name="registrantOrg" defaultValue={data.domain.registrantOrg} />
            <Field label="Registrant email" name="registrantEmail" type="email" defaultValue={data.domain.registrantEmail} />
            <Field label="Registrant phone" name="registrantPhone" defaultValue={data.domain.registrantPhone} />
            <Field label="Registrant address" name="registrantAddress" defaultValue={data.domain.registrantAddress} multiline />
            <Field label="DNS / registrar notes" name="dnsNotes" defaultValue={data.domain.dnsNotes} multiline />
          </div>
        )}

        {current.key === "email" && (
          <div className="iwfw-onboard__fields">
            <Field label="Preferred mailbox name" name="localPart" defaultValue={data.email.localPart} hint="The part before @yourdomain" />
            <Field label="Existing email provider (if any)" name="existingProvider" defaultValue={data.email.existingProvider} />
            <label className="iwfw-check">
              <input type="checkbox" name="migrationRequired" defaultChecked={data.email.migrationRequired} />
              I need help migrating from an existing mailbox
            </label>
            <label className="iwfw-check">
              <input type="checkbox" name="mxOverwriteApproved" defaultChecked={data.email.mxOverwriteApproved} />
              I approve MX / mail DNS changes when we set up email (only if needed)
            </label>
          </div>
        )}

        {current.key === "gbp" && (
          <div className="iwfw-onboard__fields">
            <div className="iwfw-onboard__notice">
              <p>
                Invite us as <strong>Manager</strong>, not Owner. Copy this email into Google Business Profile → Users / Managers:
              </p>
              <code>{gbpManagerEmail}</code>
            </div>
            <ol className="iwfw-onboard__howto">
              <li>Open Google Business Profile as the profile owner.</li>
              <li>Open Users / Managers.</li>
              <li>Add user and paste the Manager email above.</li>
              <li>Choose role <strong>Manager</strong> (not Owner).</li>
              <li>Send the invitation, then confirm below.</li>
            </ol>
            <Field label="Google Business Profile URL (optional)" name="profileUrl" defaultValue={data.gbp.profileUrl} />
            <fieldset className="iwfw-onboard__choice">
              <legend>Where are you with this?</legend>
              <label className="iwfw-check">
                <input type="radio" name="outcome" value="invitation_sent" defaultChecked={data.gbp.outcome === "invitation_sent"} />
                I’ve sent the invitation
              </label>
              <label className="iwfw-check">
                <input type="radio" name="outcome" value="help_requested" defaultChecked={data.gbp.outcome === "help_requested"} />
                I need help
              </label>
              <label className="iwfw-check">
                <input type="radio" name="outcome" value="no_profile" defaultChecked={data.gbp.outcome === "no_profile"} />
                I don’t have a Google Business Profile
              </label>
            </fieldset>
            <p className="iwfw-onboard__fine">
              Clicking “I’ve sent the invitation” tells our team to look for your invite. Access is only marked Connected after our team accepts the invitation in Google and confirms Manager access.
            </p>
            <label className="iwfw-check">
              <input type="checkbox" name="publishDirectly" defaultChecked={data.gbp.publishDirectly} />
              Our team may publish weekly posts and review replies directly
            </label>
          </div>
        )}

        {current.key === "review" && (
          <div className="iwfw-onboard__review">
            <ReviewBlock title="Business" items={[data.business.tradingName, data.business.phone, data.business.serviceAreas]} />
            <ReviewBlock title="Services" items={[data.services.list]} />
            <ReviewBlock title="Domain" items={[data.domain.mode === "existing" ? data.domain.existingDomain : data.domain.preferredDomain, data.domain.mode]} />
            <ReviewBlock title="Email" items={[data.email.localPart ? `${data.email.localPart}@your-domain` : ""]} />
            <ReviewBlock title="Google Business" items={[data.gbp.outcome || "Not confirmed yet", data.gbp.profileUrl]} />
            {completed && (
              <p className="iwfw-onboard__fine">
                Already submitted. You can still update details and save again.
              </p>
            )}
          </div>
        )}

        <div className="iwfw-onboard__actions">
          {step > 0 ? (
            <Button type="submit" name="intent" value="back" variant="secondary" disabled={busy}>
              Back
            </Button>
          ) : (
            <span />
          )}
          <div className="iwfw-onboard__actions-right">
            <Button type="submit" name="intent" value="save-exit" variant="ghost" disabled={busy}>
              Save &amp; exit
            </Button>
            {isLast ? (
              <Button type="submit" name="intent" value="submit" disabled={busy}>
                {busy ? "Submitting…" : "Submit onboarding"}
              </Button>
            ) : (
              <Button type="submit" name="intent" value="continue" disabled={busy}>
                {busy ? "Saving…" : "Save & continue"}
              </Button>
            )}
          </div>
        </div>
      </Form>
    </div>
  );
}

function Field({
  label,
  name,
  defaultValue,
  required,
  hint,
  multiline,
  type = "text",
}: {
  label: string;
  name: string;
  defaultValue?: string;
  required?: boolean;
  hint?: string;
  multiline?: boolean;
  type?: string;
}) {
  return (
    <label className="iwfw-field">
      <span>
        {label}
        {required ? " *" : ""}
      </span>
      {multiline ? (
        <textarea
          name={name}
          defaultValue={defaultValue}
          required={required}
          rows={4}
          className="iwfw-textarea"
        />
      ) : (
        <Input name={name} type={type} defaultValue={defaultValue} required={required} />
      )}
      {hint && <em>{hint}</em>}
    </label>
  );
}

function ReviewBlock({ title, items }: { title: string; items: string[] }) {
  const cleaned = items.map((i) => i.trim()).filter(Boolean);
  return (
    <div className="iwfw-onboard__review-block">
      <h3>{title}</h3>
      {cleaned.length > 0 ? (
        <ul>
          {cleaned.map((item) => (
            <li key={`${title}-${item.slice(0, 24)}`}>{item}</li>
          ))}
        </ul>
      ) : (
        <p>Not filled in yet</p>
      )}
    </div>
  );
}
