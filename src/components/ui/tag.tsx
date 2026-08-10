import type { ReactNode } from "react";

/** Same `tone` API. Now a soft pill with a dot, reads more "status chip" than
 * "form label." */
type Tone = "done" | "pending" | "locked" | "error" | "info";

const TONES: Record<Tone, string> = {
  done: "bg-success-bg text-success-ink",
  pending: "bg-warning-bg text-warning-ink ring-1 ring-warning/15",
  locked: "bg-surface-2 text-ink-muted",
  error: "bg-error-bg text-error-ink",
  info: "bg-primary/10 text-brand-ink ring-1 ring-primary/10",
};

const DOTS: Record<Tone, string> = {
  done: "bg-success",
  pending: "bg-warning",
  locked: "bg-ink-subtle",
  error: "bg-error",
  info: "bg-primary",
};

export function Tag({ tone, children }: { tone: Tone; children: ReactNode }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-caption font-semibold ${TONES[tone]}`}
    >
      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${DOTS[tone]}`} />
      {children}
    </span>
  );
}
