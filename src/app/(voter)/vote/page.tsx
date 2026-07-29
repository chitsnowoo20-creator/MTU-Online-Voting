import type { Metadata } from "next";
import Link from "next/link";

import { CategoryBallot, type BallotCandidate } from "./ballot";
import { formatCountdown, formatMoment, votingPhase } from "@/lib/election/schedule";
import { Tag } from "@/components/ui/tag";
import { requireApprovedVoter } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Vote · Campus Elections" };

// A ballot must never be served from cache — it reflects what this voter has
// already done, and whether the window is still open.
export const dynamic = "force-dynamic";

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex-1 bg-surface-1 px-4 py-16">
      <div className="mx-auto w-full max-w-[960px]">{children}</div>
    </main>
  );
}

function Notice({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border border-hairline bg-canvas px-6 py-10 text-center">
      <h1 className="text-card-title">{title}</h1>
      <div className="mt-2 text-body text-ink-muted">{children}</div>
    </div>
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
      <Shell>
        <Notice title="No election is open">
          Nothing is accepting votes at the moment. Check back when voting
          opens — you&rsquo;ll be able to vote from here.
        </Notice>
      </Shell>
    );
  }

  // `state = OPEN` arms an election; cast_vote() also requires now() to be
  // inside the window, so say so rather than showing a ballot that would be
  // refused. Same helper the officer screens use, so the two can't disagree.
  const phase = votingPhase("OPEN", election.opens_at, election.closes_at);
  if (phase === "SCHEDULED") {
    return (
      <Shell>
        <Notice title={election.name}>
          Voting opens {formatCountdown(election.opens_at)}, at{" "}
          {formatMoment(election.opens_at)}.
        </Notice>
      </Shell>
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

  return (
    <Shell>
      <div className="mb-6 flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <h1 className="text-headline">{election.name}</h1>
          <p className="text-body-sm text-ink-muted">
            One vote per category · closes {formatCountdown(election.closes_at)}
          </p>
        </div>
        <Tag tone={remaining.length === 0 ? "done" : "pending"}>
          {groups.length - remaining.length} of {groups.length} cast
        </Tag>
      </div>

      {remaining.length === 0 ? (
        <div className="border border-hairline bg-canvas px-6 py-10">
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
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {groups.map((category) => {
            if (votedIn.has(category.id)) {
              return (
                <section
                  key={category.id}
                  className="flex flex-wrap items-center justify-between gap-3 border border-hairline bg-canvas px-6 py-5"
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
        </div>
      )}
    </Shell>
  );
}
