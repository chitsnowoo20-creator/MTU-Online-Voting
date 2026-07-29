import type { Metadata } from "next";
import Link from "next/link";

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
    <main className="flex-1 bg-surface-1 px-4 py-16">
      <div className="mx-auto w-full max-w-[880px]">
        <div className="border border-hairline bg-canvas">
          <div className="flex items-center justify-between gap-4 border-b border-hairline px-6 py-4">
            <div>
              <h1 className="text-card-title">Verification queue</h1>
              <p className="text-body-sm text-ink-muted">Reviewer</p>
            </div>
            <Tag tone={rows.length > 0 ? "pending" : "locked"}>
              {rows.length} pending
            </Tag>
          </div>

          {error ? (
            <p className="px-6 py-8 text-body-sm text-error-ink">
              {error.message}
            </p>
          ) : rows.length === 0 ? (
            <p className="px-6 py-12 text-center text-body text-ink-muted">
              Nothing waiting. New submissions appear here as they arrive.
            </p>
          ) : (
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
                      <p className="text-caption text-ink-muted">{row.email}</p>
                    </td>
                    <td className="px-6 py-4 text-ink-muted">
                      {row.submitted_at ? relative(row.submitted_at) : "—"}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link href={`/review/${row.submission_id}`}>Review</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <p className="mt-4 text-caption text-ink-muted">
          Card images are visible only while a submission is pending, and are
          deleted the moment you decide.
        </p>
      </div>
    </main>
  );
}
