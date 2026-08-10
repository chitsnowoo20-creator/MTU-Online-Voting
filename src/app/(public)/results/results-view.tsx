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
        const topWinner = winners.find((row) => finalRank(row) === 1) ?? winners[0];

        return (
          <section
            key={categoryId}
            className="overflow-hidden rounded-[28px] border border-hairline bg-canvas shadow-card"
          >
            <div className="flex items-center justify-between gap-4 bg-[image:var(--gradient-mesh)] bg-inverse-canvas px-5 py-4 sm:px-7 sm:py-5">
              <h2 className="break-words text-headline text-inverse-ink">{all[0]?.category_name}</h2>
              {topWinner ? (
                <span className="hidden rounded-full bg-white/10 px-3 py-1.5 text-caption font-semibold text-inverse-ink-muted sm:inline-flex">
                  {totalVotes} total vote{totalVotes === 1 ? "" : "s"}
                </span>
              ) : null}
            </div>

            {/* Winners — hero treatment */}
            <div className="grid gap-px bg-hairline sm:grid-cols-2 lg:grid-cols-3">
              {winners.map((row) => {
                const isTopRank = finalRank(row) === 1;
                const pct = Math.round((row.vote_count / totalVotes) * 100);
                return (
                  <div
                    key={row.candidate_id}
                    className={
                      "card-hover relative bg-canvas p-5 sm:p-6 " +
                      (isTopRank ? "bg-[image:linear-gradient(180deg,#fff9ec,white_35%)]" : "")
                    }
                  >
                    {isTopRank ? (
                      <span className="absolute right-5 top-5 text-2xl">👑</span>
                    ) : null}
                    <span
                      className={
                        "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-caption font-bold " +
                        (isTopRank
                          ? "bg-[image:var(--gradient-gold)] text-accent-ink"
                          : "bg-primary/10 text-brand-ink")
                      }
                    >
                      {labels.get(finalRank(row))}
                    </span>

                    <div
                      className={
                        "relative my-4 aspect-[4/5] w-full overflow-hidden rounded-2xl bg-surface-1 " +
                        (isTopRank ? "ring-4 ring-[--color-accent] ring-offset-2" : "")
                      }
                    >
                      <Image
                        src={
                          supabase.storage.from("candidate-photos").getPublicUrl(row.photo_path).data
                            .publicUrl
                        }
                        alt=""
                        fill
                        sizes="(max-width: 640px) 100vw, 280px"
                        className="object-cover"
                      />
                    </div>

                    <p className="text-subhead text-ink">{row.display_name}</p>
                    {row.tagline ? (
                      <p className="mt-0.5 text-caption text-ink-muted">{row.tagline}</p>
                    ) : null}

                    <div className="mt-4">
                      <div className="flex items-baseline justify-between text-body-sm">
                        <span className="font-bold text-ink">{pct}%</span>
                        <span className="text-ink-subtle">
                          {row.vote_count} vote{row.vote_count === 1 ? "" : "s"}
                        </span>
                      </div>
                      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-surface-2">
                        <div
                          className={
                            "h-full rounded-full " +
                            (isTopRank ? "bg-[image:var(--gradient-gold)]" : "bg-[image:var(--gradient-brand)]")
                          }
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
