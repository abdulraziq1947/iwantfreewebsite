import { Form, redirect, useNavigation } from "react-router";
import { createDb } from "@iwfw/db";
import {
  assignableRolesFor,
  assertCanManageTeam,
  createCustomerUser,
  createStaffMember,
  grantStaffRoleToExistingUser,
  listStaffMembers,
  PLATFORM_ROLE_LABELS,
} from "../lib/admin-team.server";
import {
  clientIpFromRequest,
} from "../lib/audit-log.server";
import { formatAdminDate } from "../lib/admin-ops";
import { getEnv } from "../lib/env.server";
import { requireStaffSession } from "../lib/session.server";
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

export default function AdminTeamPage({
  loaderData,
  actionData,
}: Route.ComponentProps) {
  const navigation = useNavigation();
  const busy = navigation.state !== "idle";
  const roles = loaderData.assignableRoles;

  return (
    <div className="iwfw-admin-page">
      <header className="iwfw-admin-page__header">
        <div>
          <p className="iwfw-admin-page__eyebrow">Access</p>
          <h1>Team</h1>
          <p>
            Add staff to the operations console, grant roles to existing
            accounts, or create customer logins.
          </p>
        </div>
        <p className="iwfw-admin-page__count">
          {loaderData.staff.length} staff
        </p>
      </header>

      {actionData?.ok && actionData.message ? (
        <p className="iwfw-admin-banner iwfw-admin-banner--ok" role="status">
          {actionData.message}
        </p>
      ) : null}
      {actionData?.error ? (
        <p className="iwfw-admin-banner iwfw-admin-banner--error" role="alert">
          {actionData.error}
        </p>
      ) : null}

      <section className="iwfw-admin-panel">
        <h2>Staff accounts</h2>
        <div className="iwfw-admin-table-wrap">
          <table className="iwfw-admin-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Roles</th>
                <th>Joined</th>
              </tr>
            </thead>
            <tbody>
              {loaderData.staff.map((member) => (
                <tr key={member.userId}>
                  <td>{member.name}</td>
                  <td>{member.email}</td>
                  <td>
                    {member.roles
                      .map((role) => PLATFORM_ROLE_LABELS[role] ?? role)
                      .join(", ")}
                  </td>
                  <td>{formatAdminDate(member.createdAt)}</td>
                </tr>
              ))}
              {loaderData.staff.length === 0 ? (
                <tr>
                  <td colSpan={4}>No staff accounts yet.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <div className="iwfw-admin-team-grid">
        <section className="iwfw-admin-panel">
          <h2>Add staff</h2>
          <p className="iwfw-admin-panel__lead">
            Creates a new login for the operations console.
          </p>
          <Form method="post" className="iwfw-admin-form">
            <input type="hidden" name="intent" value="create_staff" />
            <label className="iwfw-field">
              <span>Full name</span>
              <input className="iwfw-control" name="name" required />
            </label>
            <label className="iwfw-field">
              <span>Email</span>
              <input
                className="iwfw-control"
                name="email"
                type="email"
                required
                autoComplete="off"
              />
            </label>
            <label className="iwfw-field">
              <span>Temporary password</span>
              <input
                className="iwfw-control"
                name="password"
                type="password"
                required
                minLength={10}
                autoComplete="new-password"
              />
              <em>At least 10 characters. Share it securely once.</em>
            </label>
            <label className="iwfw-field">
              <span>Role</span>
              <select className="iwfw-control" name="role" required>
                {roles.map((role) => (
                  <option key={role} value={role}>
                    {PLATFORM_ROLE_LABELS[role]}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="submit"
              className="iwfw-btn iwfw-btn--primary"
              disabled={busy}
            >
              {busy ? "Saving…" : "Create staff account"}
            </button>
          </Form>
        </section>

        <section className="iwfw-admin-panel">
          <h2>Grant role to existing user</h2>
          <p className="iwfw-admin-panel__lead">
            Promote an existing account into staff access.
          </p>
          <Form method="post" className="iwfw-admin-form">
            <input type="hidden" name="intent" value="grant_role" />
            <label className="iwfw-field">
              <span>Account email</span>
              <input
                className="iwfw-control"
                name="email"
                type="email"
                required
                autoComplete="off"
              />
            </label>
            <label className="iwfw-field">
              <span>Role</span>
              <select className="iwfw-control" name="role" required>
                {roles.map((role) => (
                  <option key={role} value={role}>
                    {PLATFORM_ROLE_LABELS[role]}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="submit"
              className="iwfw-btn iwfw-btn--outline"
              disabled={busy}
            >
              {busy ? "Saving…" : "Grant role"}
            </button>
          </Form>
        </section>

        <section className="iwfw-admin-panel">
          <h2>Add customer user</h2>
          <p className="iwfw-admin-panel__lead">
            Creates a customer login and prospect website folder. They sign in
            on the customer site, not here.
          </p>
          <Form method="post" className="iwfw-admin-form">
            <input type="hidden" name="intent" value="create_customer" />
            <label className="iwfw-field">
              <span>Full name</span>
              <input className="iwfw-control" name="name" required />
            </label>
            <label className="iwfw-field">
              <span>Business / trading name</span>
              <input className="iwfw-control" name="tradingName" required />
            </label>
            <label className="iwfw-field">
              <span>Email</span>
              <input
                className="iwfw-control"
                name="email"
                type="email"
                required
                autoComplete="off"
              />
            </label>
            <label className="iwfw-field">
              <span>Temporary password</span>
              <input
                className="iwfw-control"
                name="password"
                type="password"
                required
                minLength={10}
                autoComplete="new-password"
              />
            </label>
            <button
              type="submit"
              className="iwfw-btn iwfw-btn--outline"
              disabled={busy}
            >
              {busy ? "Saving…" : "Create customer account"}
            </button>
          </Form>
        </section>
      </div>
    </div>
  );
}
