import type { Metadata } from "next";
import Link from "next/link";

import { ButtonLink } from "@/components/ui/button";
import { DashboardPage, RailCard } from "@/components/ui/dashboard-page";
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
  const complete = statusSteps.filter((step) => step.tag.tone === "done").length;

  /*
   * The rail carries only what the nav does not. Sign out, the reviewer queue,
   * elections and admin are all nav rows already — repeating them here as a
   * "Staff access" card was a second copy of the same links. Resending a
   * confirmation email has nowhere else to live, so it is what remains; once
   * the address is confirmed there is no secondary content and the shell drops
   * to a single column.
   */
  const rail = !confirmed ? (
    <RailCard title="Email">
      <Link
        href={`/confirm?email=${encodeURIComponent(user.email ?? "")}`}
        className="text-body-sm"
      >
        Resend confirmation email
      </Link>
    </RailCard>
  ) : undefined;

  return (
    <DashboardPage
      eyebrow="Account progress"
      title="Your status"
      subtitle={user.email}
      status={
        <span className="rounded-full border border-primary/15 bg-canvas/80 px-3 py-1.5 text-caption font-semibold text-brand-ink shadow-soft">
          {complete} of 3 complete
        </span>
      }
      actions={
        confirmed && user.voterStatus === "UNVERIFIED" ? (
          <ButtonLink href="/verify" className="!min-h-11 !px-5">
            Start verification
          </ButtonLink>
        ) : user.voterStatus === "REJECTED" ? (
          <ButtonLink href="/verify" className="!min-h-11 !px-5">
            Try again
          </ButtonLink>
        ) : null
      }
      rail={rail}
    >
      <section className="surface-panel overflow-hidden">
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
      </section>
    </DashboardPage>
  );
}
