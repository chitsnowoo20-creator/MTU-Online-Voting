import type { Metadata } from "next";
import Link from "next/link";

import { StaffPage } from "@/components/staff/shell";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { Tag } from "@/components/ui/tag";
import { requireRole } from "@/lib/auth/guards";
import {
  AUDIT_GROUPS,
  describeEntry,
  type AuditGroupKey,
  type AuditRow,
} from "@/lib/db/audit";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Audit log · Campus Elections" };
export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<{
    group?: string;
    from?: string;
    to?: string;
    page?: string;
  }>;
}) {
  await requireRole(["ADMIN"], "/admin/audit");
  const { group, from, to, page } = await searchParams;

  const pageIndex = Math.max(0, Number.parseInt(page ?? "0", 10) || 0);
  const supabase = await createClient();

  let query = supabase
    .from("audit_log")
    .select("*", { count: "exact" })
    .order("id", { ascending: false })
    .range(pageIndex * PAGE_SIZE, pageIndex * PAGE_SIZE + PAGE_SIZE - 1);

  const groupKey = group as AuditGroupKey | undefined;
  if (groupKey && groupKey in AUDIT_GROUPS) {
    query = query.in("action", [...AUDIT_GROUPS[groupKey].actions]);
  }
  if (from) query = query.gte("created_at", new Date(from).toISOString());
  if (to) {
    // `to` is a date; include the whole of that day.
    const end = new Date(to);
    end.setDate(end.getDate() + 1);
    query = query.lt("created_at", end.toISOString());
  }

  const { data: rows, count, error } = await query;
  const entries = (rows ?? []) as AuditRow[];

  /*
   * Resolve actor and target ids to emails in one lookup. `admin_user_directory`
   * is the only route to an email — auth.users is not readable by
   * `authenticated`, and this view carries its own is_admin() check.
   */
  const ids = [
    ...new Set(
      entries.flatMap((entry) =>
        [entry.actor_id, entry.entity_id].filter(
          (id): id is string => id !== null,
        ),
      ),
    ),
  ];

  const { data: people } = ids.length
    ? await supabase
        .from("admin_user_directory")
        .select("profile_id, email")
        .in("profile_id", ids)
    : { data: [] };

  const emails = new Map(
    (people ?? []).map((person) => [person.profile_id, person.email]),
  );
  const emailFor = (id: string | null) => (id ? (emails.get(id) ?? null) : null);

  const total = count ?? 0;
  const hasNext = (pageIndex + 1) * PAGE_SIZE < total;

  const pageHref = (next: number) => {
    const params = new URLSearchParams();
    if (group) params.set("group", group);
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    if (next > 0) params.set("page", String(next));
    const query = params.toString();
    return `/admin/audit${query ? `?${query}` : ""}`;
  };

  return (
    <StaffPage
      title="Audit log"
      subtitle="Every privileged action, append-only. Nothing can edit it."
      actions={<Tag tone="locked">Read-only</Tag>}
    >
      {/*
        * Three separate controls, each its own framed cell.
        *
        * The premium part is not the frame but what sits inside it: the label
        * lives in the cell above a borderless control, so a field reads as one
        * object instead of a caption stranded above a box. The select drops its
        * OS chrome (`appearance-none`) for a chevron in `currentColor`, so it
        * matches the date fields rather than rendering a system dropdown beside
        * them. `items-stretch` lets the button match the fields' height without
        * hard-coding one. Focus is left to the global `:focus-visible` outline.
        */}
      <form className="mb-6 flex flex-wrap items-stretch gap-3">
        <label htmlFor="group" className="relative flex w-full cursor-pointer flex-col justify-center rounded-2xl border border-hairline bg-canvas px-5 py-2.5 shadow-soft transition-colors focus-within:border-primary sm:w-64">
          <span className="text-caption text-ink-muted">Action type</span>
          <select
            id="group"
            name="group"
            defaultValue={group ?? ""}
            className="w-full cursor-pointer appearance-none truncate bg-transparent pr-6 text-body text-ink outline-none"
          >
            <option value="">Everything</option>
            {Object.entries(AUDIT_GROUPS).map(([key, value]) => (
              <option key={key} value={key}>
                {value.label}
              </option>
            ))}
          </select>
          <svg
            aria-hidden="true"
            viewBox="0 0 20 20"
            className="pointer-events-none absolute bottom-4 right-4 h-3 w-3 text-ink-muted"
            fill="currentColor"
          >
            <path d="M10 13 4 7h12Z" />
          </svg>
        </label>

        <label htmlFor="from" className="flex min-w-[140px] flex-1 cursor-pointer flex-col justify-center rounded-2xl border border-hairline bg-canvas px-5 py-2.5 shadow-soft transition-colors focus-within:border-primary sm:w-44 sm:flex-none">
          <span className="text-caption text-ink-muted">From</span>
          <input
            id="from"
            name="from"
            type="date"
            defaultValue={from}
            className="w-full bg-transparent text-body text-ink outline-none"
          />
        </label>

        <label htmlFor="to" className="flex min-w-[140px] flex-1 cursor-pointer flex-col justify-center rounded-2xl border border-hairline bg-canvas px-5 py-2.5 shadow-soft transition-colors focus-within:border-primary sm:w-44 sm:flex-none">
          <span className="text-caption text-ink-muted">To</span>
          <input
            id="to"
            name="to"
            type="date"
            defaultValue={to}
            className="w-full bg-transparent text-body text-ink outline-none"
          />
        </label>

        <Button
          type="submit"
          variant="tertiary"
          className="!w-full !rounded-2xl !px-6 sm:!w-auto"
        >
          Filter
        </Button>
      </form>

      <div className="surface-panel">
        {error ? (
          <p className="px-6 py-8 text-body-sm text-error-ink">
            {error.message}
          </p>
        ) : entries.length === 0 ? (
          <p className="px-6 py-12 text-center text-body text-ink-muted">
            No entries match those filters.
          </p>
        ) : (
          <>
            <ul className="flex flex-col divide-y divide-hairline md:hidden">
              {entries.map((entry) => (
                <li key={entry.id} className="px-6 py-4">
                  <p className="text-body-sm text-ink-muted">
                    {new Date(entry.created_at).toLocaleString("en-GB", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </p>
                  <p className="mt-1 text-body-sm text-ink-muted">
                    {emailFor(entry.actor_id) ?? (
                      <span className="text-ink-subtle">System</span>
                    )}
                  </p>
                  <div className="mt-2 text-body-sm">
                    {describeEntry(entry, emailFor)}
                  </div>
                </li>
              ))}
            </ul>

            <div className="hidden md:block">
              <DataTable minWidth={720}>
                <table className="w-full border-collapse text-body-sm">
                  <thead>
                    <tr className="border-b border-hairline text-left text-caption text-ink-muted">
                      <th className="px-6 py-3 font-normal">When</th>
                      <th className="px-6 py-3 font-normal">Actor</th>
                      <th className="px-6 py-3 font-normal">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {entries.map((entry) => (
                      <tr
                        key={entry.id}
                        className="border-b border-hairline last:border-b-0 align-top"
                      >
                        <td className="px-6 py-4 whitespace-nowrap text-ink-muted">
                          {new Date(entry.created_at).toLocaleString("en-GB", {
                            dateStyle: "medium",
                            timeStyle: "short",
                          })}
                        </td>
                        <td className="px-6 py-4 text-ink-muted">
                          {emailFor(entry.actor_id) ?? (
                            <span className="text-ink-subtle">System</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          {describeEntry(entry, emailFor)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </DataTable>
            </div>
          </>
        )}
      </div>

      <div className="mt-4 flex items-center justify-between gap-4 text-body-sm">
        <span className="text-ink-muted">
          {total} entr{total === 1 ? "y" : "ies"}
          {total > 0
            ? ` · showing ${pageIndex * PAGE_SIZE + 1}–${Math.min((pageIndex + 1) * PAGE_SIZE, total)}`
            : ""}
        </span>
        <span className="flex gap-4">
          {pageIndex > 0 ? (
            <Link href={pageHref(pageIndex - 1)} className="inline-flex min-h-11 items-center">← Newer</Link>
          ) : null}
          {hasNext ? <Link href={pageHref(pageIndex + 1)} className="inline-flex min-h-11 items-center">Older →</Link> : null}
        </span>
      </div>

      <p className="mt-4 text-caption text-ink-muted">
        The log is append-only — a database trigger rejects any update or
        delete, including from here. Rows written by a scheduled job show as
        System.
      </p>
    </StaffPage>
  );
}
