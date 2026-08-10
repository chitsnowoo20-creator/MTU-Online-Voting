import type { ReactNode } from "react";

/**
 * Horizontal scroll wrapper for data tables on narrow viewports.
 * Keeps table markup intact while preventing layout breakage on mobile.
 */
export function DataTable({
  children,
  minWidth = 560,
}: {
  children: ReactNode;
  minWidth?: number;
}) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-hairline bg-canvas shadow-soft">
      <div style={{ minWidth }}>{children}</div>
    </div>
  );
}
