import type { Metadata } from "next";
import Link from "next/link";

import { CategoryBallot, type BallotCandidate } from "./ballot";
import { DashboardPage, RailCard } from "@/components/ui/dashboard-page";
import { formatCountdown, formatMoment, votingPhase } from "@/lib/election/schedule";
import { Tag } from "@/components/ui/tag";
import { requireApprovedVoter } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Vote · Campus Elections" };

// A ballot must never be served from cache — it reflects what this voter has
// already done, and whether the window is still open.
export const dynamic = "force-dynamic";

/** The empty and waiting states: a header and one panel, no rail. */
function Notice({
  symbol,
  children,
}: {
  symbol: string;
  children: React.ReactNode;
}) {
  return (
    <section className="surface-panel relative overflow-hidden px-6 py-12 text-center sm:px-10">
      <div className="pointer-events-none absolute -right-12 -top-12 h-44 w-44 rounded-full bg-primary/15 blur-3xl" />
      <div className="relative mx-auto max-w-[580px]">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-2xl text-brand-ink shadow-soft">
          {symbol}
        </span>
        <div className="mt-5 text-body text-ink-muted">{children}</div>
      </div>
    </section>
  );
}

export default async function VotePage() {
  await requireApprovedVoter("/vote");
  const supabase = await createClient();

  const { data: openElections } = await supabase
    .from("elections")
    .select("id, name, opens_at, closes_at")
    .eq("state", "OPEN")
    .order("opens_at", { ascending: true });

  const election = openElections?.[0];

  if (!election) {
    return (
      <DashboardPage
        eyebrow="Voting centre"
        title="No ballot is available"
      >
        <Notice symbol="○">
          Nothing is accepting votes at the moment. Check back when voting
          opens — you&rsquo;ll be able to vote from here.
        </Notice>
      </DashboardPage>
    );
  }

  // `state = OPEN` arms an election; cast_vote() also requires now() to be
  // inside the window, so say so rather than showing a ballot that would be
  // refused. Same helper the officer screens use, so the two can't disagree.
  const phase = votingPhase("OPEN", election.opens_at, election.closes_at);
  if (phase === "SCHEDULED") {
    return (
      <DashboardPage
        eyebrow="Ballot scheduled"
        title={election.name}
        status={<Tag tone="info">Opens {formatCountdown(election.opens_at)}</Tag>}
      >
        <Notice symbol="◷">
          Voting opens {formatCountdown(election.opens_at)}, at{" "}
          {formatMoment(election.opens_at)}.
        </Notice>
      </DashboardPage>
    );
  }

  const [{ data: categories }, { data: issued }] = await Promise.all([
    supabase
      .from("categories")
      .select(
        "id, name, display_order, awards(rank, label), candidates(id, display_name, tagline, department_code, photo_path, display_order)",
      )
      .eq("election_id", election.id)
      .order("display_order"),
    // RLS returns only this voter's own rows — there is no way to read anyone
    // else's, and no way to read what any of them chose.
    supabase
      .from("ballot_issued")
      .select("category_id")
      .eq("election_id", election.id),
  ]);

  const votedIn = new Set((issued ?? []).map((row) => row.category_id));
  const groups = categories ?? [];
  const remaining = groups.filter((category) => !votedIn.has(category.id));

  if (remaining.length === 0) {
    return (
      <DashboardPage
        eyebrow="Voting is live"
        title={election.name}
        subtitle={`One vote per category · closes ${formatCountdown(election.closes_at)}`}
        status={<Tag tone="done">{groups.length} of {groups.length} cast</Tag>}
      >
        <section className="surface-panel px-6 py-10">
          <h2 className="text-card-title">Your vote is in</h2>
          <p className="mt-2 text-body text-ink-muted">
            You&rsquo;ve voted in every category. Results are published after
            voting closes — nothing is visible before then, not even to staff.
          </p>
          <p className="mt-4 text-body-sm text-ink-muted">
            We can&rsquo;t show you who you picked, and neither can anyone else.
            Your ballot was recorded with no link back to your account, which is
            the point.
          </p>
          <p className="mt-6 text-body-sm">
            <Link href="/results">Results page</Link>
            {" · "}
            <Link href="/account">Your status</Link>
          </p>
        </section>
      </DashboardPage>
    );
  }

  return (
    <DashboardPage
      eyebrow="Voting is live"
      title={election.name}
      subtitle={`One vote per category · closes ${formatCountdown(election.closes_at)}`}
      status={
        <Tag tone="pending">
          {groups.length - remaining.length} of {groups.length} cast
        </Tag>
      }
      rail={
        <>
          <RailCard title="Time remaining">
            <p className="text-body-sm font-bold text-ink">
              {formatCountdown(election.closes_at)}
            </p>
            <p className="mt-1 text-caption text-ink-muted">
              Closes {formatMoment(election.closes_at)}
            </p>
          </RailCard>
          <RailCard title="Your ballot">
            <p className="text-caption text-ink-muted">
              One candidate per category, and a vote cannot be changed once
              cast. Your ballot is recorded with no link back to your account.
            </p>
          </RailCard>
        </>
      }
    >
      {groups.map((category) => {
        if (votedIn.has(category.id)) {
          return (
            <section
              key={category.id}
              className="surface-card flex flex-wrap items-center justify-between gap-3 px-6 py-5"
            >
              <div>
                <h2 className="text-card-title">{category.name}</h2>
                <p className="text-body-sm text-ink-muted">
                  Your vote in this category is recorded.
                </p>
              </div>
              <Tag tone="done">Voted</Tag>
            </section>
          );
        }

        const candidates: BallotCandidate[] = category.candidates
          .slice()
          .sort((a, b) => a.display_order - b.display_order)
          .map((candidate) => ({
            id: candidate.id,
            display_name: candidate.display_name,
            tagline: candidate.tagline,
            department_code: candidate.department_code,
            photo_url: supabase.storage
              .from("candidate-photos")
              .getPublicUrl(candidate.photo_path).data.publicUrl,
          }));

        return (
          <CategoryBallot
            key={category.id}
            categoryId={category.id}
            categoryName={category.name}
            awardLabels={category.awards
              .slice()
              .sort((a, b) => a.rank - b.rank)
              .map((award) => award.label)}
            candidates={candidates}
          />
        );
      })}
    </DashboardPage>
  );
}
