import Link from "next/link";
import type { ReactNode } from "react";

import { Tag } from "@/components/ui/tag";
import type { Database } from "@/lib/db/database.types";
import { formatCountdown, votingPhase } from "@/lib/election/schedule";

type ElectionState = Database["public"]["Enums"]["election_state"];

/** How each lifecycle state reads to an officer, and which tone it wears. */
export const STATE_LABEL: Record<ElectionState, string> = {
  DRAFT: "Draft",
  CANDIDATES_LOCKED: "Candidates locked",
  OPEN: "Open",
  CLOSED: "Awaiting publish",
  PUBLISHED: "Published",
};

const STATE_TONE: Record<
  ElectionState,
  "done" | "pending" | "locked" | "info"
> = {
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

  if (phase === "SCHEDULED") {
    return <Tag tone="info">Opens {formatCountdown(opensAt)}</Tag>;
  }
  if (phase === "LIVE") {
    return <Tag tone="pending">Voting live</Tag>;
  }
  if (phase === "AWAITING_CLOSE") {
    return <Tag tone="info">Closing</Tag>;
  }
  return <Tag tone={STATE_TONE[state]}>{STATE_LABEL[state]}</Tag>;
}

/** Shared chrome for every staff screen: back link, title row, actions. */
export function StaffPage({
  title,
  subtitle,
  back,
  actions,
  children,
  width = "880px",
}: {
  title: string;
  subtitle?: ReactNode;
  back?: { href: string; label: string };
  actions?: ReactNode;
  children: ReactNode;
  width?: string;
}) {
  return (
    <main className="flex-1 bg-surface-1 px-4 py-16">
      <div className="mx-auto w-full" style={{ maxWidth: width }}>
        {back ? (
          <p className="mb-4 text-body-sm">
            <Link href={back.href}>← {back.label}</Link>
          </p>
        ) : null}

        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-headline">{title}</h1>
            {subtitle ? (
              <div className="mt-1 text-body-sm text-ink-muted">{subtitle}</div>
            ) : null}
          </div>
          {actions ? <div className="flex gap-3">{actions}</div> : null}
        </div>

        {children}
      </div>
    </main>
  );
}

