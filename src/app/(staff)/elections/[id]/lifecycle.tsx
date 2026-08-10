"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";

import { transitionElection, type TransitionState } from "../actions";
import { Button } from "@/components/ui/button";
import { FormError } from "@/components/ui/tile";
import type { Database } from "@/lib/db/database.types";

type ElectionState = Database["public"]["Enums"]["election_state"];

const STEPS: { state: ElectionState; title: string; note: string }[] = [
  {
    state: "DRAFT",
    title: "Draft",
    note: "Categories, awards and candidates are editable.",
  },
  {
    state: "CANDIDATES_LOCKED",
    title: "Candidates locked",
    note: "The ballot is frozen. No further edits.",
  },
  { state: "OPEN", title: "Open", note: "" },
  {
    state: "CLOSED",
    title: "Closed",
    note: "Voting has ended. Ties are resolved here.",
  },
  {
    state: "PUBLISHED",
    title: "Published",
    note: "Results are public.",
  },
];

/** The one legal step forward from each state. */
const NEXT: Partial<Record<ElectionState, { to: ElectionState; cta: string }>> =
  {
    DRAFT: { to: "CANDIDATES_LOCKED", cta: "Lock candidates" },
    CANDIDATES_LOCKED: { to: "OPEN", cta: "Open voting" },
    OPEN: { to: "CLOSED", cta: "Close voting" },
    CLOSED: { to: "PUBLISHED", cta: "Publish results" },
  };

const CONFIRM: Partial<
  Record<ElectionState, { title: string; body: string; submit: string }>
> = {
  CANDIDATES_LOCKED: {
    title: "Lock candidates?",
    body: "The ballot will be frozen. You won't be able to edit categories, awards or candidates afterwards.",
    submit: "Lock candidates",
  },
  OPEN: {
    title: "Open voting?",
    body: "Verified voters can begin casting ballots once the opening time arrives. Make sure the schedule is correct first.",
    submit: "Open voting",
  },
  CLOSED: {
    title: "Close voting?",
    body: "No further votes will be accepted. You'll need to resolve any ties before results can be published.",
    submit: "Close voting",
  },
  PUBLISHED: {
    title: "Publish results?",
    body: "Results become public immediately and this cannot be undone.",
    submit: "Publish",
  },
};

function Submit({
  label,
  danger,
}: {
  label: string;
  danger?: boolean;
}) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      variant={danger ? "danger" : "primary"}
      disabled={pending}
    >
      {pending ? "Working…" : label}
    </Button>
  );
}

export function Lifecycle({
  electionId,
  state,
  hasUnresolvedTie,
  openNote,
}: {
  electionId: string;
  state: ElectionState;
  hasUnresolvedTie: boolean;
  openNote: string;
}) {
  const [result, formAction] = useActionState<TransitionState, FormData>(
    transitionElection,
    {},
  );
  const [confirming, setConfirming] = useState<ElectionState | null>(null);

  const currentIndex = STEPS.findIndex((step) => step.state === state);
  const next = NEXT[state];
  const publishBlocked = next?.to === "PUBLISHED" && hasUnresolvedTie;
  /*
   * Server Actions refresh the election state without remounting this client
   * component. A previous confirmation target must therefore be ignored as
   * soon as the election advances; otherwise DRAFT → CANDIDATES_LOCKED leaves
   * a stale CANDIDATES_LOCKED target ready to submit again.
   */
  const confirmedTarget = confirming === next?.to ? confirming : null;
  const confirmCopy = confirmedTarget ? CONFIRM[confirmedTarget] : null;

  return (
    <div className="surface-panel">
      <div className="border-b border-hairline px-6 py-4">
        <h2 className="text-card-title">Lifecycle</h2>
        <p className="text-body-sm text-ink-muted">
          One step at a time, and only forwards.
        </p>
      </div>

      <ol className="px-6 py-6">
        {STEPS.map((step, index) => {
          const done = index < currentIndex;
          const current = index === currentIndex;
          return (
            <li
              key={step.state}
              className="flex gap-4 border-l-2 pl-4 pb-6 last:pb-0"
              style={{
                borderColor: done
                  ? "var(--color-success-ink)"
                  : current
                    ? "var(--color-primary)"
                    : "var(--color-hairline)",
              }}
            >
              <div>
                <p
                  className={
                    "text-body-sm " +
                    (current
                      ? "text-ink"
                      : done
                        ? "text-ink-muted"
                        : "text-ink-subtle")
                  }
                >
                  {step.title}
                  {done ? " — complete" : current ? " — current" : ""}
                </p>
                <p className="text-caption text-ink-muted">
                  {step.state === "OPEN" ? openNote : step.note}
                </p>
              </div>
            </li>
          );
        })}
      </ol>

      <div className="flex flex-col gap-4 border-t border-hairline px-6 py-6">
        {result.error ? <FormError>{result.error}</FormError> : null}

        {publishBlocked ? (
          <div className="border-l-2 border-warning-ink bg-warning-bg px-4 py-3 text-body-sm">
            <p>
              Two or more candidates are tied on a rank that carries an award.
              Publication stays blocked until a resolution is recorded for each
              affected category.
            </p>
            <p className="mt-2">
              <Link href={`/elections/${electionId}/ties`}>Resolve ties</Link>
            </p>
          </div>
        ) : null}

        {!next ? (
          <p className="text-body-sm text-ink-muted">
            This election is published. Nothing further to do.
          </p>
        ) : confirmedTarget && confirmCopy ? (
          <form action={formAction} className="flex flex-col gap-3">
            <input type="hidden" name="id" value={electionId} />
            <input type="hidden" name="to" value={confirmedTarget} />
            <p className="text-body text-ink">{confirmCopy.title}</p>
            <p className="text-body-sm text-ink-muted">{confirmCopy.body}</p>
            {confirmedTarget === "OPEN" ? (
              <p className="text-caption text-ink-muted">{openNote}</p>
            ) : null}
            <div className="flex gap-3">
              <Submit
                label={confirmCopy.submit}
                danger={confirmedTarget === "CLOSED"}
              />
              <Button
                type="button"
                variant="ghost"
                onClick={() => setConfirming(null)}
              >
                Cancel
              </Button>
            </div>
          </form>
        ) : (
          <div className="flex flex-col gap-2">
            <Button
              type="button"
              onClick={() => setConfirming(next.to)}
              disabled={publishBlocked && next.to === "PUBLISHED"}
              variant={next.to === "CLOSED" ? "danger" : "primary"}
            >
              {next.cta}
            </Button>
            {next.to === "OPEN" ? (
              <p className="text-caption text-ink-muted">{openNote}</p>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
