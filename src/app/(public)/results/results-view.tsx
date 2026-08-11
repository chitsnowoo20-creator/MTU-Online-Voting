import Image from "next/image";

import { createClient } from "@/lib/supabase/server";

type Row = {
  category_id: string;
  category_name: string;
  category_order: number;
  candidate_id: string;
  display_name: string;
  tagline: string | null;
  department_code: string | null;
  photo_path: string;
  vote_count: number;
  result_rank: number;
};

export async function ElectionResults({ electionId }: { electionId: string }) {
  const supabase = await createClient();

  const [{ data: rows }, { data: awards }, { data: ties }] = await Promise.all([
    supabase.from("election_results").select("*").eq("election_id", electionId),
    supabase.from("categories").select("id, awards(rank, label)").eq("election_id", electionId),
    supabase.from("tie_resolutions").select("category_id, justification, resolution").eq("election_id", electionId),
  ]);

  const awardsByCategory = new Map<string, Map<number, string>>(
    (awards ?? []).map((category) => [
      category.id,
      new Map(category.awards.map((award) => [award.rank, award.label])),
    ]),
  );

  const tieByCategory = new Map((ties ?? []).map((tie) => [tie.category_id, tie]));

  const finalRank = (row: Row): number => {
    const resolution = tieByCategory.get(row.category_id)?.resolution as
      | Record<string, number>
      | null
      | undefined;
    return resolution?.[row.candidate_id] ?? row.result_rank;
  };

  const categories = new Map<string, Row[]>();
  for (const row of (rows ?? []) as Row[]) {
    const list = categories.get(row.category_id) ?? [];
    list.push(row);
    categories.set(row.category_id, list);
  }

  const ordered = [...categories.entries()].sort(
    (a, b) => (a[1][0]?.category_order ?? 0) - (b[1][0]?.category_order ?? 0),
  );

  if (ordered.length === 0) {
    return (
      <div className="rounded-2xl border border-hairline bg-canvas px-6 py-16 text-center shadow-soft">
        <p className="text-4xl">🗳️</p>
        <p className="mt-3 text-body text-ink-muted">This election has no results to show.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-10">
      {ordered.map(([categoryId, all]) => {
        const labels = awardsByCategory.get(categoryId) ?? new Map();
        const tie = tieByCategory.get(categoryId);
        const sorted = all
          .slice()
          .sort((a, b) => finalRank(a) - finalRank(b) || b.vote_count - a.vote_count);
        const winners = sorted.filter((row) => labels.has(finalRank(row)));
        const others = sorted.filter((row) => !labels.has(finalRank(row)));
        const totalVotes = sorted.reduce((sum, row) => sum + row.vote_count, 0) || 1;

        return (
          <section
            key={categoryId}
            className="overflow-hidden rounded-[28px] border border-hairline bg-canvas shadow-card"
          >
            <div className="flex items-center justify-between gap-4 bg-gradient-to-r from-primary/12 via-primary/6 to-canvas px-5 py-5 sm:px-7 sm:py-6">
              <div>
                <p className="text-caption font-bold uppercase tracking-[0.14em] text-brand-ink">Official winners</p>
                <h2 className="mt-1 break-words text-headline text-ink">{all[0]?.category_name}</h2>
              </div>
              {winners.length > 0 ? (
                <span className="hidden rounded-full border border-primary/20 bg-canvas/80 px-3 py-1.5 text-caption font-semibold text-ink-muted shadow-soft sm:inline-flex">
                  {totalVotes} total vote{totalVotes === 1 ? "" : "s"}
                </span>
              ) : null}
            </div>

            {/* Winners — hero treatment */}
            <div className="divide-y divide-hairline">
              {winners.map((row) => {
                const pct = Math.round((row.vote_count / totalVotes) * 100);
                return (
                  <div
                    key={row.candidate_id}
                    className="group grid gap-4 bg-canvas p-5 transition-colors hover:bg-primary/5 sm:grid-cols-[128px_minmax(0,1fr)_minmax(120px,0.55fr)] sm:items-center sm:gap-6 sm:p-6"
                  >
                    <div className="relative order-first aspect-square w-full max-w-[180px] overflow-hidden rounded-2xl bg-surface-1 shadow-soft ring-1 ring-hairline transition-all duration-300 group-hover:shadow-lift group-hover:ring-primary/30 sm:row-span-2 sm:max-w-none">
                      <Image
                        src={
                          supabase.storage.from("candidate-photos").getPublicUrl(row.photo_path).data
                            .publicUrl
                        }
                        alt=""
                        fill
                        sizes="(max-width: 640px) 100vw, 280px"
                        className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                      />
                      {/* Soft gradient overlay for depth */}
                      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink/10 via-transparent to-transparent" aria-hidden="true" />
                    </div>

                    <div className="sm:col-start-2">
                      <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1.5 text-caption font-bold text-brand-ink">
                        {labels.get(finalRank(row))}
                      </span>
                      <p className="mt-3 text-subhead text-ink">{row.display_name}</p>
                      {row.tagline ? (
                        <p className="mt-0.5 text-caption text-ink-muted">{row.tagline}</p>
                      ) : null}
                    </div>

                    <div className="sm:col-start-3 sm:row-span-2 sm:self-center">
                      <div className="flex items-baseline justify-between text-body-sm">
                        <span className="font-bold text-ink">{pct}%</span>
                        <span className="text-ink-subtle">
                          {row.vote_count} vote{row.vote_count === 1 ? "" : "s"}
                        </span>
                      </div>
                      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-surface-2">
                        <div
                          className="h-full rounded-full bg-[image:var(--gradient-brand)]"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Runners-up — compact ranked list */}
            {others.length > 0 ? (
              <div className="border-t border-hairline px-4 py-2 sm:px-7">
                {others.map((row) => {
                  const pct = Math.round((row.vote_count / totalVotes) * 100);
                  return (
                    <div
                      key={row.candidate_id}
                      className="flex items-center gap-4 border-b border-hairline py-3 last:border-b-0"
                    >
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface-2 text-caption font-bold text-ink-muted">
                        {finalRank(row)}
                      </span>
                      <span className="flex-1 truncate text-body-sm text-ink">{row.display_name}</span>
                      <div className="hidden w-32 shrink-0 sm:block">
                        <div className="h-1.5 overflow-hidden rounded-full bg-surface-2">
                          <div className="h-full rounded-full bg-primary/40" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                      <span className="w-20 shrink-0 text-right text-caption text-ink-subtle">
                        {row.vote_count} vote{row.vote_count === 1 ? "" : "s"}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : null}

            {tie ? (
              <div className="flex items-start gap-3 border-t border-hairline bg-warning-bg px-5 py-4 sm:px-7">
                <span className="text-lg">⚖️</span>
                <div>
                  <p className="text-caption font-semibold text-warning-ink">
                    Tie resolved by the election officer
                  </p>
                  <p className="mt-0.5 text-body-sm text-ink">{tie.justification}</p>
                </div>
              </div>
            ) : null}
          </section>
        );
      })}
    </div>
  );
}
