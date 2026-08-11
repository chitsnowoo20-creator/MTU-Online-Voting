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
        <div className="surface-panel relative w-full max-w-[560px] overflow-hidden px-6 py-12 text-center sm:px-10 sm:py-14">
          <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-primary/12 blur-3xl" />
          <span className="relative mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-2xl text-brand-ink shadow-soft">◷</span>
          <p className="relative mt-5 text-caption font-bold uppercase tracking-[0.14em] text-brand-ink">Results centre</p>
          <h1 className="relative mt-1 text-headline">Results are not yet available</h1>
          <p className="relative mt-3 text-body text-ink-muted">
            Nothing is published. Results appear here once voting has closed and
            the election officer publishes them — no running count exists before
            that.
          </p>
          <p className="relative mt-6 text-body-sm">
            <Link href="/" className="link-action">Back to the start</Link>
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
          <section className="mt-12 rounded-3xl border border-hairline bg-canvas p-5 shadow-soft sm:p-7">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="eyebrow-label">Election archive</p>
                <h2 className="mt-1 text-card-title">Earlier elections</h2>
              </div>
              <p className="text-caption text-ink-muted">Browse published results</p>
            </div>
            <ul className="mt-5 divide-y divide-hairline border-y border-hairline">
              {earlier.map((election) => (
                <li key={election.id}>
                  <Link
                    href={`/results/${election.id}`}
                    className="group flex items-center justify-between gap-4 px-1 py-4 text-body-sm no-underline hover:no-underline"
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-semibold text-ink transition-colors group-hover:text-brand-ink">
                        {election.name}
                      </span>
                      <span className="mt-0.5 block text-caption text-ink-muted">
                        Closed {formatMoment(election.closes_at)}
                      </span>
                    </span>
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/8 text-brand-ink transition-all group-hover:translate-x-1 group-hover:bg-primary/15">
                      →
                    </span>
                  </Link>
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
