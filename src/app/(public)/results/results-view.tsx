import Image from "next/image";

import { Tag } from "@/components/ui/tag";
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

/**
 * One published election's results.
 *
 * Everything here reads through the `election_results` view, which filters on
 * `state = 'PUBLISHED'` itself — the `votes` table grants SELECT to nobody, so
 * an unpublished election yields no rows no matter what id is passed in
 * (invariant 7).
 */
export async function ElectionResults({ electionId }: { electionId: string }) {
  const supabase = await createClient();

  const [{ data: rows }, { data: awards }, { data: ties }] = await Promise.all([
    supabase.from("election_results").select("*").eq("election_id", electionId),
    supabase
      .from("categories")
      .select("id, awards(rank, label)")
      .eq("election_id", electionId),
    supabase
      .from("tie_resolutions")
      .select("category_id, justification, resolution")
      .eq("election_id", electionId),
  ]);

  const awardsByCategory = new Map<string, Map<number, string>>(
    (awards ?? []).map((category) => [
      category.id,
      new Map(category.awards.map((award) => [award.rank, award.label])),
    ]),
  );

  const tieByCategory = new Map(
    (ties ?? []).map((tie) => [tie.category_id, tie]),
  );

  // A recorded tie resolution overrides the computed rank — that is the whole
  // reason it exists.
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
      <p className="border border-hairline bg-canvas px-6 py-10 text-center text-body text-ink-muted">
        This election has no results to show.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      {ordered.map(([categoryId, all]) => {
        const labels = awardsByCategory.get(categoryId) ?? new Map();
        const tie = tieByCategory.get(categoryId);
        const sorted = all
          .slice()
          .sort(
            (a, b) => finalRank(a) - finalRank(b) || b.vote_count - a.vote_count,
          );
        const winners = sorted.filter((row) => labels.has(finalRank(row)));
        const others = sorted.filter((row) => !labels.has(finalRank(row)));

        return (
          <section key={categoryId} className="border border-hairline bg-canvas">
            <div className="border-b border-hairline px-6 py-4">
              <h2 className="text-card-title">{all[0]?.category_name}</h2>
            </div>

            <ul className="grid gap-px bg-hairline sm:grid-cols-2 lg:grid-cols-3">
              {winners.map((row) => (
                <li key={row.candidate_id} className="bg-canvas p-6">
                  <Tag tone="done">{labels.get(finalRank(row))}</Tag>
                  <div className="relative my-4 aspect-[4/5] w-full bg-surface-1">
                    <Image
                      src={
                        supabase.storage
                          .from("candidate-photos")
                          .getPublicUrl(row.photo_path).data.publicUrl
                      }
                      alt=""
                      fill
                      sizes="(max-width: 640px) 100vw, 280px"
                      className="object-cover"
                    />
                  </div>
                  <p className="text-subhead text-ink">{row.display_name}</p>
                  {row.tagline ? (
                    <p className="text-caption text-ink-muted">{row.tagline}</p>
                  ) : null}
                  <p className="mt-2 text-body-sm text-ink-muted">
                    {row.vote_count} vote{row.vote_count === 1 ? "" : "s"}
                  </p>
                </li>
              ))}
            </ul>

            {others.length > 0 ? (
              <table className="w-full border-collapse text-body-sm">
                <tbody>
                  {others.map((row) => (
                    <tr
                      key={row.candidate_id}
                      className="border-t border-hairline"
                    >
                      <td className="px-6 py-3 text-ink-muted">
                        {finalRank(row)}
                      </td>
                      <td className="px-6 py-3">{row.display_name}</td>
                      <td className="px-6 py-3 text-right text-ink-muted">
                        {row.vote_count} vote{row.vote_count === 1 ? "" : "s"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : null}

            {tie ? (
              <div className="border-t border-hairline bg-surface-1 px-6 py-4">
                <p className="text-caption text-ink-muted">
                  Tie resolved by the election officer
                </p>
                <p className="mt-1 text-body-sm text-ink">{tie.justification}</p>
              </div>
            ) : null}
          </section>
        );
      })}
    </div>
  );
}
