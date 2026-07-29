import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ElectionResults } from "../results-view";
import { formatMoment } from "@/lib/election/schedule";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Results · Campus Elections" };
export const dynamic = "force-dynamic";

export default async function ArchivedResultsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  /*
   * The `state = PUBLISHED` filter is belt to the RLS policy's braces: an
   * unpublished election is already invisible to this query, so guessing an id
   * reveals nothing.
   */
  const { data: election } = await supabase
    .from("elections")
    .select("id, name, closes_at")
    .eq("id", id)
    .eq("state", "PUBLISHED")
    .maybeSingle();

  if (!election) notFound();

  return (
    <main className="flex-1 bg-surface-1 px-4 py-16">
      <div className="mx-auto w-full max-w-[960px]">
        <p className="mb-4 text-body-sm">
          <Link href="/results">← Latest results</Link>
        </p>

        <div className="mb-8">
          <p className="text-body-sm text-ink-muted">
            Final result · {formatMoment(election.closes_at)}
          </p>
          <h1 className="text-display-md">{election.name}</h1>
        </div>

        <ElectionResults electionId={election.id} />

        <p className="mt-8 text-caption text-ink-muted">
          Counts are final and were published after voting closed. Ballots carry
          no voter identity, so these totals cannot be traced back to anyone.
        </p>
      </div>
    </main>
  );
}
