import type { Metadata } from "next";
import Link from "next/link";

import { StaffPage } from "@/components/staff/shell";
import { Tag } from "@/components/ui/tag";
import { requireRole } from "@/lib/auth/guards";
import { describeEntry, type AuditRow } from "@/lib/db/audit";
import type { Database } from "@/lib/db/database.types";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Admin · Campus Elections" };

// Counts and recent activity go stale the moment anyone acts on them.
export const dynamic = "force-dynamic";

const RECENT_LIMIT = 6;

function StatTile({
  label,
  value,
  note,
}: {
  label: string;
  value: number | string;
  note?: string;
}) {
  return (
    <div className="flex flex-col gap-1 bg-canvas p-6">
      <dt className="text-body-sm text-ink-muted">{label}</dt>
      <dd className="text-display-md text-ink">{value}</dd>
      {note ? <p className="text-caption text-ink-subtle">{note}</p> : null}
    </div>
  );
}

export default async function AdminPage() {
  await requireRole(["ADMIN"], "/admin");
  const supabase = await createClient();

  /*
   * This page used to be three hardcoded links to /admin/roles, /admin/departments
   * and /admin/audit — every one of them already a row in the nav's Admin
   * section. A menu beside a menu. It now answers the question the nav cannot:
   * what is the current state of the things an admin looks after.
   *
   * Both reads are admin-gated already. `admin_user_directory` is a
   * security-definer view with `is_admin()` in its body, and `audit_log` has a
   * select policy that requires the same, so a non-admin gets empty results
   * rather than a leak — on top of the requireRole above.
   */
  const [{ data: directory }, { data: departments }, { data: recent }] =
    await Promise.all([
      supabase
        .from("admin_user_directory")
        .select("profile_id, email, voter_status, roles"),
      supabase.from("departments").select("code, active"),
      supabase
        .from("audit_log")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(RECENT_LIMIT),
    ]);

  const users = directory ?? [];
  const emails = new Map(
    users.map((row) => [row.profile_id ?? "", row.email ?? ""]),
  );
  const emailFor = (id: string | null) => (id ? (emails.get(id) ?? null) : null);

  type AppRole = Database["public"]["Enums"]["app_role"];
  const holders = (role: AppRole) =>
    users.filter((row) => (row.roles ?? []).includes(role)).length;

  const pending = users.filter((row) => row.voter_status === "PENDING").length;
  const approved = users.filter((row) => row.voter_status === "APPROVED").length;
  const activeDepartments = (departments ?? []).filter((d) => d.active).length;

  const entries = (recent ?? []) as AuditRow[];

  return (
    <StaffPage title="Admin" subtitle="Roles, departments and the audit trail">
      <dl className="grid gap-px overflow-hidden rounded-2xl border border-hairline bg-hairline shadow-soft sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Accounts" value={users.length} />
        <StatTile
          label="Approved voters"
          value={approved}
          note={`${users.length - approved} not approved`}
        />
        <StatTile
          label="Awaiting review"
          value={pending}
          note={pending > 0 ? "Reviewers decide these" : "Queue is clear"}
        />
        <StatTile
          label="Departments"
          value={activeDepartments}
          note={`${(departments ?? []).length - activeDepartments} inactive`}
        />
      </dl>

      <div className="mt-6 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <section className="surface-panel overflow-hidden">
          <div className="flex items-center justify-between gap-4 border-b border-hairline px-6 py-4">
            <h2 className="text-card-title">Recent activity</h2>
            <Link href="/admin/audit" className="text-caption">
              Full audit log
            </Link>
          </div>
          {entries.length === 0 ? (
            <p className="px-6 py-10 text-center text-body-sm text-ink-muted">
              Nothing has been recorded yet.
            </p>
          ) : (
            <ul className="divide-y divide-hairline">
              {entries.map((entry) => (
                <li key={entry.id} className="px-6 py-3.5">
                  <p className="text-body-sm text-ink">
                    {describeEntry(entry, emailFor)}
                  </p>
                  <p className="mt-0.5 text-caption text-ink-muted">
                    {new Date(entry.created_at).toLocaleString("en-GB", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                    {" · "}
                    {emailFor(entry.actor_id) ?? "System"}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="surface-panel overflow-hidden">
          <div className="flex items-center justify-between gap-4 border-b border-hairline px-5 py-4">
            <h2 className="text-card-title">Staff access</h2>
            <Link href="/admin/roles" className="text-caption">
              Manage
            </Link>
          </div>
          <ul className="divide-y divide-hairline">
            {(
              [
                { role: "ADMIN", label: "Admin" },
                { role: "ELECTION_OFFICER", label: "Election officer" },
                { role: "REVIEWER", label: "Reviewer" },
              ] satisfies { role: AppRole; label: string }[]
            ).map(({ role, label }) => (
              <li
                key={role}
                className="flex items-center justify-between gap-3 px-5 py-3"
              >
                <span className="text-body-sm text-ink">{label}</span>
                <Tag tone={holders(role) > 0 ? "info" : "locked"}>
                  {holders(role)}
                </Tag>
              </li>
            ))}
          </ul>
          <p className="border-t border-hairline px-5 py-3 text-caption text-ink-muted">
            Roles grant staff tools only. Every approved user can already vote.
          </p>
        </section>
      </div>
    </StaffPage>
  );
}
