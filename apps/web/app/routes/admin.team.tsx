import { Form, redirect, useNavigation } from "react-router";
import { createDb } from "@iwfw/db";
import { assignableRolesFor, PLATFORM_ROLE_LABELS } from "../lib/admin-team";
import {
  assertCanManageTeam,
  createCustomerUser,
  createStaffMember,
  grantStaffRoleToExistingUser,
  listStaffMembers,
} from "../lib/admin-team.server";
import { clientIpFromRequest } from "../lib/audit-log.server";
import { formatAdminDate } from "../lib/admin-ops";
import { getEnv } from "../lib/env.server";
import { requireStaffSession } from "../lib/session.server";
import { AdminCount, AdminPageHeader } from "../components/admin-ui";
import type { Route } from "./+types/admin.team";

export function meta(_args: Route.MetaArgs) {
  return [{ title: "Team — Admin" }];
}

export async function loader({ request, context }: Route.LoaderArgs) {
  const auth = await requireStaffSession(request, context);
  try {
    assertCanManageTeam(auth);
  } catch {
    throw redirect("/admin");
  }
  const db = createDb(getEnv(context).DB);
  const staff = await listStaffMembers(db);
  return {
    staff,
    assignableRoles: assignableRolesFor(auth),
  };
}

export async function action({ request, context }: Route.ActionArgs) {
  const auth = await requireStaffSession(request, context);
  try {
    assertCanManageTeam(auth);
  } catch {
    return { error: "You do not have permission to manage team members." };
  }

  const db = createDb(getEnv(context).DB);
  const form = await request.formData();
  const intent = String(form.get("intent") ?? "");
  const ip = clientIpFromRequest(request);

  if (intent === "create_staff") {
    const result = await createStaffMember(db, auth, {
      name: String(form.get("name") ?? ""),
      email: String(form.get("email") ?? ""),
      password: String(form.get("password") ?? ""),
      role: String(form.get("role") ?? ""),
      ip,
    });
    if (!result.ok) return { error: result.error, intent };
    return { ok: true, intent, message: "Staff account created." };
  }

  if (intent === "grant_role") {
    const result = await grantStaffRoleToExistingUser(db, auth, {
      email: String(form.get("email") ?? ""),
      role: String(form.get("role") ?? ""),
      ip,
    });
    if (!result.ok) return { error: result.error, intent };
    return { ok: true, intent, message: "Staff role granted." };
  }

  if (intent === "create_customer") {
    const result = await createCustomerUser(db, auth, {
      name: String(form.get("name") ?? ""),
      email: String(form.get("email") ?? ""),
      password: String(form.get("password") ?? ""),
      tradingName: String(form.get("tradingName") ?? ""),
      ip,
    });
    if (!result.ok) return { error: result.error, intent };
    return {
      ok: true,
      intent,
      message: "Customer account created. They can log in on the customer site.",
    };
  }

  return { error: "Unknown action." };
}

export default function AdminTeamPage({ loaderData, actionData }: Route.ComponentProps) {
  const navigation = useNavigation();
  const busy = navigation.state !== "idle";
  const roles = loaderData.assignableRoles;

  return (
    <div className="adm-page">
      <AdminPageHeader
        kicker="Access"
        title="Team"
        lead="Add staff to the operations console, grant roles to existing accounts, or create customer logins."
        aside={<AdminCount value={loaderData.staff.length} label="staff" />}
      />

      {actionData?.ok && actionData.message ? (
        <p className="adm-alert adm-alert--ok" role="status">
          {actionData.message}
        </p>
      ) : null}
      {actionData?.error ? (
        <p className="adm-alert adm-alert--error" role="alert">
          {actionData.error}
        </p>
      ) : null}

      <section className="adm-sheet" aria-labelledby="adm-staff-h">
        <div className="adm-sheet__head">
          <h2 id="adm-staff-h">Staff accounts</h2>
        </div>
        {loaderData.staff.length === 0 ? (
          <p className="adm-empty">No staff accounts yet.</p>
        ) : (
          <div className="adm-table-wrap">
            <table className="adm-table">
              <thead>
                <tr>
                  <th scope="col">Name</th>
                  <th scope="col">Email</th>
                  <th scope="col">Roles</th>
                  <th scope="col" className="is-num">
                    Joined
                  </th>
                </tr>
              </thead>
              <tbody>
                {loaderData.staff.map((member) => (
                  <tr key={member.userId}>
                    <td>
                      <strong>{member.name}</strong>
                    </td>
                    <td>{member.email}</td>
                    <td>
                      {member.roles
                        .map((role) => PLATFORM_ROLE_LABELS[role] ?? role)
                        .join(", ")}
                    </td>
                    <td className="is-num">{formatAdminDate(member.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <div className="adm-grid--3">
        <section className="adm-sheet" aria-labelledby="adm-add-staff">
          <div className="adm-sheet__head">
            <h2 id="adm-add-staff">Add staff</h2>
          </div>
          <p className="adm-sheet__lead">
            Creates a new login for the operations console.
          </p>
          <Form method="post" className="adm-form">
            <input type="hidden" name="intent" value="create_staff" />
            <label className="adm-field">
              <span>Full name</span>
              <input className="adm-input" name="name" required />
            </label>
            <label className="adm-field">
              <span>Email</span>
              <input
                className="adm-input"
                name="email"
                type="email"
                required
                autoComplete="off"
              />
            </label>
            <label className="adm-field">
              <span>Temporary password</span>
              <input
                className="adm-input"
                name="password"
                type="password"
                required
                minLength={10}
                autoComplete="new-password"
              />
              <em>At least 10 characters. Share it securely once.</em>
            </label>
            <label className="adm-field">
              <span>Role</span>
              <select className="adm-input" name="role" required>
                {roles.map((role) => (
                  <option key={role} value={role}>
                    {PLATFORM_ROLE_LABELS[role]}
                  </option>
                ))}
              </select>
            </label>
            <button type="submit" className="adm-btn adm-btn--ink" disabled={busy}>
              {busy ? "Saving…" : "Create staff account"}
            </button>
          </Form>
        </section>

        <section className="adm-sheet" aria-labelledby="adm-grant-role">
          <div className="adm-sheet__head">
            <h2 id="adm-grant-role">Grant role to existing user</h2>
          </div>
          <p className="adm-sheet__lead">
            Promote an existing account into staff access.
          </p>
          <Form method="post" className="adm-form">
            <input type="hidden" name="intent" value="grant_role" />
            <label className="adm-field">
              <span>Account email</span>
              <input
                className="adm-input"
                name="email"
                type="email"
                required
                autoComplete="off"
              />
            </label>
            <label className="adm-field">
              <span>Role</span>
              <select className="adm-input" name="role" required>
                {roles.map((role) => (
                  <option key={role} value={role}>
                    {PLATFORM_ROLE_LABELS[role]}
                  </option>
                ))}
              </select>
            </label>
            <button type="submit" className="adm-btn" disabled={busy}>
              {busy ? "Saving…" : "Grant role"}
            </button>
          </Form>
        </section>

        <section className="adm-sheet" aria-labelledby="adm-add-customer">
          <div className="adm-sheet__head">
            <h2 id="adm-add-customer">Add customer user</h2>
          </div>
          <p className="adm-sheet__lead">
            Creates a customer login and prospect website folder. They sign in on the
            customer site, not here.
          </p>
          <Form method="post" className="adm-form">
            <input type="hidden" name="intent" value="create_customer" />
            <label className="adm-field">
              <span>Full name</span>
              <input className="adm-input" name="name" required />
            </label>
            <label className="adm-field">
              <span>Business / trading name</span>
              <input className="adm-input" name="tradingName" required />
            </label>
            <label className="adm-field">
              <span>Email</span>
              <input
                className="adm-input"
                name="email"
                type="email"
                required
                autoComplete="off"
              />
            </label>
            <label className="adm-field">
              <span>Temporary password</span>
              <input
                className="adm-input"
                name="password"
                type="password"
                required
                minLength={10}
                autoComplete="new-password"
              />
            </label>
            <button type="submit" className="adm-btn" disabled={busy}>
              {busy ? "Saving…" : "Create customer account"}
            </button>
          </Form>
        </section>
      </div>
    </div>
  );
}
