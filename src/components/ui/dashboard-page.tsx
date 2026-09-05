import Link from "next/link";
import type { ReactNode } from "react";

/**
 * The signed-in dashboard shell: a page-level header over a main column and an
 * optional right rail.
 *
 * The header deliberately sits *outside* any card. Every screen here used to be
 * one narrow centred panel that carried its own title, status and actions as a
 * lid — which reads as a form, not a dashboard, once the nav rail is beside it.
 * Hoisting the header to the page and letting the body span the shell is the
 * whole change; the blocks inside are the same ones, moved.
 *
 * `rail` is optional and the grid collapses to a single column without it. A
 * screen with nothing secondary to say gets one wide column rather than a
 * padded-out empty box — do not add filler to keep the two columns.
 *
 * Sibling shells, deliberately kept separate:
 *   AuthShell   signed-out auth screens, one 480px card
 *   StaffPage   staff screens, inverse/mesh header treatment
 */
export function DashboardPage({
  eyebrow,
  title,
  subtitle,
  status,
  actions,
  back,
  rail,
  width = "1120px",
  children,
}: {
  eyebrow?: string;
  title: ReactNode;
  subtitle?: ReactNode;
  /** Status chip, shown at the top-right of the header. */
  status?: ReactNode;
  /** Primary calls to action, shown under the status. */
  actions?: ReactNode;
  back?: { href: string; label: string };
  /** Secondary column. Omit it and the body is a single wide column. */
  rail?: ReactNode;
  /**
   * Escape hatch, deliberately unused: every dashboard screen shares the
   * default so they behave identically when the nav rail collapses. A narrower
   * cap makes `mx-auto` recentre that page while the wider ones stay flush,
   * so one screen's edges drift while the rest only move on the left.
   */
  width?: string;
  children: ReactNode;
}) {
  return (
    <main className="surface-page flex-1 px-4 py-8 sm:py-10 lg:py-12">
      <div className="mx-auto w-full" style={{ maxWidth: width }}>
        {back ? (
          <p className="mb-5 text-body-sm font-medium">
            <Link
              href={back.href}
              className="inline-flex items-center gap-1 text-ink-muted hover:text-brand-ink"
            >
              ← {back.label}
            </Link>
          </p>
        ) : null}

        <header className="mb-6 flex flex-wrap items-end justify-between gap-x-6 gap-y-4 border-b border-hairline pb-6 sm:mb-8">
          <div className="min-w-0">
            {eyebrow ? <p className="eyebrow-label">{eyebrow}</p> : null}
            <h1 className="mt-1 text-headline text-ink">{title}</h1>
            {subtitle ? (
              <div className="mt-1.5 max-w-[640px] text-body-sm text-ink-muted">
                {subtitle}
              </div>
            ) : null}
          </div>

          {status || actions ? (
            <div className="flex shrink-0 flex-col items-start gap-3 sm:items-end">
              {status}
              {actions ? (
                <div className="flex flex-wrap gap-3">{actions}</div>
              ) : null}
            </div>
          ) : null}
        </header>

        {rail ? (
          <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div className="flex min-w-0 flex-col gap-6">{children}</div>
            <aside className="flex flex-col gap-4 lg:sticky lg:top-6">
              {rail}
            </aside>
          </div>
        ) : (
          <div className="flex flex-col gap-6">{children}</div>
        )}
      </div>
    </main>
  );
}

/**
 * A titled block for the rail. Same panel surface as the main column, just
 * scaled for a 320px column.
 */
export function RailCard({
  title,
  children,
}: {
  title?: string;
  children: ReactNode;
}) {
  return (
    <section className="surface-panel overflow-hidden">
      {title ? (
        <h2 className="border-b border-hairline px-5 py-3.5 text-caption font-bold uppercase tracking-[0.14em] text-brand-ink">
          {title}
        </h2>
      ) : null}
      <div className="px-5 py-4">{children}</div>
    </section>
  );
}
