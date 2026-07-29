import type { ComponentProps, ReactNode } from "react";

/**
 * A bordered tile. Depth in Carbon comes from a 1px hairline and a surface
 * change, never from a drop shadow.
 */
export function Tile({
  elevated = false,
  className = "",
  ...props
}: ComponentProps<"div"> & { elevated?: boolean }) {
  return (
    <div
      className={
        `border border-hairline p-6 ${elevated ? "bg-surface-1" : "bg-canvas"} ` +
        className
      }
      {...props}
    />
  );
}

/** The small grey label that sits above a heading. Sentence case, never caps. */
export function Eyebrow({ children }: { children: ReactNode }) {
  return <p className="text-body-sm text-ink-muted">{children}</p>;
}

/**
 * The inline error banner used when a Server Action rejects a submission.
 * Carbon marks these with a red left rule rather than a filled box.
 */
export function FormError({ children }: { children: ReactNode }) {
  return (
    <div
      role="alert"
      className="border-l-2 border-error bg-error-bg px-4 py-3 text-body-sm text-ink"
    >
      {children}
    </div>
  );
}
