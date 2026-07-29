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

function Submit({ label, danger }: { label: string; danger?: boolean }) {
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
  /**
   * What the OPEN step actually means right now — computed on the server so
   * the wording can't disagree with the clock cast_vote() checks against.
   */
  openNote: string;
}) {
  const [result, formAction] = useActionState<TransitionState, FormData>(
    transitionElection,
    {},
  );
  const [confirming, setConfirming] = useState(false);

  const currentIndex = STEPS.findIndex((step) => step.state === state);
  const next = NEXT[state];
  const publishBlocked = next?.to === "PUBLISHED" && hasUnresolvedTie;

  return (
    <div className="border border-hairline bg-canvas">
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
        ) : next.to === "PUBLISHED" && confirming ? (
          <form action={formAction} className="flex flex-col gap-3">
            <input type="hidden" name="id" value={electionId} />
            <input type="hidden" name="to" value="PUBLISHED" />
            <p className="text-body text-ink">Publish results?</p>
            <p className="text-body-sm text-ink-muted">
              Results become public immediately and this cannot be undone.
            </p>
            <div className="flex gap-3">
              <Submit label="Publish" />
              <Button
                type="button"
                variant="ghost"
                onClick={() => setConfirming(false)}
              >
                Cancel
              </Button>
            </div>
          </form>
        ) : next.to === "PUBLISHED" ? (
          <Button
            type="button"
            onClick={() => setConfirming(true)}
            disabled={publishBlocked}
          >
            Publish results
          </Button>
        ) : (
          <form action={formAction} className="flex flex-col gap-2">
            <input type="hidden" name="id" value={electionId} />
            <input type="hidden" name="to" value={next.to} />
            <div>
              <Submit label={next.cta} danger={next.to === "CLOSED"} />
            </div>
            {next.to === "OPEN" ? (
              <p className="text-caption text-ink-muted">{openNote}</p>
            ) : null}
          </form>
        )}
      </div>
    </div>
  );
}
