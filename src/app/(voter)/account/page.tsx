import type { Metadata } from "next";
import Link from "next/link";

import { logout } from "../../(public)/auth-actions";
import { Button, ButtonLink } from "@/components/ui/button";
import { Tag } from "@/components/ui/tag";
import { requireUser } from "@/lib/auth/guards";

export const metadata: Metadata = { title: "Your status · Campus Elections" };

type Step = {
  title: string;
  detail: string;
  tag: { tone: "done" | "pending" | "locked" | "error"; label: string };
};

/**
 * The three gates, in the order a voter passes them. Email confirmation and
 * verification are independent states and are shown as such — confirming an
 * email grants nothing on its own (AGENTS.md invariant 9).
 */
function steps(user: Awaited<ReturnType<typeof requireUser>>): Step[] {
  const confirmed = Boolean(user.emailConfirmedAt);

  const emailStep: Step = confirmed
    ? {
        title: "Email confirmed",
        detail: new Date(user.emailConfirmedAt!).toLocaleString("en-GB", {
          dateStyle: "medium",
          timeStyle: "short",
        }),
        tag: { tone: "done", label: "Done" },
      }
    : {
        title: "Email confirmed",
        detail: "Open the link we emailed you.",
        tag: { tone: "pending", label: "Waiting" },
      };

  const identityStep: Step = {
    UNVERIFIED: {
      title: "Identity verified",
      detail: confirmed
        ? "Upload a photo of your student or staff ID card."
        : "Confirm your email address first.",
      tag: { tone: "locked" as const, label: "Not started" },
    },
    PENDING: {
      title: "Identity verified",
      detail: "Submitted — a reviewer will check it shortly.",
      tag: { tone: "pending" as const, label: "Pending" },
    },
    APPROVED: {
      title: "Identity verified",
      detail:
        user.memberType === "STAFF"
          ? "Approved as staff."
          : "Approved as a student.",
      tag: { tone: "done" as const, label: "Done" },
    },
    REJECTED: {
      title: "Identity verified",
      detail: "Your submission was not accepted. You can try again.",
      tag: { tone: "error" as const, label: "Rejected" },
    },
  }[user.voterStatus];

  const ballotStep: Step =
    user.voterStatus === "APPROVED"
      ? {
          title: "Ballot access",
          detail: "You can vote once an election opens.",
          tag: { tone: "done", label: "Unlocked" },
        }
      : {
          title: "Ballot access",
          detail: "Unlocks once verification is approved.",
          tag: { tone: "locked", label: "Locked" },
        };

  return [emailStep, identityStep, ballotStep];
}

export default async function AccountPage() {
  const user = await requireUser("/account");
  const confirmed = Boolean(user.emailConfirmedAt);
  const statusSteps = steps(user);

  return (
    <main className="surface-page flex flex-1 justify-center px-4 py-10 sm:py-16">
      <div className="w-full max-w-[640px]">
        <div className="surface-panel overflow-hidden">
          <div className="relative overflow-hidden border-b border-hairline bg-gradient-to-br from-canvas via-canvas to-primary/10 px-6 py-6 sm:px-8">
            <div className="pointer-events-none absolute -right-12 -top-12 h-36 w-36 rounded-full bg-primary/12 blur-3xl" />
            <div className="relative">
              <p className="eyebrow-label">Account progress</p>
              <div className="mt-1 flex flex-wrap items-end justify-between gap-3">
                <div>
                  <h1 className="text-headline">Your status</h1>
                  <p className="mt-1 text-body-sm text-ink-muted">{user.email}</p>
                </div>
                <span className="rounded-full border border-primary/15 bg-canvas/80 px-3 py-1.5 text-caption font-semibold text-brand-ink shadow-soft">
                  {statusSteps.filter((step) => step.tag.tone === "done").length} of 3 complete
                </span>
              </div>
            </div>
          </div>

          <ul className="divide-y divide-hairline">
            {statusSteps.map((step, index) => (
              <li
                key={step.title}
                className="flex items-center justify-between gap-4 px-6 py-5 transition-colors hover:bg-primary/4"
              >
                <div className="flex min-w-0 items-center gap-4">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/8 text-caption font-bold text-brand-ink">
                    {index + 1}
                  </span>
                  <div>
                  <p className="text-body font-medium text-ink">{step.title}</p>
                  <p className="text-body-sm text-ink-muted">{step.detail}</p>
                  </div>
                </div>
                <Tag tone={step.tag.tone}>{step.tag.label}</Tag>
              </li>
            ))}
          </ul>

          <div className="flex flex-wrap items-center gap-3 border-t border-hairline bg-surface-1/60 px-6 py-4">
            {confirmed && user.voterStatus === "UNVERIFIED" ? (
              <ButtonLink
                href="/verify"
                className="!min-h-11 !px-5"
              >
                Start verification
              </ButtonLink>
            ) : null}
            {user.voterStatus === "REJECTED" ? (
              <ButtonLink
                href="/verify"
                className="!min-h-11 !px-5"
              >
                Try again
              </ButtonLink>
            ) : null}
            {!confirmed ? (
              <Link
                href={`/confirm?email=${encodeURIComponent(user.email ?? "")}`}
                className="text-body-sm"
              >
                Resend confirmation email
              </Link>
            ) : null}

            <form action={logout} className="ml-auto">
              <Button type="submit" variant="ghost">
                Sign out
              </Button>
            </form>
          </div>
        </div>

        {user.roles.length > 0 ? (
          <section className="mt-5 overflow-hidden rounded-3xl border border-hairline bg-canvas shadow-soft">
            <div className="flex flex-wrap items-end justify-between gap-3 border-b border-hairline bg-primary/6 px-6 py-5">
              <div>
                <p className="eyebrow-label">Staff workspace</p>
                <h2 className="mt-1 text-card-title">Staff access</h2>
              </div>
              <p className="text-caption text-ink-muted">Your assigned tools</p>
            </div>
            <ul className="grid gap-px bg-hairline sm:grid-cols-3">
              {user.roles.includes("REVIEWER") ? (
                <li className="bg-canvas">
                  <Link href="/review" className="group flex h-full min-h-32 flex-col justify-between p-5 no-underline transition-colors hover:bg-primary/6 hover:no-underline">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-brand-ink">✓</span>
                    <span>
                      <span className="block text-body-sm font-semibold text-ink">Verification queue</span>
                      <span className="mt-1 block text-caption text-ink-muted">Review voter ID submissions</span>
                    </span>
                  </Link>
                </li>
              ) : null}
              {user.roles.includes("ELECTION_OFFICER") ? (
                <li className="bg-canvas">
                  <Link href="/elections" className="group flex h-full min-h-32 flex-col justify-between p-5 no-underline transition-colors hover:bg-primary/6 hover:no-underline">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-brand-ink">◷</span>
                    <span>
                      <span className="block text-body-sm font-semibold text-ink">Elections</span>
                      <span className="mt-1 block text-caption text-ink-muted">Manage ballots and schedules</span>
                    </span>
                  </Link>
                </li>
              ) : null}
              {user.roles.includes("ADMIN") ? (
                <li className="bg-canvas">
                  <Link href="/admin" className="group flex h-full min-h-32 flex-col justify-between p-5 no-underline transition-colors hover:bg-primary/6 hover:no-underline">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-brand-ink">⌘</span>
                    <span>
                      <span className="block text-body-sm font-semibold text-ink">Administration</span>
                      <span className="mt-1 block text-caption text-ink-muted">Roles, departments and audit trail</span>
                    </span>
                  </Link>
                </li>
              ) : null}
            </ul>
          </section>
        ) : null}
      </div>
    </main>
  );
}
