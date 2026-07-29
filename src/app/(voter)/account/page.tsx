import type { Metadata } from "next";
import Link from "next/link";

import { logout } from "../../(public)/auth-actions";
import { Button } from "@/components/ui/button";
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

  return (
    <main className="flex flex-1 justify-center bg-surface-1 px-4 py-16">
      <div className="w-full max-w-[640px]">
        <div className="border border-hairline bg-canvas">
          <div className="flex items-baseline justify-between border-b border-hairline px-6 py-4">
            <h1 className="text-card-title">Your status</h1>
            <span className="text-body-sm text-ink-muted">{user.email}</span>
          </div>

          <ul className="divide-y divide-hairline">
            {steps(user).map((step) => (
              <li
                key={step.title}
                className="flex items-center justify-between gap-4 px-6 py-4"
              >
                <div>
                  <p className="text-body text-ink">{step.title}</p>
                  <p className="text-body-sm text-ink-muted">{step.detail}</p>
                </div>
                <Tag tone={step.tag.tone}>{step.tag.label}</Tag>
              </li>
            ))}
          </ul>

          <div className="flex flex-wrap items-center gap-3 border-t border-hairline px-6 py-4">
            {confirmed && user.voterStatus === "UNVERIFIED" ? (
              <Link
                href="/verify"
                className="inline-flex min-h-12 items-center bg-primary px-4 py-3 text-body-sm text-on-primary no-underline hover:bg-primary-hover hover:no-underline"
              >
                Start verification
              </Link>
            ) : null}
            {user.voterStatus === "REJECTED" ? (
              <Link
                href="/verify"
                className="inline-flex min-h-12 items-center bg-primary px-4 py-3 text-body-sm text-on-primary no-underline hover:bg-primary-hover hover:no-underline"
              >
                Try again
              </Link>
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
          <div className="mt-4 border border-hairline bg-canvas px-6 py-4">
            <p className="text-body-sm text-ink-muted">Staff access</p>
            <ul className="mt-2 flex flex-wrap gap-x-6 gap-y-2 text-body-sm">
              {user.roles.includes("REVIEWER") ? (
                <li>
                  <Link href="/review">Verification queue</Link>
                </li>
              ) : null}
              {user.roles.includes("ELECTION_OFFICER") ? (
                <li>
                  <Link href="/elections">Elections</Link>
                </li>
              ) : null}
              {user.roles.includes("ADMIN") ? (
                <li>
                  <Link href="/admin">Admin</Link>
                </li>
              ) : null}
            </ul>
          </div>
        ) : null}
      </div>
    </main>
  );
}
