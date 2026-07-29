import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { TieForm, type TiedGroup } from "./form";
import { StaffPage } from "@/components/staff/shell";
import { requireRole } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Resolve ties · Campus Elections" };
export const dynamic = "force-dynamic";

export default async function TiesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole(["ELECTION_OFFICER"], "/elections");
  const { id } = await params;

  const supabase = await createClient();
  const { data: election } = await supabase
    .from("elections")
    .select("id, name, state")
    .eq("id", id)
    .maybeSingle();

  if (!election) notFound();
  // The function returns nothing outside CLOSED, so there is nothing to do here.
  if (election.state !== "CLOSED") redirect(`/elections/${id}`);

  const { data: tied, error } = await supabase.rpc("tied_candidates", {
    p_election_id: id,
  });

  const groups = new Map<string, TiedGroup>();
  for (const row of tied ?? []) {
    const key = `${row.category_id}:${row.result_rank}`;
    const existing = groups.get(key);
    if (existing) {
      existing.candidates.push({ id: row.candidate_id, name: row.display_name });
    } else {
      groups.set(key, {
        categoryId: row.category_id,
        categoryName: row.category_name,
        resultRank: row.result_rank,
        candidates: [{ id: row.candidate_id, name: row.display_name }],
      });
    }
  }

  return (
    <StaffPage
      title="Resolve ties"
      subtitle={election.name}
      back={{ href: `/elections/${id}`, label: election.name }}
      width="640px"
    >
      {error ? (
        <div className="border border-hairline bg-canvas px-6 py-8 text-body-sm text-error-ink">
          {error.message}
        </div>
      ) : groups.size === 0 ? (
        <div className="border border-hairline bg-canvas px-6 py-12 text-center">
          <p className="text-body text-ink-muted">
            No unresolved ties. This election can be published.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {[...groups.values()].map((group) => (
            <TieForm
              key={`${group.categoryId}:${group.resultRank}`}
              electionId={id}
              group={group}
            />
          ))}
        </div>
      )}

      <p className="mt-6 text-caption text-ink-muted">
        Only candidates level on a rank that carries an award are shown, and
        only their names — no vote counts are revealed before publication.
      </p>
    </StaffPage>
  );
}
