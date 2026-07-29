import Link from "next/link";

import { ButtonLink } from "@/components/ui/button";
import { Tag } from "@/components/ui/tag";
import { getCurrentUser, type CurrentUser } from "@/lib/auth/guards";
import {
  formatCountdown,
  formatMoment,
  isUpcoming,
  votingPhase,
} from "@/lib/election/schedule";
import { createClient } from "@/lib/supabase/server";

// The hero reflects live election state, so it cannot be prerendered.
export const dynamic = "force-dynamic";

const STEPS = [
  {
    step: "Step 1",
    title: "Register",
    body: "Any email works. Confirm it from your inbox.",
  },
  {
    step: "Step 2",
    title: "Verify identity",
    body: "Upload your ID card. A reviewer checks it, then deletes the image.",
  },
  {
    step: "Step 3",
    title: "Vote",
    body: "One candidate per category. Votes are private and final.",
  },
];

type Featured = {
  id: string;
  name: string;
  state: "OPEN" | "CLOSED" | "PUBLISHED";
  opens_at: string | null;
  closes_at: string | null;
  verification_deadline: string | null;
};

/** The eyebrow, headline support and primary action, given who's looking. */
function hero(featured: Featured | null, user: CurrentUser | null) {
  const phase = featured
    ? votingPhase(featured.state, featured.opens_at, featured.closes_at)
    : "NOT_OPEN";

  if (featured?.state === "PUBLISHED") {
    return {
      status: `${featured.name} · results published`,
      tone: "done" as const,
      cta: { href: "/results", label: "See the results" },
    };
  }

  if (phase === "LIVE") {
    return {
      status: `${featured!.name} · voting open`,
      tone: "pending" as const,
      cta:
        user?.voterStatus === "APPROVED"
          ? { href: "/vote", label: "Go to your ballot" }
          : user
            ? { href: "/verify", label: "Verify to vote" }
            : { href: "/register", label: "Register to vote" },
    };
  }

  if (phase === "SCHEDULED") {
    return {
      status: `${featured!.name} · voting opens ${formatCountdown(featured!.opens_at)}`,
      tone: "info" as const,
      cta: user
        ? { href: "/account", label: "Your status" }
        : { href: "/register", label: "Register to vote" },
    };
  }

  if (featured?.state === "CLOSED") {
    return {
      status: `${featured.name} · voting closed`,
      tone: "locked" as const,
      cta: { href: "/results", label: "Results" },
    };
  }

  return {
    status: "Registration open",
    tone: "info" as const,
    cta: user
      ? { href: "/account", label: "Your status" }
      : { href: "/register", label: "Register to vote" },
  };
}

export default async function Home() {
  const user = await getCurrentUser();
  const supabase = await createClient();

  /*
   * Only OPEN, CLOSED and PUBLISHED elections are selectable by an anonymous
   * visitor — the RLS policy on `elections` hides drafts, so a ballot in
   * preparation cannot leak onto the front page.
   */
  const { data: visible } = await supabase
    .from("elections")
    .select("id, name, state, opens_at, closes_at, verification_deadline")
    .in("state", ["OPEN", "CLOSED", "PUBLISHED"])
    .order("opens_at", { ascending: false, nullsFirst: false });

  const elections = (visible ?? []) as Featured[];
  const featured =
    elections.find((election) => election.state === "OPEN") ??
    elections.find((election) => election.state === "PUBLISHED") ??
    elections[0] ??
    null;

  /*
   * Ballot shape only — categories and candidate counts, both publicly readable
   * for a non-draft election. Deliberately no turnout figure: how many people
   * have voted is a fact about the ballot box, and nothing on a public page
   * needs it while voting is running.
   */
  const { data: categories } = featured
    ? await supabase
        .from("categories")
        .select("id, candidates(id)")
        .eq("election_id", featured.id)
    : { data: null };

  const categoryCount = categories?.length ?? 0;
  const candidateCount =
    categories?.reduce((total, category) => total + category.candidates.length, 0) ??
    0;

  const { status, tone, cta } = hero(featured, user);

  const deadline = featured?.verification_deadline ?? null;
  const deadlineAhead = isUpcoming(deadline);

  return (
    <>
      <header className="border-b border-hairline">
        <div className="bg-surface-1">
          <div className="mx-auto flex h-8 max-w-[1056px] items-center justify-between px-6 text-caption text-ink-muted">
            <span>Student Union · Campus services</span>
            <span className="hidden gap-4 sm:flex">
              <span>Contact</span>
              <span>Help</span>
            </span>
          </div>
        </div>
        <div className="mx-auto flex h-12 max-w-[1056px] items-center justify-between px-6">
          <div className="flex items-center gap-8">
            <span className="text-body-sm text-ink">Campus Elections</span>
            <nav className="hidden gap-6 text-body-sm sm:flex">
              <Link href="#how-it-works">How it works</Link>
              <Link href="/results">Results</Link>
            </nav>
          </div>
          {user ? (
            <Link href="/account" className="text-body-sm">
              Your status
            </Link>
          ) : (
            <Link href="/login" className="text-body-sm">
              Sign in
            </Link>
          )}
        </div>
      </header>

      <main className="flex-1">
        <section className="mx-auto max-w-[1056px] px-6 py-16">
          <Tag tone={tone}>{status}</Tag>
          <h1 className="mt-4 max-w-[720px] text-display-md sm:text-display-lg">
            Vote for your King and Queen
          </h1>
          <p className="mt-4 max-w-[640px] text-body-lg text-ink-muted">
            Every verified student and staff member gets one vote per category.
            Verify once, vote in under a minute. Results stay sealed until the
            election officer publishes them.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <ButtonLink href={cta.href}>{cta.label}</ButtonLink>
            {!user ? (
              <ButtonLink href="/login" variant="tertiary">
                Sign in
              </ButtonLink>
            ) : null}
          </div>

          {featured && categoryCount > 0 ? (
            <dl className="mt-12 grid gap-px border border-hairline bg-hairline sm:grid-cols-3">
              <div className="flex flex-col-reverse gap-1 bg-canvas p-6">
                <dt className="text-body-sm text-ink-muted">
                  categories on the ballot
                </dt>
                <dd className="text-display-md">{categoryCount}</dd>
              </div>
              <div className="flex flex-col-reverse gap-1 bg-canvas p-6">
                <dt className="text-body-sm text-ink-muted">
                  candidates standing
                </dt>
                <dd className="text-display-md">{candidateCount}</dd>
              </div>
              <div className="flex flex-col-reverse gap-1 bg-canvas p-6">
                <dt className="text-body-sm text-ink-muted">
                  {featured.state === "OPEN"
                    ? "until voting closes"
                    : "voting closed"}
                </dt>
                <dd className="text-display-md">
                  {featured.closes_at
                    ? formatCountdown(featured.closes_at).replace(/^in /, "")
                    : "—"}
                </dd>
              </div>
            </dl>
          ) : null}
        </section>

        {deadlineAhead && user?.voterStatus !== "APPROVED" ? (
          <section className="border-y border-hairline bg-primary">
            <div className="mx-auto flex max-w-[1056px] flex-wrap items-center justify-between gap-4 px-6 py-6">
              <p className="text-body text-on-primary">
                Verification closes {formatMoment(deadline)} — get verified
                before the ballot opens.
              </p>
              <ButtonLink
                href={user ? "/verify" : "/register"}
                variant="secondary"
              >
                {user ? "Start verification" : "Register"}
              </ButtonLink>
            </div>
          </section>
        ) : null}

        <section
          id="how-it-works"
          className="border-t border-hairline bg-surface-1"
        >
          <div className="mx-auto max-w-[1056px] px-6 py-16">
            <h2 className="text-card-title">How it works</h2>
            <div className="mt-6 grid gap-px bg-hairline sm:grid-cols-3">
              {STEPS.map((item) => (
                <div key={item.step} className="bg-canvas p-6">
                  <p className="text-caption text-ink-muted">{item.step}</p>
                  <p className="mt-2 text-body">{item.title}</p>
                  <p className="mt-1 text-body-sm text-ink-muted">{item.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-inverse-canvas text-inverse-ink-muted">
        <div className="mx-auto grid max-w-[1056px] gap-8 px-6 py-16 sm:grid-cols-2">
          <div>
            <p className="text-body-sm text-inverse-ink">Campus Elections</p>
            <p className="mt-2 max-w-[420px] text-body-sm">
              Run by the Student Union electoral office. Every administrative
              action is written to an immutable audit log, and no ballot is ever
              linked to the person who cast it.
            </p>
          </div>
          <div>
            <p className="text-body-sm text-inverse-ink">Voting</p>
            <ul className="mt-2 flex flex-col gap-1 text-body-sm">
              <li>
                <Link href="/register">Register</Link>
              </li>
              <li>
                <Link href="/verify">Verify your ID</Link>
              </li>
              <li>
                <Link href="/vote">Cast a vote</Link>
              </li>
              <li>
                <Link href="/results">Results</Link>
              </li>
            </ul>
          </div>
        </div>
      </footer>
    </>
  );
}
