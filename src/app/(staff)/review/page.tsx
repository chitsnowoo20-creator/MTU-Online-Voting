import type { Metadata } from "next";
import Link from "next/link";

import { DashboardPage, RailCard } from "@/components/ui/dashboard-page";
import { DataTable } from "@/components/ui/data-table";
import { Tag } from "@/components/ui/tag";
import { requireRole } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Verification queue · Campus Elections",
};

// The queue is a live worklist; a cached copy would show already-decided rows.
export const dynamic = "force-dynamic";

function relative(iso: string): string {
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

export default async function ReviewQueuePage() {
  await requireRole(["REVIEWER"], "/review");

  const supabase = await createClient();
  const { data: queue, error } = await supabase
    .from("verification_queue")
    .select("submission_id, full_name, email, submitted_at")
    .order("submitted_at", { ascending: true });

  const rows = queue ?? [];

  return (
    <DashboardPage
      eyebrow="Reviewer"
      title="Verification queue"
      subtitle="Oldest submissions first."
      status={
        <Tag tone={rows.length > 0 ? "pending" : "locked"}>
          {rows.length} pending
        </Tag>
      }
      rail={
        <RailCard title="Handling ID cards">
          <p className="text-caption text-ink-muted">
            Card images are visible only while a submission is pending, and are
            deleted the moment you decide.
          </p>
        </RailCard>
      }
    >
      <section className="surface-panel overflow-hidden">
        {error ? (
          <p className="px-6 py-8 text-body-sm text-error-ink">
            {error.message}
          </p>
        ) : rows.length === 0 ? (
          <div className="relative overflow-hidden px-6 py-14 text-center">
            <div className="pointer-events-none absolute left-1/2 top-1/2 h-44 w-44 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/10 blur-3xl" />
            <div className="relative mx-auto max-w-sm">
              <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-success-bg text-2xl text-success-ink shadow-soft">
                ✓
              </span>
              <p className="mt-5 text-card-title text-ink">Queue is clear</p>
              <p className="mt-2 text-body text-ink-muted">
                Nothing is waiting for review. New submissions appear here as
                they arrive.
              </p>
            </div>
          </div>
        ) : (
          <>
            <ul className="flex flex-col divide-y divide-hairline md:hidden">
              {rows.map((row) => (
                // Whole row taps through to the submission; the standalone
                // "Review" link was a 17px target.
                <li key={row.submission_id}>
                  <Link
                    href={`/review/${row.submission_id}`}
                    className="block px-6 py-4 no-underline hover:bg-primary/5 hover:no-underline"
                  >
                    <span className="block text-ink">{row.full_name}</span>
                    <span className="block text-caption text-ink-muted">
                      {row.email}
                    </span>
                    <span className="mt-2 block text-body-sm text-ink-muted">
                      Submitted{" "}
                      {row.submitted_at ? relative(row.submitted_at) : "—"}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>

            <div className="hidden md:block">
              <DataTable>
                <table className="w-full border-collapse text-body-sm">
                  <thead>
                    <tr className="border-b border-hairline text-left text-caption text-ink-muted">
                      <th className="px-6 py-3 font-normal">Submitter</th>
                      <th className="px-6 py-3 font-normal">Submitted</th>
                      <th className="px-6 py-3 font-normal" />
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => (
                      <tr
                        key={row.submission_id}
                        className="border-b border-hairline last:border-b-0"
                      >
                        <td className="px-6 py-4">
                          <p className="text-ink">{row.full_name}</p>
                          <p className="text-caption text-ink-muted">
                            {row.email}
                          </p>
                        </td>
                        <td className="px-6 py-4 text-ink-muted">
                          {row.submitted_at ? relative(row.submitted_at) : "—"}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <Link href={`/review/${row.submission_id}`}>
                            Review
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </DataTable>
            </div>
          </>
        )}
      </section>
    </DashboardPage>
  );
}
