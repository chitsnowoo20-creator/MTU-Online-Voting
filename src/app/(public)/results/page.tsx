import type { Metadata } from "next";
import Link from "next/link";

import { ElectionResults } from "./results-view";
import { formatMoment } from "@/lib/election/schedule";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Results · Campus Elections" };
export const dynamic = "force-dynamic";

export default async function ResultsPage() {
  const supabase = await createClient();

  /*
   * Only PUBLISHED elections are selectable at all — the RLS policy on
   * `elections` sees to that, so an unpublished one cannot appear here even by
   * mistake.
   */
  const { data: published } = await supabase
    .from("elections")
    .select("id, name, closes_at")
    .eq("state", "PUBLISHED")
    .order("closes_at", { ascending: false, nullsFirst: false });

  const [latest, ...earlier] = published ?? [];

  if (!latest) {
    return (
      <main className="surface-page flex flex-1 items-center justify-center px-4 py-16">
        <div className="surface-panel w-full max-w-[560px] px-6 py-12 text-center">
          <h1 className="text-card-title">Results are not yet available</h1>
          <p className="mt-2 text-body text-ink-muted">
            Nothing is published. Results appear here once voting has closed and
            the election officer publishes them — no running count exists before
            that.
          </p>
          <p className="mt-6 text-body-sm">
            <Link href="/">Back to the start</Link>
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="surface-page flex-1 px-4 py-10 sm:py-16">
      <div className="mx-auto w-full max-w-[960px]">
        <div className="mb-8">
          <p className="text-body-sm text-ink-muted">
            Final result · {formatMoment(latest.closes_at)}
          </p>
          <h1 className="break-words text-display-md">{latest.name}</h1>
        </div>

        <ElectionResults electionId={latest.id} />

        {earlier.length > 0 ? (
          <section className="mt-12 border-t border-hairline pt-6">
            <h2 className="text-card-title">Earlier elections</h2>
            <ul className="mt-3 flex flex-col gap-2 text-body-sm">
              {earlier.map((election) => (
                <li key={election.id} className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
                  <Link href={`/results/${election.id}`}>{election.name}</Link>
                  <span className="text-ink-muted">
                    {formatMoment(election.closes_at)}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <p className="mt-8 text-caption text-ink-muted">
          Counts are final and were published after voting closed. Ballots carry
          no voter identity, so these totals cannot be traced back to anyone.
        </p>
      </div>
    </main>
  );
}
