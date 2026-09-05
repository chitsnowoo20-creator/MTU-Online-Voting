import Image from "next/image";

import { ButtonLink } from "@/components/ui/button";
import { DashboardPage, RailCard } from "@/components/ui/dashboard-page";
import { Tag } from "@/components/ui/tag";
import type { CurrentUser } from "@/lib/auth/guards";
import {
  formatCountdown,
  formatMoment,
  isUpcoming,
  votingPhase,
} from "@/lib/election/schedule";

type Featured = {
  id: string;
  name: string;
  state: "OPEN" | "CLOSED" | "PUBLISHED";
  opens_at: string | null;
  closes_at: string | null;
  verification_deadline: string | null;
};

/** One category and whether this viewer has cast their ballot in it. */
type BallotCategory = { id: string; name: string; voted: boolean };

/** Top-ranked candidate in one category, after any tie resolution. */
type Winner = {
  categoryId: string;
  categoryName: string;
  awardLabel: string | null;
  displayName: string;
  voteCount: number;
  photoUrl: string | null;
};

/**
 * What this viewer should do next, in three separate pieces.
 *
 * `status` is a chip and stays short — it used to be a whole sentence with the
 * election's name inside it, which made the pill wider than the heading it sat
 * beside. The name belongs on the panel that shows that election's numbers, and
 * `body` carries the explanation as the page's subtitle.
 */
function nextStep(user: CurrentUser, featured: Featured | null) {
  const phase = featured
    ? votingPhase(featured.state, featured.opens_at, featured.closes_at)
    : "NOT_OPEN";

  if (!user.emailConfirmedAt) {
    return {
      status: "Email not confirmed",
      body: "Open the link we sent to your inbox, then come back here.",
      cta: {
        href: `/confirm?email=${encodeURIComponent(user.email ?? "")}`,
        label: "Resend confirmation",
      },
      tone: "pending" as const,
    };
  }

  if (user.voterStatus === "UNVERIFIED" || user.voterStatus === "REJECTED") {
    return {
      status:
        user.voterStatus === "REJECTED" ? "Verification rejected" : "Not verified",
      body: "Upload a photo of your student or staff ID card. A reviewer checks it, then deletes the image.",
      cta: { href: "/verify", label: "Start verification" },
      tone: "pending" as const,
    };
  }

  if (user.voterStatus === "PENDING") {
    return {
      status: "Verification pending",
      body: "A reviewer will check your ID shortly. We'll email you when there's a decision.",
      cta: { href: "/verify", label: "View submission" },
      tone: "info" as const,
    };
  }

  if (phase === "LIVE") {
    return {
      status: "Voting open",
      body: "You're verified — cast your vote before the window closes.",
      cta: { href: "/vote", label: "Go to your ballot" },
      tone: "pending" as const,
    };
  }

  if (featured?.state === "PUBLISHED") {
    return {
      status: "Results published",
      body: "See who won in each category.",
      cta: { href: "/results", label: "See the results" },
      tone: "done" as const,
    };
  }

  if (phase === "SCHEDULED") {
    return {
      status: `Opens ${formatCountdown(featured!.opens_at)}`,
      body: "You're verified and ready. Voting opens automatically at the scheduled time.",
      cta: { href: "/account", label: "Your status" },
      tone: "info" as const,
    };
  }

  return {
    status: "Ready to vote",
    body: "Nothing is open right now. Check back when voting starts.",
    cta: { href: "/results", label: "See past results" },
    tone: "locked" as const,
  };
}

export function HomeDashboard({
  user,
  featured,
  categoryCount,
  candidateCount,
  totalVotes,
  ballot,
  winners,
}: {
  user: CurrentUser;
  featured: Featured | null;
  categoryCount: number;
  candidateCount: number;
  /** Published elections only; null before that, and deliberately so. */
  totalVotes: number | null;
  /** Null unless this viewer is an approved voter. */
  ballot: BallotCategory[] | null;
  winners: Winner[];
}) {
  const step = nextStep(user, featured);
  const deadline = featured?.verification_deadline ?? null;
  const deadlineAhead = isUpcoming(deadline);
  const showStats = Boolean(featured) && categoryCount > 0;

  const cast = ballot?.filter((category) => category.voted).length ?? 0;

  /*
   * The rail carries what the nav cannot: a deadline that applies to this
   * viewer, and their own ballot record. That record is `ballot_issued` and
   * nothing else — which categories they voted in, never who they chose. There
   * is no query that could answer the second question.
   */
  const railBlocks = [
    deadlineAhead && user.voterStatus !== "APPROVED" ? (
      <RailCard key="deadline" title="Verification deadline">
        <p className="text-body-sm text-ink">Closes {formatMoment(deadline)}.</p>
        <p className="mt-1 text-caption text-ink-muted">
          Get verified before the ballot opens.
        </p>
      </RailCard>
    ) : null,

    ballot && ballot.length > 0 ? (
      <section key="ballot" className="surface-panel overflow-hidden">
        <div className="flex items-baseline justify-between gap-3 border-b border-hairline px-5 py-3.5">
          <h2 className="text-caption font-bold uppercase tracking-[0.14em] text-brand-ink">
            Your ballot
          </h2>
          <span className="text-caption text-ink-muted">
            {cast} of {ballot.length}
          </span>
        </div>
        <ul className="divide-y divide-hairline">
          {ballot.map((category) => (
            <li
              key={category.id}
              className="flex items-center justify-between gap-3 px-5 py-3"
            >
              <span className="truncate text-body-sm text-ink">
                {category.name}
              </span>
              <Tag tone={category.voted ? "done" : "locked"}>
                {category.voted
                  ? "Voted"
                  : featured?.state === "OPEN"
                    ? "Not yet"
                    : "No vote"}
              </Tag>
            </li>
          ))}
        </ul>
        <p className="border-t border-hairline px-5 py-3 text-caption text-ink-muted">
          Which categories you voted in — never who you chose.
        </p>
      </section>
    ) : null,
  ].filter(Boolean);

  const rail = railBlocks.length > 0 ? <>{railBlocks}</> : undefined;

  return (
    <DashboardPage
      eyebrow="Dashboard"
      title={`Hello, ${user.fullName.split(/\s+/)[0] || "there"}`}
      subtitle={step.body}
      status={<Tag tone={step.tone}>{step.status}</Tag>}
      /*
       * One button. A tertiary "Results" used to sit beside this one pointing at
       * the same /results — and in the "ready to vote" state it carried the same
       * label too, so the header showed two identical buttons. Results is a
       * permanent nav row; the CTA is the single next action and changes with
       * state, which is what earns it a place here.
       */
      actions={
        <ButtonLink href={step.cta.href} className="!min-h-11 !px-5">
          {step.cta.label}
        </ButtonLink>
      }
      rail={rail}
    >
      {featured ? (
        <section className="surface-panel overflow-hidden">
          <div className="border-b border-hairline px-6 py-5 sm:px-8">
            <p className="eyebrow-label">
              {featured.state === "PUBLISHED" ? "Final result" : "Election"}
            </p>
            <h2 className="mt-1 text-card-title text-ink">{featured.name}</h2>
          </div>

          {showStats ? (
            <dl className="grid gap-px bg-hairline sm:grid-cols-3">
              <div className="flex flex-col gap-2 bg-canvas p-6">
                <dt className="text-body-sm text-ink-muted">categories</dt>
                <dd className="text-display-md">{categoryCount}</dd>
              </div>
              <div className="flex flex-col gap-2 bg-canvas p-6">
                <dt className="text-body-sm text-ink-muted">candidates</dt>
                <dd className="text-display-md">{candidateCount}</dd>
              </div>
              {/*
                * Third tile, by state. It used to read "voting —" for a
                * published election, which is every election you can actually
                * look at. Once published the tally is public, so it shows the
                * turnout instead; before then there is nothing here to show.
                */}
              <div className="flex flex-col gap-2 bg-canvas p-6">
                <dt className="text-body-sm text-ink-muted">
                  {featured.state === "OPEN"
                    ? "until close"
                    : totalVotes !== null
                      ? "votes cast"
                      : "voting"}
                </dt>
                <dd className="text-display-md">
                  {featured.state === "OPEN" && featured.closes_at
                    ? formatCountdown(featured.closes_at).replace(/^in /, "")
                    : totalVotes !== null
                      ? totalVotes
                      : "closed"}
                </dd>
              </div>
            </dl>
          ) : (
            <p className="px-6 py-6 text-body-sm text-ink-muted sm:px-8">
              This election has no categories yet.
            </p>
          )}
        </section>
      ) : (
        <section className="surface-panel px-6 py-10 text-center sm:px-8">
          <p className="text-body text-ink-muted">
            No election has been published yet. This is where the one you can
            vote in will appear.
          </p>
        </section>
      )}

      {winners.length > 0 ? (
        <section className="surface-panel overflow-hidden">
          <h2 className="border-b border-hairline px-6 py-4 text-card-title text-ink sm:px-8">
            Winners
          </h2>
          <ul className="divide-y divide-hairline">
            {winners.map((winner) => (
              <li
                key={winner.categoryId}
                className="flex items-center gap-4 px-6 py-4 sm:px-8"
              >
                <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-surface-1 ring-1 ring-hairline">
                  {winner.photoUrl ? (
                    <Image
                      src={winner.photoUrl}
                      alt=""
                      fill
                      sizes="56px"
                      className="object-cover"
                    />
                  ) : null}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-caption text-ink-muted">
                    {winner.categoryName}
                  </p>
                  <p className="truncate text-body font-semibold text-ink">
                    {winner.displayName}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  {winner.awardLabel ? (
                    <Tag tone="done">{winner.awardLabel}</Tag>
                  ) : null}
                  <p className="mt-1 text-caption text-ink-muted">
                    {winner.voteCount} vote{winner.voteCount === 1 ? "" : "s"}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </DashboardPage>
  );
}
