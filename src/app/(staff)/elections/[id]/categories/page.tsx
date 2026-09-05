import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { CategoryEditor } from "./editor";
import { StaffPage } from "@/components/staff/shell";
import { requireRole } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Categories & awards · Campus Elections",
};
export const dynamic = "force-dynamic";

export default async function CategoriesPage({
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
  if (election.state !== "DRAFT") redirect(`/elections/${id}`);

  const { data: categories } = await supabase
    .from("categories")
    .select("id, name, awards(id, rank, label)")
    .eq("election_id", id)
    .order("display_order");

  return (
    <StaffPage
      title="Categories and awards"
      subtitle={election.name}
      back={{ href: `/elections/${id}`, label: election.name }}
    >
      <CategoryEditor electionId={id} categories={categories ?? []} />

      <p className="mt-6 text-caption text-ink-muted">
        Rank drives ordering on the results page — rank 1 is the top award. A
        category needs at least one award, and at least as many candidates as
        awards, before candidates can be locked.
      </p>
    </StaffPage>
  );
}
