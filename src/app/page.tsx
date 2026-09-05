import Image from "next/image";
import Link from "next/link";

import { HomeDashboard } from "@/components/home/dashboard";
import { AppFrame } from "@/components/nav/app-frame";
import { ButtonLink } from "@/components/ui/button";
import { Tag } from "@/components/ui/tag";
import { getCurrentUser, type CurrentUser } from "@/lib/auth/guards";
import {
  countdownParts,
  formatCountdown,
  formatMoment,
  isUpcoming,
  votingPhase,
} from "@/lib/election/schedule";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/*
 * Explanatory only — deliberately not links. `/verify` and `/vote` are both in
 * the proxy's protected prefixes, so a signed-out visitor clicking "Explore
 * this step" was redirected to /login. The one thing a guest can actually do is
 * register, and that is the section's single call to action.
 */
const STEPS = [
  { step: "01", title: "Register", body: "Any email works. Confirm it from your inbox." },
  { step: "02", title: "Verify identity", body: "Upload your ID card. A reviewer checks it, then deletes the image." },
  { step: "03", title: "Vote", body: "One candidate per category. Votes are private and final." },
];

type Featured = {
  id: string;
  name: string;
  state: "OPEN" | "CLOSED" | "PUBLISHED";
  opens_at: string | null;
  closes_at: string | null;
  verification_deadline: string | null;
};

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

  const { data: categories } = featured
    ? await supabase
        .from("categories")
        .select("id, name, display_order, awards(rank, label), candidates(id)")
        .eq("election_id", featured.id)
        .order("display_order")
    : { data: null };

  const categoryCount = categories?.length ?? 0;
  const candidateCount =
    categories?.reduce((total, category) => total + category.candidates.length, 0) ?? 0;

  /*
   * Signed in, `/` is the app's home rather than the pitch: the same chrome
   * every other voter screen wears, with the dashboard inside it. Until now the
   * rail's "Home" item dropped a signed-in voter onto the marketing page and
   * out of the chrome entirely.
   *
   * Signed out, everything below is unchanged — AppFrame renders children bare
   * when there is no user, so the landing page keeps its own header.
   */
  if (user) {
    const published = featured?.state === "PUBLISHED";

    /*
     * Three reads the marketing page never needs, so they live inside this
     * branch. All are things the viewer may already see elsewhere: their own
     * ballot_issued rows (who voted, never what), and the published tally,
     * which `election_results` gates on state = 'PUBLISHED' itself. Nothing
     * here can surface a count before publication.
     */
    const [issuedRes, resultsRes, tiesRes] = await Promise.all([
      featured && user.voterStatus === "APPROVED"
        ? supabase
            .from("ballot_issued")
            .select("category_id")
            .eq("election_id", featured.id)
        : null,
      published
        ? supabase
            .from("election_results")
            .select(
              "category_id, category_name, category_order, candidate_id, display_name, photo_path, vote_count, result_rank",
            )
            .eq("election_id", featured!.id)
        : null,
      published
        ? supabase
            .from("tie_resolutions")
            .select("category_id, resolution")
            .eq("election_id", featured!.id)
        : null,
    ]);

    const votedIn = new Set(
      (issuedRes?.data ?? []).map((row) => row.category_id),
    );
    const ballot = issuedRes
      ? (categories ?? []).map((category) => ({
          id: category.id,
          name: category.name,
          voted: votedIn.has(category.id),
        }))
      : null;

    const resultRows = resultsRes?.data ?? [];
    const totalVotes = published
      ? resultRows.reduce((sum, row) => sum + (row.vote_count ?? 0), 0)
      : null;

    // An officer's tie resolution overrides the raw rank, exactly as it does on
    // the results page — a preview that ignored it would name the wrong winner.
    const resolutionFor = new Map(
      (tiesRes?.data ?? []).map((tie) => [
        tie.category_id,
        tie.resolution as Record<string, number> | null,
      ]),
    );
    const finalRank = (row: (typeof resultRows)[number]) =>
      resolutionFor.get(row.category_id ?? "")?.[row.candidate_id ?? ""] ??
      row.result_rank ??
      0;

    const byCategory = new Map<string, typeof resultRows>();
    for (const row of resultRows) {
      const key = row.category_id ?? "";
      byCategory.set(key, [...(byCategory.get(key) ?? []), row]);
    }

    const winners = [...byCategory.values()]
      .map((rows) => rows.slice().sort((a, b) => finalRank(a) - finalRank(b))[0])
      .filter((row) => row && finalRank(row) === 1)
      .sort((a, b) => (a.category_order ?? 0) - (b.category_order ?? 0))
      .map((row) => ({
        categoryId: row.category_id ?? "",
        categoryName: row.category_name ?? "",
        awardLabel:
          categories
            ?.find((category) => category.id === row.category_id)
            ?.awards.find((award) => award.rank === 1)?.label ?? null,
        displayName: row.display_name ?? "",
        voteCount: row.vote_count ?? 0,
        photoUrl: row.photo_path
          ? supabase.storage
              .from("candidate-photos")
              .getPublicUrl(row.photo_path).data.publicUrl
          : null,
      }));

    return (
      <AppFrame>
        <HomeDashboard
          user={user}
          featured={featured}
          categoryCount={categoryCount}
          candidateCount={candidateCount}
          totalVotes={totalVotes}
          ballot={ballot}
          winners={winners}
        />
      </AppFrame>
    );
  }

  const { status, tone, cta } = hero(featured, user);
  const deadline = featured?.verification_deadline ?? null;
  const deadlineAhead = isUpcoming(deadline);
  const closing = countdownParts(featured?.closes_at ?? null);

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-hairline bg-canvas/80 backdrop-blur-lg">
        <div className="mx-auto flex h-16 max-w-[1120px] items-center justify-between px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-4 sm:gap-8">
            <Link href="/" className="flex items-center gap-3 text-ink no-underline hover:no-underline">
              <Image
                src="/MTU_Logo.png"
                alt="MTU logo"
                width={44}
                height={44}
                className="h-11 w-11 shrink-0 object-contain"
              />
              <span className="truncate text-body-sm font-bold tracking-tight">MTU Elections</span>
            </Link>
            <nav className="hidden items-center gap-2 sm:flex">
              <Link
                href="#how-it-works"
                className="rounded-xl border border-transparent px-4 py-2 text-body-sm font-semibold text-ink-muted no-underline transition-all hover:border-primary/20 hover:bg-primary/8 hover:text-brand-ink hover:shadow-soft hover:no-underline"
              >
                How it works
              </Link>
              <Link
                href="/results"
                className="rounded-xl border border-primary/30 bg-primary/8 px-4 py-2 text-body-sm font-semibold text-brand-ink no-underline shadow-[0_5px_14px_-10px_rgb(35_120_167/0.55)] transition-all hover:-translate-y-0.5 hover:border-primary/55 hover:bg-primary/15 hover:shadow-soft hover:no-underline"
              >
                Results
              </Link>
            </nav>
          </div>
          {user ? (
            <ButtonLink href="/account" variant="tertiary" className="!min-h-10 !px-4 !text-caption">
              Your status
            </ButtonLink>
          ) : (
            <ButtonLink href="/login" variant="tertiary" className="!min-h-10 !px-4 !text-caption">
              Sign in
            </ButtonLink>
          )}
        </div>
      </header>

      <main className="flex-1">
        {/* HERO */}
        <section className="relative overflow-hidden bg-[image:var(--gradient-hero)]">
          <div className="pointer-events-none absolute -top-24 -right-24 h-96 w-96 animate-float rounded-full bg-primary/20 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-32 -left-16 h-80 w-80 animate-float rounded-full bg-campus-yellow/15 blur-3xl" style={{ animationDelay: "-3s" }} />
          <div className="pointer-events-none absolute bottom-8 right-[18%] h-28 w-28 rounded-full bg-campus-red/10 blur-3xl" />

          <div className="relative mx-auto max-w-[1120px] px-4 py-16 sm:px-6 sm:py-28">
            <div className="grid items-center gap-12 lg:grid-cols-[1fr_1.05fr] lg:gap-14">
              <div>
                <div className="animate-fade-up">
                  <Tag tone={tone}>{status}</Tag>
                </div>
                <h1 className="animate-fade-up mt-6 max-w-[760px] text-display-md text-ink sm:text-display-xl" style={{ animationDelay: "0.05s" }}>
                  Your campus.{" "}
                  <span className="brand-gradient-text">Your choice.</span>
                </h1>
                <p className="animate-fade-up mt-5 max-w-[560px] text-body-lg text-ink-muted" style={{ animationDelay: "0.1s" }}>
                  Every verified student and staff member gets one vote per category.
                  Verify once, vote in under a minute. Results stay sealed until the
                  election officer publishes them.
                </p>

                <div className="animate-fade-up mt-9 flex flex-col gap-3 sm:flex-row" style={{ animationDelay: "0.15s" }}>
                  <ButtonLink href={cta.href} className="!min-h-14 !w-full !px-7 !text-body sm:!w-auto">
                    {cta.label}
                  </ButtonLink>
                  {!user ? (
                    <ButtonLink
                      href="/login"
                      variant="tertiary"
                      className="!min-h-14 !w-full !border-primary/30 !bg-white/80 !px-7 !text-body !text-brand-ink hover:!border-primary hover:!bg-white sm:!w-auto"
                    >
                      Sign in
                    </ButtonLink>
                  ) : null}
                </div>

                {featured && categoryCount > 0 ? (
                  <div className="animate-fade-up mt-12 grid gap-3 sm:mt-16 sm:grid-cols-3" style={{ animationDelay: "0.2s" }}>
                    {[
                      { label: "categories on the ballot", value: categoryCount },
                      { label: "candidates standing", value: candidateCount },
                      // Number + unit, so all three tiles share one type size.
                      {
                        label: closing
                          ? closing.past
                            ? `${closing.unit} since voting closed`
                            : `${closing.unit} until voting closes`
                          : "voting",
                        value: closing ? closing.value : "—",
                      },
                    ].map((stat) => (
                      <div key={stat.label} className="glass-panel card-hover min-w-0 rounded-2xl p-5 shadow-soft sm:p-6">
                        <dd className="text-display-md text-ink">{stat.value}</dd>
                        <dt className="mt-1 text-body-sm text-ink-muted">{stat.label}</dt>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>

              {/* Hero image — MTU_Card.jpg in a clean modern frame */}
              <div className="animate-fade-up relative hidden lg:block" style={{ animationDelay: "0.2s" }}>
                <div className="relative mx-auto w-full pb-9">
                  {/* Soft brand glow accent (single layer, keeps image vivid) */}
                  <div className="absolute -inset-3 rounded-[40px] bg-[image:var(--gradient-brand)] opacity-15 blur-2xl" aria-hidden="true" />

                  {/* Main image card — rectangular, clean, modern */}
                  <div className="relative overflow-hidden rounded-[28px] border border-white/80 bg-white/85 p-2 shadow-[0_24px_50px_-22px_rgb(20_32_51/0.4),0_8px_18px_-12px_rgb(35_120_167/0.25)] backdrop-blur-xl transition-transform duration-500 hover:-translate-y-1">
                    <div className="relative aspect-[4/3] w-full overflow-hidden rounded-[20px] bg-[image:var(--gradient-mesh)]">
                      <Image
                        src="/MTU_Card.jpg"
                        alt="Myanmar Technological University campus"
                        fill
                        sizes="(max-width: 1024px) 0vw, 520px"
                        className="object-cover transition-transform duration-700 hover:scale-[1.025]"
                        priority
                      />
                      {/* Subtle gradient overlay for depth only */}
                      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink/8 via-transparent to-transparent" aria-hidden="true" />
                    </div>
                  </div>

                  {/* Bottom info bar */}
                  <div className="relative mx-6 -mt-8 flex items-center justify-between gap-4 rounded-2xl border border-white/80 bg-canvas/95 px-5 py-4 shadow-card backdrop-blur">
                    <div>
                      <p className="text-caption font-bold uppercase tracking-[0.14em] text-brand-ink">
                        MTU Elections
                      </p>
                      <p className="mt-1 text-body-sm font-semibold text-ink">
                        A campus tradition, decided by you.
                      </p>
                    </div>
                    <span
                      aria-hidden="true"
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[image:var(--gradient-gold)] text-lg shadow-soft"
                    >
                      ★
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Only signed-out visitors reach this point, so the banner no longer
            branches on the viewer: it always addresses someone with no account. */}
        {deadlineAhead ? (
          <section className="bg-accent-bg">
            <div className="mx-auto flex max-w-[1120px] flex-col items-start justify-between gap-4 px-4 py-5 sm:flex-row sm:items-center sm:px-6">
              <p className="flex items-center gap-2 text-body-sm font-medium text-accent-ink">
                <span className="text-lg">⏰</span>
                Verification closes {formatMoment(deadline)} — get verified before the ballot opens.
              </p>
              <ButtonLink href="/register" className="!min-h-10 !w-full !px-5 !text-caption sm:!w-auto">
                Register
              </ButtonLink>
            </div>
          </section>
        ) : null}

        {/* HOW IT WORKS */}
        <section id="how-it-works" className="bg-surface-1 py-20">
          <div className="mx-auto max-w-[1120px] px-4 sm:px-6">
            <p className="text-caption font-bold uppercase tracking-[0.14em] text-brand-ink">Getting started</p>
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <h2 className="mt-2 text-display-md">How it works</h2>
                <p className="mt-3 max-w-[560px] text-body text-ink-muted">A clear, three-step path from registration to a secure vote.</p>
              </div>
              <Link href="/register" className="link-action text-body-sm">Register</Link>
            </div>
            <div className="mt-8 grid gap-4 sm:mt-10 sm:grid-cols-3 sm:gap-5">
              {STEPS.map((item) => (
                <div key={item.step} className="relative rounded-2xl border border-hairline bg-canvas p-6 shadow-soft sm:p-7">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-body-sm font-bold text-brand-ink">{item.step}</span>
                  <p className="mt-5 text-subhead text-ink">{item.title}</p>
                  <p className="mt-1.5 text-body-sm text-ink-muted">{item.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="results" className="bg-canvas py-20">
          <div className="mx-auto grid max-w-[1120px] gap-8 px-4 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
            <div>
              <p className="text-caption font-bold uppercase tracking-[0.14em] text-brand-ink">Official results</p>
              <h2 className="mt-2 text-display-md">Clear when it counts.</h2>
              <p className="mt-4 max-w-[480px] text-body text-ink-muted">Published results are presented by category, with final rankings and vote totals in one clear view.</p>
              <ButtonLink href="/results" variant="tertiary" className="mt-7 !w-full sm:!w-auto">View official results</ButtonLink>
            </div>
            <Link href="/results" className="card-hover block overflow-hidden rounded-[24px] border border-hairline bg-surface-1 shadow-card no-underline hover:border-primary/45 hover:no-underline">
              <div className="flex items-center justify-between gap-4 border-b border-hairline bg-canvas px-5 py-4 sm:px-6">
                <div>
                  <p className="text-caption font-semibold uppercase tracking-[0.12em] text-ink-subtle">Results centre</p>
                  <p className="mt-1 truncate text-body font-semibold text-ink">{featured?.name ?? "Election results"}</p>
                </div>
                <Tag tone={featured?.state === "PUBLISHED" ? "done" : "locked"}>{featured?.state === "PUBLISHED" ? "Published" : "When published"}</Tag>
              </div>
              {/* The hero already carries categories and candidates; repeating
                  them here put the same two numbers on the page twice. */}
              <p className="bg-surface-1 px-5 py-6 text-body-sm text-ink-muted sm:px-6">
                Final rankings and vote totals for every category, published
                together once voting has closed.
              </p>
              <div className="flex items-center justify-between bg-canvas px-5 py-4 text-body-sm font-semibold text-brand-ink sm:px-6"><span>Open results centre</span><span aria-hidden="true">→</span></div>
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/10 bg-inverse-canvas text-inverse-ink-muted">
        <div className="mx-auto grid max-w-[1120px] gap-10 px-4 py-12 sm:grid-cols-2 sm:px-6 sm:py-16">
          <div className="border-b border-white/10 pb-8 sm:border-b-0 sm:pb-0">
            <div className="flex items-center gap-2.5">
              <Image
                src="/MTU_Logo.png"
                alt="MTU logo"
                width={36}
                height={36}
                className="h-9 w-9 shrink-0 object-contain"
              />
              <span className="text-body-sm font-bold text-inverse-ink">MTU Elections</span>
            </div>
            <p className="mt-3 max-w-[420px] text-body-sm leading-relaxed">
              Run by the Student Union electoral office. Every administrative
              action is written to an immutable audit log, and no ballot is ever
              linked to the person who cast it.
            </p>
          </div>
          <div>
            <p className="text-body-sm font-semibold text-inverse-ink">Voting</p>
            <ul className="mt-4 grid gap-3 text-body-sm sm:grid-cols-2">
              {/* Only routes a signed-out visitor can actually open. /verify
                  and /vote are protected and redirected them to /login. */}
              <li><Link className="footer-link" href="/register">Register</Link></li>
              <li><Link className="footer-link" href="/login">Sign in</Link></li>
              <li><Link className="footer-link" href="#how-it-works">How it works</Link></li>
              <li><Link className="footer-link" href="/results">Results</Link></li>
            </ul>
          </div>
        </div>
      </footer>
    </>
  );
}