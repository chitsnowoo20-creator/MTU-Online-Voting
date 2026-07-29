import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { ElectionForm } from "../../election-form";
import { StaffPage } from "@/components/staff/shell";
import { requireRole } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Edit election · Campus Elections" };
export const dynamic = "force-dynamic";

export default async function EditElectionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole(["ELECTION_OFFICER"], "/elections");
  const { id } = await params;

  const supabase = await createClient();
  const { data: election } = await supabase
    .from("elections")
    .select("id, name, state, opens_at, closes_at, verification_deadline")
    .eq("id", id)
    .maybeSingle();

  if (!election) notFound();

  // Structural edits are legal only in DRAFT (FR-13); the RLS policy would
  // refuse the write anyway, so don't show a form that cannot save.
  if (election.state !== "DRAFT") redirect(`/elections/${id}`);

  return (
    <StaffPage
      title="Edit election"
      subtitle={election.name}
      back={{ href: `/elections/${id}`, label: election.name }}
      width="640px"
    >
      <ElectionForm
        election={{
          id: election.id,
          name: election.name,
          opensAt: election.opens_at,
          closesAt: election.closes_at,
          verificationDeadline: election.verification_deadline,
        }}
      />
    </StaffPage>
  );
}
