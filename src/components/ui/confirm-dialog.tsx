"use client";

import { useEffect, useId, type ReactNode } from "react";
import { createPortal } from "react-dom";

/**
 * A small modal for confirming an action.
 *
 * Escape and the backdrop both cancel, so there is always a way out that is not
 * the confirm button. Callers own the footer: some confirmations submit a
 * server action, others just call back, and this makes no assumption about
 * which.
 *
 * Give the caller's first focusable element `autoFocus` — it should be the
 * cancelling or neutral control, never the destructive one.
 *
 * Rendered through a portal to `document.body`, and that is load-bearing: the
 * nav rail is `position: sticky`, which creates a stacking context even at
 * `z-index: auto`. A dialog rendered inside it has its own z-index scoped to
 * that context, so the backdrop sat *below* the header and the mobile bar
 * (both `z-30`) and left them undimmed and clickable. The portal lifts it out
 * of every ancestor context, so callers can sit anywhere in the tree.
 */
export function ConfirmDialog({
  title,
  onCancel,
  children,
  footer,
  width = "420px",
}: {
  title: string;
  onCancel: () => void;
  /** Body: explanation, and any input the confirmation requires. */
  children: ReactNode;
  /** Action row, right-aligned at the bottom. */
  footer: ReactNode;
  width?: string;
}) {
  const titleId = useId();

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  // Never rendered during SSR — callers mount it from interaction state, which
  // starts closed — so there is no hydration pass to mismatch.
  if (typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Cancel"
        onClick={onCancel}
        className="absolute inset-0 cursor-default bg-ink/30"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        style={{ maxWidth: width }}
        className="surface-panel relative w-full p-6"
      >
        <h2 id={titleId} className="text-card-title">
          {title}
        </h2>
        <div className="mt-2">{children}</div>
        <div className="mt-6 flex flex-wrap justify-end gap-3">{footer}</div>
      </div>
    </div>,
    document.body,
  );
}
