import type { Metadata } from "next";
import Link from "next/link";

import { StaffPage, StateTag } from "@/components/staff/shell";
import { DataTable } from "@/components/ui/data-table";
import { formatRange } from "@/lib/election/schedule";
import { ButtonLink } from "@/components/ui/button";
import { requireRole } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Elections · Campus Elections" };
export const dynamic = "force-dynamic";

export default async function ElectionsPage() {
  await requireRole(["ELECTION_OFFICER"], "/elections");

  const supabase = await createClient();
  const { data: elections, error } = await supabase
    .from("elections")
    .select("id, name, state, opens_at, closes_at")
    .order("created_at", { ascending: false });

  const rows = elections ?? [];

  return (
    <StaffPage
      title="Elections"
      subtitle="Election officer"
      actions={
        <ButtonLink href="/elections/new" className="no-underline">
          New election
        </ButtonLink>
      }
    >
      <div className="surface-panel">
        {error ? (
          <p className="px-6 py-8 text-body-sm text-error-ink">
            {error.message}
          </p>
        ) : rows.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <p className="text-body text-ink-muted">
              No elections yet. Create one to start building a ballot.
            </p>
          </div>
        ) : (
          <>
            <ul className="flex flex-col divide-y divide-hairline md:hidden">
              {rows.map((election) => (
                <li key={election.id} className="px-6 py-4">
                  <Link href={`/elections/${election.id}`}>{election.name}</Link>
                  <p className="mt-1 text-body-sm text-ink-muted">
                    {formatRange(election.opens_at, election.closes_at)}
                  </p>
                  <div className="mt-2">
                    <StateTag
                      state={election.state}
                      opensAt={election.opens_at}
                      closesAt={election.closes_at}
                    />
                  </div>
                </li>
              ))}
            </ul>

            <div className="hidden md:block">
              <DataTable minWidth={720}>
                <table className="w-full border-collapse text-body-sm">
                  <thead>
                    <tr className="border-b border-hairline text-left text-caption text-ink-muted">
                      <th className="px-6 py-3 font-normal">Election</th>
                      <th className="px-6 py-3 font-normal">Schedule</th>
                      <th className="px-6 py-3 font-normal">State</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((election) => (
                      <tr
                        key={election.id}
                        className="border-b border-hairline last:border-b-0"
                      >
                        <td className="px-6 py-4">
                          <Link href={`/elections/${election.id}`}>
                            {election.name}
                          </Link>
                        </td>
                        <td className="px-6 py-4 text-ink-muted">
                          {formatRange(election.opens_at, election.closes_at)}
                        </td>
                        <td className="px-6 py-4">
                          <StateTag
                            state={election.state}
                            opensAt={election.opens_at}
                            closesAt={election.closes_at}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </DataTable>
            </div>
          </>
        )}
      </div>
    </StaffPage>
  );
}
