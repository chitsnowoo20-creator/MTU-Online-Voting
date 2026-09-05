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
          <div className="relative overflow-hidden px-6 py-14 text-center">
            <div className="pointer-events-none absolute left-1/2 top-1/2 h-48 w-48 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/10 blur-3xl" />
            <div className="relative mx-auto max-w-sm">
              <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-2xl text-brand-ink shadow-soft">+</span>
              <p className="mt-5 text-card-title">Create your first election</p>
              <p className="mt-2 text-body text-ink-muted">
              No elections yet. Create one to start building a ballot.
              </p>
              <ButtonLink href="/elections/new" className="mt-6 !min-h-11 !px-5">
                New election
              </ButtonLink>
            </div>
          </div>
        ) : (
          <>
            <ul className="flex flex-col divide-y divide-hairline md:hidden">
              {rows.map((election) => (
                // The whole row is the tap target on mobile, not just the name:
                // an inline link is ~19px tall, well under a finger.
                <li key={election.id}>
                  <Link
                    href={`/elections/${election.id}`}
                    className="block px-6 py-4 no-underline hover:bg-primary/5 hover:no-underline"
                  >
                    <span className="block font-semibold text-brand-ink">
                      {election.name}
                    </span>
                    <span className="mt-1 block text-body-sm text-ink-muted">
                      {formatRange(election.opens_at, election.closes_at)}
                    </span>
                    <span className="mt-2 block">
                      <StateTag
                        state={election.state}
                        opensAt={election.opens_at}
                        closesAt={election.closes_at}
                      />
                    </span>
                  </Link>
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
