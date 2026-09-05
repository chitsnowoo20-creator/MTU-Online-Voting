import Link from "next/link";
import type { ReactNode } from "react";

import { Tag } from "@/components/ui/tag";
import type { Database } from "@/lib/db/database.types";
import { formatCountdown, votingPhase } from "@/lib/election/schedule";

type ElectionState = Database["public"]["Enums"]["election_state"];

export const STATE_LABEL: Record<ElectionState, string> = {
  DRAFT: "Draft",
  CANDIDATES_LOCKED: "Candidates locked",
  OPEN: "Open",
  CLOSED: "Awaiting publish",
  PUBLISHED: "Published",
};

const STATE_TONE: Record<ElectionState, "done" | "pending" | "locked" | "info"> = {
  DRAFT: "locked",
  CANDIDATES_LOCKED: "info",
  OPEN: "pending",
  CLOSED: "info",
  PUBLISHED: "done",
};

export function StateTag({
  state,
  opensAt = null,
  closesAt = null,
}: {
  state: ElectionState;
  opensAt?: string | null;
  closesAt?: string | null;
}) {
  const phase = votingPhase(state, opensAt, closesAt);

  if (phase === "SCHEDULED") return <Tag tone="info">Opens {formatCountdown(opensAt)}</Tag>;
  if (phase === "LIVE") return <Tag tone="pending">Voting live</Tag>;
  if (phase === "AWAITING_CLOSE") return <Tag tone="info">Closing</Tag>;
  return <Tag tone={STATE_TONE[state]}>{STATE_LABEL[state]}</Tag>;
}

export function StaffPage({
  title,
  subtitle,
  back,
  actions,
  children,
  contentWidth,
}: {
  title: string;
  subtitle?: ReactNode;
  /**
   * A breadcrumb, not a general back button.
   *
   * Only for a destination the nav cannot name — the election you are inside.
   * Pages that merely sat one level under a nav row ("← Admin", "← Elections")
   * had this removed: repeating a row that is already on screen, under the same
   * label, is chrome.
   */
  back?: { href: string; label: string };
  actions?: ReactNode;
  children: ReactNode;
  /**
   * Caps the *content*, never the page container.
   *
   * This used to be a `width` prop on the container itself, which is why a
   * narrow screen drifted on both edges while a wide one only moved on the
   * left: `mx-auto` recentres a capped box when the nav rail collapses, and
   * leaves a full-width one alone. Every page now shares one 1120px container
   * and slides the same way; a form that wants to stay narrow constrains its
   * own column, left-aligned under a full-width header.
   */
  contentWidth?: string;
}) {
  return (
    <main className="surface-page flex-1 px-4 py-10 sm:py-14">
      <div className="mx-auto w-full max-w-[1120px]">
        {back ? (
          <p className="mb-4 text-body-sm font-medium">
            <Link href={back.href} className="inline-flex items-center gap-1 text-ink-muted hover:text-brand-ink">
              ← {back.label}
            </Link>
          </p>
        ) : null}

        <div className="mb-8 flex flex-wrap items-start justify-between gap-4 rounded-[24px] border border-primary/10 bg-[image:var(--gradient-mesh)] bg-inverse-canvas px-7 py-6 shadow-card">
          <div>
            <h1 className="text-headline text-inverse-ink">{title}</h1>
            {subtitle ? (
              <div className="mt-1.5 text-body-sm text-inverse-ink-muted">{subtitle}</div>
            ) : null}
          </div>
          {actions ? <div className="flex gap-3">{actions}</div> : null}
        </div>

        <div style={contentWidth ? { maxWidth: contentWidth } : undefined}>
          {children}
        </div>
      </div>
    </main>
  );
}
