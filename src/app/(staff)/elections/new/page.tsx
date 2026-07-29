import type { Metadata } from "next";

import { ElectionForm } from "../election-form";
import { StaffPage } from "@/components/staff/shell";
import { requireRole } from "@/lib/auth/guards";

export const metadata: Metadata = { title: "New election · Campus Elections" };

export default async function NewElectionPage() {
  await requireRole(["ELECTION_OFFICER"], "/elections/new");

  return (
    <StaffPage
      title="New election"
      subtitle="Election officer"
      back={{ href: "/elections", label: "Elections" }}
      width="640px"
    >
      <ElectionForm />
    </StaffPage>
  );
}
