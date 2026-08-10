import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Lifecycle } from "./lifecycle";
import { StaffPage, StateTag } from "@/components/staff/shell";
import { formatCountdown, formatMoment, votingPhase } from "@/lib/election/schedule";
import { ButtonLink } from "@/components/ui/button";
import { requireRole } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Election · Campus Elections" };
export const dynamic = "force-dynamic";

export default async function ElectionPage({
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

  const { data: categories } = await supabase
    .from("categories")
    .select("id, name, awards(id), candidates(id)")
    .eq("election_id", id)
    .order("display_order");

  /*
   * Only ask about ties once voting is over. The function returns a boolean and
   * nothing else — no counts leak out of it, so calling it here does not breach
   * "no tally before publication" (invariant 7).
   */
  let hasUnresolvedTie = false;
  if (election.state === "CLOSED") {
    const { data } = await supabase.rpc("has_unresolved_tie", {
      p_election_id: id,
    });
    hasUnresolvedTie = data ?? false;
  }

  const isDraft = election.state === "DRAFT";
  const groups = categories ?? [];

  /*
   * Say what the clock actually allows, not just what the state column says.
   * Opening an election early is legal and useful — it arms it — but ballots
   * are still refused until opens_at, so the UI has to make that distinction.
   */
  const phase = votingPhase(
    election.state,
    election.opens_at,
    election.closes_at,
  );
  const openNote =
    phase === "SCHEDULED"
      ? `Armed. Ballots are accepted from ${formatMoment(election.opens_at)} (${formatCountdown(election.opens_at)}).`
      : phase === "LIVE"
        ? `Voting is live — closes ${formatCountdown(election.closes_at)}.`
        : phase === "AWAITING_CLOSE"
          ? "Past the closing time. Auto-close runs within the minute."
          : election.opens_at && election.closes_at
            ? `Opening arms the election; ballots are accepted from ${formatMoment(election.opens_at)}.`
            : "Set both times before opening — voting cannot open without them.";

  return (
    <StaffPage
      title={election.name}
      subtitle={
        <StateTag
          state={election.state}
          opensAt={election.opens_at}
          closesAt={election.closes_at}
        />
      }
      back={{ href: "/elections", label: "Elections" }}
      actions={
        isDraft ? (
          <ButtonLink href={`/elections/${id}/edit`} variant="tertiary">
            Edit details
          </ButtonLink>
        ) : undefined
      }
    >
      <div className="grid gap-6 md:grid-cols-2">
        <div className="flex flex-col gap-6">
          <div className="surface-card">
            <div className="border-b border-hairline px-6 py-4">
              <h2 className="text-card-title">Schedule</h2>
            </div>
            <dl className="flex flex-col gap-3 px-6 py-6 text-body-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-ink-muted">Opens</dt>
                <dd>{formatMoment(election.opens_at)}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-ink-muted">Closes</dt>
                <dd>{formatMoment(election.closes_at)}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-ink-muted">Verification deadline</dt>
                <dd>{formatMoment(election.verification_deadline)}</dd>
              </div>
            </dl>
          </div>

          <div className="surface-card">
            <div className="flex items-center justify-between gap-4 border-b border-hairline px-6 py-4">
              <h2 className="text-card-title">Ballot</h2>
              {isDraft ? (
                <Link
                  href={`/elections/${id}/categories`}
                  className="text-body-sm"
                >
                  Edit
                </Link>
              ) : null}
            </div>
            <div className="px-6 py-6">
              {groups.length === 0 ? (
                <p className="text-body-sm text-ink-muted">
                  No categories yet.{" "}
                  {isDraft ? (
                    <Link href={`/elections/${id}/categories`}>
                      Add the first one
                    </Link>
                  ) : null}
                </p>
              ) : (
                <ul className="flex flex-col gap-3 text-body-sm">
                  {groups.map((category) => (
                    <li
                      key={category.id}
                      className="flex justify-between gap-4"
                    >
                      <span>{category.name}</span>
                      <span className="text-ink-muted">
                        {category.awards.length} award
                        {category.awards.length === 1 ? "" : "s"} ·{" "}
                        {category.candidates.length} candidate
                        {category.candidates.length === 1 ? "" : "s"}
                      </span>
                    </li>
                  ))}
                </ul>
              )}

              {isDraft ? (
                <div className="mt-6 flex gap-3 border-t border-hairline pt-6">
                  <ButtonLink
                    href={`/elections/${id}/categories`}
                    variant="tertiary"
                  >
                    Categories &amp; awards
                  </ButtonLink>
                  <ButtonLink
                    href={`/elections/${id}/candidates`}
                    variant="tertiary"
                  >
                    Candidates
                  </ButtonLink>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <Lifecycle
          electionId={election.id}
          state={election.state}
          hasUnresolvedTie={hasUnresolvedTie}
          openNote={openNote}
        />
      </div>
    </StaffPage>
  );
}
