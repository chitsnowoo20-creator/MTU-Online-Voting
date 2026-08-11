import Link from "next/link";

import { ButtonLink } from "@/components/ui/button";
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

function nextStep(user: CurrentUser, featured: Featured | null) {
  const phase = featured
    ? votingPhase(featured.state, featured.opens_at, featured.closes_at)
    : "NOT_OPEN";

  if (!user.emailConfirmedAt) {
    return {
      title: "Confirm your email",
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
      title: user.voterStatus === "REJECTED" ? "Try verification again" : "Verify your identity",
      body: "Upload a photo of your student or staff ID card. A reviewer checks it, then deletes the image.",
      cta: { href: "/verify", label: "Start verification" },
      tone: "pending" as const,
    };
  }

  if (user.voterStatus === "PENDING") {
    return {
      title: "Verification in progress",
      body: "A reviewer will check your ID shortly. We'll email you when there's a decision.",
      cta: { href: "/verify", label: "View submission" },
      tone: "info" as const,
    };
  }

  if (phase === "LIVE") {
    return {
      title: `${featured!.name} · voting open`,
      body: "You're verified — cast your vote before the window closes.",
      cta: { href: "/vote", label: "Go to your ballot" },
      tone: "pending" as const,
    };
  }

  if (featured?.state === "PUBLISHED") {
    return {
      title: `${featured.name} · results published`,
      body: "See who won in each category.",
      cta: { href: "/results", label: "See the results" },
      tone: "done" as const,
    };
  }

  if (phase === "SCHEDULED") {
    return {
      title: `${featured!.name} · voting opens ${formatCountdown(featured!.opens_at)}`,
      body: "You're verified and ready. Voting opens automatically at the scheduled time.",
      cta: { href: "/account", label: "Your status" },
      tone: "info" as const,
    };
  }

  return {
    title: "You're ready to vote",
    body: "Nothing is open right now. Check back when voting starts.",
    cta: { href: "/results", label: "Results" },
    tone: "locked" as const,
  };
}

export function HomeDashboard({
  user,
  featured,
  categoryCount,
  candidateCount,
}: {
  user: CurrentUser;
  featured: Featured | null;
  categoryCount: number;
  candidateCount: number;
}) {
  const step = nextStep(user, featured);
  const deadline = featured?.verification_deadline ?? null;
  const deadlineAhead = isUpcoming(deadline);

  return (
    <main className="surface-page flex flex-1 justify-center px-4 py-16">
      <div className="w-full max-w-[720px]">
        <div className="surface-panel overflow-hidden">
          <div className="surface-section border-b px-6 py-6 sm:px-8">
            <Tag tone={step.tone}>{step.title}</Tag>
            <h1 className="mt-3 text-headline">
              Hello, {user.fullName.split(/\s+/)[0] || "there"}
            </h1>
            <p className="mt-2 max-w-[600px] text-body text-ink-muted">{step.body}</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <ButtonLink href={step.cta.href}>{step.cta.label}</ButtonLink>
              <ButtonLink href="/results" variant="tertiary">Results</ButtonLink>
            </div>
          </div>

          {featured && categoryCount > 0 ? (
            <dl className="grid gap-px border-t border-hairline bg-hairline sm:grid-cols-3">
              <div className="flex flex-col gap-2 bg-canvas p-6">
                <dt className="text-body-sm text-ink-muted">categories</dt>
                <dd className="text-display-md">{categoryCount}</dd>
              </div>
              <div className="flex flex-col gap-2 bg-canvas p-6">
                <dt className="text-body-sm text-ink-muted">candidates</dt>
                <dd className="text-display-md">{candidateCount}</dd>
              </div>
              <div className="flex flex-col gap-2 bg-canvas p-6">
                <dt className="text-body-sm text-ink-muted">
                  {featured.state === "OPEN" ? "until close" : "voting"}
                </dt>
                <dd className="text-display-md">
                  {featured.closes_at && featured.state === "OPEN"
                    ? formatCountdown(featured.closes_at).replace(/^in /, "")
                    : featured.state === "CLOSED"
                      ? "closed"
                      : "—"}
                </dd>
              </div>
            </dl>
          ) : null}

          <div className="flex flex-wrap gap-4 border-t border-hairline px-6 py-4 text-body-sm sm:px-8">
            <Link href="/account" className="link-action">Your status</Link>
            <Link href="/results" className="link-action">Results</Link>
          </div>
        </div>

        {deadlineAhead && user.voterStatus !== "APPROVED" ? (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-primary/20 bg-primary/10 px-6 py-4 shadow-soft">
            <p className="flex items-center gap-2 text-body-sm font-medium text-brand-ink">
              <span className="text-lg">⏰</span>
              Verification closes {formatMoment(deadline)} — get verified before
              the ballot opens.
            </p>
          </div>
        ) : null}
      </div>
    </main>
  );
}
