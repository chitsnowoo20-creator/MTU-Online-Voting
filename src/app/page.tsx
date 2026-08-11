import Image from "next/image";
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

export const dynamic = "force-dynamic";

const STEPS = [
  { step: "01", href: "/register", title: "Register", body: "Any email works. Confirm it from your inbox." },
  { step: "02", href: "/verify", title: "Verify identity", body: "Upload your ID card. A reviewer checks it, then deletes the image." },
  { step: "03", href: "/vote", title: "Vote", body: "One candidate per category. Votes are private and final." },
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
        .select("id, candidates(id)")
        .eq("election_id", featured.id)
    : { data: null };

  const categoryCount = categories?.length ?? 0;
  const candidateCount =
    categories?.reduce((total, category) => total + category.candidates.length, 0) ?? 0;

  const { status, tone, cta } = hero(featured, user);
  const deadline = featured?.verification_deadline ?? null;
  const deadlineAhead = isUpcoming(deadline);

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-hairline bg-canvas/80 backdrop-blur-lg">
        <div className="mx-auto flex h-16 max-w-[1120px] items-center justify-between px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-4 sm:gap-8">
            <Link href="/" className="flex items-center gap-2.5 text-ink no-underline hover:no-underline">
              <span className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-xl bg-white shadow-soft ring-1 ring-hairline">
                <Image
                  src="/MTU.png"
                  alt="MTU logo"
                  width={36}
                  height={36}
                  className="h-full w-full object-contain"
                />
              </span>
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
            <div className="grid items-center gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16">
              <div>
                <div className="animate-fade-up">
                  <Tag tone={tone}>{status}</Tag>
                </div>
                <h1 className="animate-fade-up mt-6 max-w-[760px] text-display-md text-ink sm:text-display-xl" style={{ animationDelay: "0.05s" }}>
                  Your campus.{" "}
                  <span className="brand-gradient-text">
                    Your King & Queen.
                  </span>
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
                      {
                        label: featured.state === "OPEN" ? "until voting closes" : "voting closed",
                        value: featured.closes_at ? formatCountdown(featured.closes_at).replace(/^in /, "") : "—",
                      },
                    ].map((stat) => (
                      <div key={stat.label} className="glass-panel card-hover rounded-2xl p-5 shadow-soft sm:p-6">
                        <dd className="text-display-md text-ink">{stat.value}</dd>
                        <dt className="mt-1 text-body-sm text-ink-muted">{stat.label}</dt>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>

              {/* Hero image — man-tu.jpg in a modern card */}
              <div className="animate-fade-up relative hidden lg:block" style={{ animationDelay: "0.2s" }}>
                <div className="relative">
                  {/* Decorative backdrop */}
                  <div className="absolute -inset-4 rounded-[36px] bg-[image:var(--gradient-brand)] opacity-15 blur-2xl" aria-hidden="true" />
                  <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-campus-yellow/20 blur-xl" aria-hidden="true" />
                  <div className="absolute -bottom-8 -left-8 h-28 w-28 rounded-full bg-campus-red/10 blur-xl" aria-hidden="true" />

                  {/* Main image card */}
                  <div className="relative overflow-hidden rounded-[28px] border border-white/60 bg-white/70 shadow-lift backdrop-blur-xl">
                    <div className="relative aspect-[4/5] w-full overflow-hidden bg-[image:var(--gradient-mesh)]">
                      <Image
                        src="/man-tu.jpg"
                        alt="Myanmar Technological University campus"
                        fill
                        sizes="(max-width: 1024px) 0vw, 480px"
                        className="object-cover transition-transform duration-700 hover:scale-[1.025]"
                        priority
                      />
                      {/* Soft gradient overlay for depth */}
                      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink/15 via-transparent to-transparent" aria-hidden="true" />
                    </div>

                    {/* Floating stat chip */}
                    <div className="hidden">
                      <p className="text-caption font-bold text-brand-ink">MTU</p>
                      <p className="text-caption text-ink-muted">Campus Elections</p>
                    </div>

                    {/* Floating badge */}
                    <div className="hidden">
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[image:var(--gradient-gold)] text-sm">👑</span>
                      <div>
                        <p className="text-caption font-bold text-ink">King & Queen</p>
                        <p className="text-caption text-ink-muted">Vote now</p>
                      </div>
                    </div>
                  </div>
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

        {deadlineAhead && user?.voterStatus !== "APPROVED" ? (
          <section className="bg-accent-bg">
            <div className="mx-auto flex max-w-[1120px] flex-col items-start justify-between gap-4 px-4 py-5 sm:flex-row sm:items-center sm:px-6">
              <p className="flex items-center gap-2 text-body-sm font-medium text-accent-ink">
                <span className="text-lg">⏰</span>
                Verification closes {formatMoment(deadline)} — get verified before the ballot opens.
              </p>
              <ButtonLink href={user ? "/verify" : "/register"} className="!min-h-10 !w-full !px-5 !text-caption sm:!w-auto">
                {user ? "Start verification" : "Register"}
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
              <Link href={cta.href} className="link-action text-body-sm">{cta.label}</Link>
            </div>
            <div className="mt-8 grid gap-4 sm:mt-10 sm:grid-cols-3 sm:gap-5">
              {STEPS.map((item) => (
                <Link key={item.step} href={item.href} className="card-hover group relative rounded-2xl border border-hairline bg-canvas p-6 shadow-soft no-underline hover:border-primary/45 hover:no-underline sm:p-7">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-body-sm font-bold text-brand-ink">{item.step}</span>
                  <p className="mt-5 text-subhead text-ink">{item.title}</p>
                  <p className="mt-1.5 text-body-sm text-ink-muted">{item.body}</p>
                  <span className="mt-6 inline-flex items-center gap-2 text-body-sm font-semibold text-brand-ink">Explore this step <span aria-hidden="true" className="transition-transform duration-200 group-hover:translate-x-1">→</span></span>
                </Link>
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
              <div className="grid gap-px bg-hairline sm:grid-cols-2">
                <div className="bg-surface-1 p-5 sm:p-6"><p className="text-display-md text-ink">{categoryCount || "—"}</p><p className="mt-1 text-body-sm text-ink-muted">categories</p></div>
                <div className="bg-surface-1 p-5 sm:p-6"><p className="text-display-md text-ink">{candidateCount || "—"}</p><p className="mt-1 text-body-sm text-ink-muted">candidates</p></div>
              </div>
              <div className="flex items-center justify-between bg-canvas px-5 py-4 text-body-sm font-semibold text-brand-ink sm:px-6"><span>Open results centre</span><span aria-hidden="true">→</span></div>
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/10 bg-inverse-canvas text-inverse-ink-muted">
        <div className="mx-auto grid max-w-[1120px] gap-10 px-4 py-12 sm:grid-cols-2 sm:px-6 sm:py-16">
          <div className="border-b border-white/10 pb-8 sm:border-b-0 sm:pb-0">
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-lg bg-white/10 ring-1 ring-white/20">
                <Image
                  src="/MTU.png"
                  alt="MTU logo"
                  width={32}
                  height={32}
                  className="h-full w-full object-contain"
                />
              </span>
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
              <li><Link className="footer-link" href="/register">Register</Link></li>
              <li><Link className="footer-link" href="/verify">Verify your ID</Link></li>
              <li><Link className="footer-link" href="/vote">Cast a vote</Link></li>
              <li><Link className="footer-link" href="/results">Results</Link></li>
            </ul>
          </div>
        </div>
      </footer>
    </>
  );
}
