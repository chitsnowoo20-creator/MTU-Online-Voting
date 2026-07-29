import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { CandidateManager } from "./manager";
import { StaffPage } from "@/components/staff/shell";
import { requireRole } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Candidates · Campus Elections" };
export const dynamic = "force-dynamic";

export default async function CandidatesPage({
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

  const [{ data: categories }, { data: departments }] = await Promise.all([
    supabase
      .from("categories")
      .select(
        "id, name, candidates(id, display_name, tagline, department_code, photo_path, display_order)",
      )
      .eq("election_id", id)
      .order("display_order"),
    supabase
      .from("departments")
      .select("code, name")
      .eq("active", true)
      .order("code"),
  ]);

  // The bucket is public, so a plain public URL is enough — no signing needed.
  const withUrls = (categories ?? []).map((category) => ({
    id: category.id,
    name: category.name,
    candidates: category.candidates
      .slice()
      .sort((a, b) => a.display_order - b.display_order)
      .map((candidate) => ({
        ...candidate,
        photo_url: supabase.storage
          .from("candidate-photos")
          .getPublicUrl(candidate.photo_path).data.publicUrl,
      })),
  }));

  return (
    <StaffPage
      title="Candidates"
      subtitle={election.name}
      back={{ href: `/elections/${id}`, label: election.name }}
    >
      <CandidateManager
        electionId={id}
        categories={withUrls}
        departments={departments ?? []}
      />

      <p className="mt-6 text-caption text-ink-muted">
        Candidates are standalone cards — the person pictured does not need an
        account. Editing stays open until candidates are locked.
      </p>
    </StaffPage>
  );
}
