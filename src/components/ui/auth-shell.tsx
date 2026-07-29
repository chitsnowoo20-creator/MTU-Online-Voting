import Link from "next/link";
import type { ReactNode } from "react";

/**
 * The centred card the register / confirm / sign-in screens sit in
 * (design reference screens 02 and 03): grey canvas, one white hairlined tile,
 * the product name as a quiet eyebrow above a weight-300 heading.
 */
export function AuthShell({
  title,
  intro,
  children,
  footer,
}: {
  title: string;
  intro?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <main className="flex flex-1 items-center justify-center bg-surface-1 px-4 py-16">
      <div className="w-full max-w-[480px] border border-hairline bg-canvas p-8">
        <Link
          href="/"
          className="text-body-sm text-ink-muted no-underline hover:text-ink hover:no-underline"
        >
          Campus Elections
        </Link>
        <h1 className="mt-3 mb-2 text-display-md">{title}</h1>
        {intro ? <div className="text-body text-ink-muted">{intro}</div> : null}
        <div className="mt-8">{children}</div>
        {footer ? (
          <div className="mt-6 text-body-sm text-ink-muted">{footer}</div>
        ) : null}
      </div>
    </main>
  );
}
