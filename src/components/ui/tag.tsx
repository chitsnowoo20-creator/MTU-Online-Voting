import type { ReactNode } from "react";

/**
 * Status pill. Carbon keeps these flat and quiet — a tinted background with
 * matching dark ink, 12px, no border, no rounding.
 */
type Tone = "done" | "pending" | "locked" | "error" | "info";

const TONES: Record<Tone, string> = {
  done: "bg-success-bg text-success-ink",
  pending: "bg-warning-bg text-warning-ink",
  locked: "bg-surface-1 text-ink-muted",
  error: "bg-error-bg text-error-ink",
  info: "bg-surface-1 text-primary",
};

export function Tag({ tone, children }: { tone: Tone; children: ReactNode }) {
  return (
    <span className={`inline-block px-2.5 py-1 text-caption ${TONES[tone]}`}>
      {children}
    </span>
  );
}
