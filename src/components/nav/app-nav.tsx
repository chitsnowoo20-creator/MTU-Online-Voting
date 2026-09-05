"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import { useFormStatus } from "react-dom";

import { NavIcon } from "./icons";
import { logout } from "@/app/(public)/auth-actions";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  activeHref,
  activeSection,
  navSections,
  type NavItem,
  type NavViewer,
} from "@/lib/nav/sections";

/**
 * The signed-in chrome, from design reference v2 (N1–N3).
 *
 * One header on every width. Below it, a collapsible 256px/56px side rail on
 * desktop and a floating bottom bar on mobile — the bar carries four targets,
 * and anything past four lives behind the header menu. The role never changes
 * the chrome, only the item set.
 */

const RAIL_COOKIE = "nav_rail";

/**
 * Rail row: a 40px pill.
 *
 * The active state is the filled pill and nothing else. It used to carry a
 * `border-l-2` *and* an inset box-shadow, which drew two left rules on a
 * rounded pill and read as a rendering artefact rather than an indicator.
 */
function railRowClass(active: boolean, expanded: boolean): string {
  return [
    // h-11 (44px) below lg, where this styles the touch overflow menu; the
    // desktop rail is mouse-driven and keeps the tighter 40px row.
    "group relative flex h-11 items-center rounded-lg no-underline lg:h-10",
    "transition-colors duration-150 hover:no-underline",
    expanded ? "mx-2 gap-3 px-3" : "mx-2 justify-center gap-0 px-0",
    active
      ? "bg-primary/10 text-brand-ink"
      : "text-ink-muted hover:bg-surface-2 hover:text-ink",
  ].join(" ");
}

/**
 * A row's label.
 *
 * Kept mounted at every width and collapsed to `max-w-0` instead of being
 * conditionally rendered: unmounted text popped in at full opacity the moment
 * the toggle was clicked, while the rail itself took 200ms to widen. Animating
 * width and opacity on the same 200ms curve lets the text arrive with the space
 * that holds it. `overflow-hidden` is what keeps a zero-width label from
 * spilling over the icon.
 */
function RailText({
  expanded,
  className = "",
  children,
}: {
  expanded: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      aria-hidden={!expanded}
      className={`truncate text-body-sm transition-all duration-200 ease-out ${
        expanded ? "max-w-[12rem] opacity-100 delay-75" : "max-w-0 opacity-0"
      } ${className}`}
    >
      {children}
    </span>
  );
}

/**
 * Small uppercase divider label. Collapses its own height rather than
 * unmounting — mounting it shifted every row beneath it down by ~36px in one
 * frame, which is what made the footer look like it snapped rather than opened.
 */
function RailLabel({
  expanded,
  children,
}: {
  expanded: boolean;
  children: ReactNode;
}) {
  return (
    <li
      aria-hidden={!expanded}
      className={`flex items-end overflow-hidden whitespace-nowrap px-5 text-caption font-semibold uppercase tracking-[0.12em] text-ink-subtle transition-all duration-200 ease-out ${
        expanded ? "h-9 pb-1 opacity-100 delay-75" : "h-0 pb-0 opacity-0"
      }`}
    >
      {children}
    </li>
  );
}

function RailLink({
  item,
  active,
  expanded,
}: {
  item: NavItem;
  active: boolean;
  expanded: boolean;
}) {
  return (
    <Link
      href={item.href}
      title={expanded ? undefined : item.label}
      aria-current={active ? "page" : undefined}
      className={railRowClass(active, expanded)}
    >
      <NavIcon name={item.icon} />
      <RailText expanded={expanded} className={active ? "font-semibold" : ""}>
        {item.label}
      </RailText>
    </Link>
  );
}

/** Submit button for the confirm dialog, so it can show its own pending state. */
function ConfirmSignOut() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="secondary" disabled={pending}>
      {pending ? "Signing out…" : "Sign out"}
    </Button>
  );
}

/**
 * Confirmation for signing out.
 *
 * Sign out lives in permanent chrome, one click from every screen, and losing a
 * session mid-ballot is annoying to recover from — so the row asks first rather
 * than acting on a stray click.
 */
function SignOutDialog({
  onCancel,
  onDone,
}: {
  onCancel: () => void;
  onDone?: () => void;
}) {
  return (
    <ConfirmDialog
      title="Sign out?"
      onCancel={onCancel}
      width="380px"
      footer={
        <>
          <Button type="button" variant="ghost" onClick={onCancel} autoFocus>
            Cancel
          </Button>
          <form action={logout} onSubmit={onDone}>
            <ConfirmSignOut />
          </form>
        </>
      }
    >
      <p className="text-body-sm text-ink-muted">
        You&rsquo;ll need to sign in again to vote or check your status.
      </p>
    </ConfirmDialog>
  );
}

function SignOutRow({
  expanded,
  onDone,
}: {
  expanded: boolean;
  onDone?: () => void;
}) {
  const [confirming, setConfirming] = useState(false);

  return (
    <>
      {/*
        * `flex flex-col` so the button stretches to the row width the same way
        * the `<li>` links do — `width: auto` on a <button> is fit-content in
        * some engines, which knocks the icon out of line when collapsed. The
        * <form> used to provide this; the form now lives in the dialog.
        *
        * `type="button"`: this opens the dialog, it no longer submits.
        */}
      <div className="flex flex-col">
        <button
          type="button"
          title={expanded ? undefined : "Sign out"}
          onClick={() => setConfirming(true)}
          className={`cursor-pointer ${railRowClass(false, expanded)}`}
        >
          <NavIcon name="signOut" />
          <RailText expanded={expanded}>Sign out</RailText>
        </button>
      </div>

      {confirming ? (
        <SignOutDialog onCancel={() => setConfirming(false)} onDone={onDone} />
      ) : null}
    </>
  );
}

export function AppNav({
  viewer,
  identity,
  railExpanded,
  children,
}: {
  viewer: NavViewer;
  identity: { email: string | null; displayName: string; initials: string };
  railExpanded: boolean;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const [expanded, setExpanded] = useState(railExpanded);

  /*
   * The overlay is a navigation aid, not a destination: it is open only for the
   * path it was opened on, so any move closes it without an effect watching the
   * router.
   */
  const [menuPath, setMenuPath] = useState<string | null>(null);
  const menuOpen = menuPath === pathname;

  const sections = navSections(viewer, pathname);
  const section = activeSection(sections, pathname);
  const current = activeHref(section, pathname);
  const others = sections.filter((other) => other.key !== section.key);

  /*
   * Four targets is the bar's ceiling. When the item you are on falls outside
   * the first four it takes the last slot, so the bar always shows where you
   * are; the full list stays in the header menu.
   */
  const barItems = section.items.slice(0, 4);
  if (current && !barItems.some((item) => item.href === current)) {
    const active = section.items.find((item) => item.href === current);
    if (active) barItems[Math.min(3, barItems.length)] = active;
  }

  function toggleRail() {
    const next = !expanded;
    setExpanded(next);
    // A cookie, not localStorage, so the server renders the right width and the
    // rail does not snap open on first paint.
    document.cookie = `${RAIL_COOKIE}=${next ? "expanded" : "collapsed"};path=/;max-age=31536000;samesite=lax`;
  }

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center justify-between border-b border-hairline bg-canvas/95 shadow-[0_1px_0_rgb(20_32_51/0.02)] backdrop-blur supports-[backdrop-filter]:bg-canvas/80">
        <div className="flex h-full min-w-0 items-center">
          <button
            type="button"
            onClick={toggleRail}
            aria-expanded={expanded}
            aria-label={expanded ? "Collapse navigation" : "Expand navigation"}
            title={expanded ? "Collapse navigation" : "Expand navigation"}
            className="hidden h-14 w-14 cursor-pointer items-center justify-center border-r border-hairline text-ink-muted transition-colors hover:bg-surface-1 hover:text-ink lg:flex"
          >
            <NavIcon name="menu" />
          </button>

          <button
            type="button"
            onClick={() => setMenuPath(menuOpen ? null : pathname)}
            aria-expanded={menuOpen}
            aria-controls="app-nav-menu"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            className="flex h-14 w-14 cursor-pointer items-center justify-center border-r border-hairline text-ink hover:bg-surface-1 lg:hidden"
          >
            <NavIcon name={menuOpen ? "close" : "menu"} />
          </button>

          {/*
            * The brand shortens below `sm` so the section still fits. Which
            * access you are currently in — Voter, Reviewer, Officer, Admin —
            * is the more useful of the two on a phone: it says which role's
            * tools the bar below is showing. It used to be `hidden sm:inline`,
            * so a phone gave no indication at all.
            */}
          <Link
            href="/"
            className="flex h-full shrink-0 items-center px-4 text-body-sm font-semibold tracking-tight text-ink no-underline hover:no-underline"
          >
            <span className="sm:hidden">Elections</span>
            <span className="hidden sm:inline">Campus Elections</span>
          </Link>
          <span className="truncate text-body-sm text-ink-muted">
            {section.name}
          </span>
        </div>

        <div className="flex items-center pr-4">
          {/* The avatar is the whole identity indicator now. Its initials are
              decorative, so the name it stands for is kept for screen readers
              rather than dropped along with the visible label. */}
          <span className="sr-only">Signed in as {identity.displayName}</span>
          <span
            aria-hidden="true"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-caption font-semibold text-brand-ink"
          >
            {identity.initials}
          </span>
        </div>
      </header>

      {/* Mobile overflow menu: everything the bar cannot hold. It overlays the
          screen rather than pushing it down — the page underneath keeps its
          scroll position. */}
      {menuOpen ? (
        <button
          type="button"
          aria-label="Close menu"
          onClick={() => setMenuPath(null)}
          className="fixed inset-x-0 top-14 bottom-0 z-10 cursor-default bg-ink/20 lg:hidden"
        />
      ) : null}
      {menuOpen ? (
        <div
          id="app-nav-menu"
          className="fixed inset-x-0 top-14 z-20 max-h-[calc(100vh-3.5rem)] overflow-y-auto border-b border-hairline bg-canvas shadow-card lg:hidden"
        >
          <nav aria-label={`${section.name} navigation`}>
            <ul className="flex flex-col">
              {section.items.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={item.href === current ? "page" : undefined}
                    className={railRowClass(item.href === current, true)}
                  >
                    <NavIcon name={item.icon} />
                    <span className="text-body-sm">{item.label}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {others.length > 0 ? (
            <div className="border-t border-hairline">
              <p className="px-4 pt-3 text-caption text-ink-subtle">
                Your other access
              </p>
              <ul className="flex flex-col">
                {others.map((other) => (
                  <li key={other.key}>
                    <Link
                      href={other.items[0].href}
                      className={railRowClass(false, true)}
                    >
                      <NavIcon name={other.icon} />
                      <span className="text-body-sm">{other.name}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="border-t border-hairline">
            <SignOutRow expanded onDone={() => setMenuPath(null)} />
          </div>
        </div>
      ) : null}

      <div className="flex flex-1">
        <nav
          aria-label={`${section.name} navigation`}
          className={`sticky top-14 hidden h-[calc(100vh-3.5rem)] shrink-0 flex-col border-r border-hairline bg-canvas transition-[width] duration-200 lg:flex ${
            // Collapsed matches the header toggle's 56px, so the border under
            // that button continues straight down the rail's edge.
            expanded ? "w-64" : "w-14"
          }`}
        >
          <ul className="flex flex-col gap-0.5 py-3">
            {section.items.map((item) => (
              <li key={item.href}>
                <RailLink
                  item={item}
                  active={item.href === current}
                  expanded={expanded}
                />
              </li>
            ))}
          </ul>

          <div className="flex-1" />

          {/*
            * One footer block, one rule. This used to be three stacked
            * `border-t` groups — other access, sign out, and a Collapse button
            * that duplicated the header toggle. The toggle lives in the header
            * only, where its position does not change with the rail's state.
            */}
          <div className="flex flex-col gap-0.5 border-t border-hairline py-3">
            {others.length > 0 ? (
              <ul className="flex flex-col gap-0.5">
                <RailLabel expanded={expanded}>Other access</RailLabel>
                {others.map((other) => (
                  <li key={other.key}>
                    <Link
                      href={other.items[0].href}
                      title={expanded ? undefined : other.name}
                      className={railRowClass(false, expanded)}
                    >
                      <NavIcon name={other.icon} />
                      <RailText expanded={expanded}>{other.name}</RailText>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : null}

            {/*
              * With other-access rows present the footer holds two different
              * kinds of thing — moving around inside the app, and leaving it —
              * so a rule separates them. Alone, sign out needs no divider above
              * it; the footer's own border already does that job.
              */}
            <div
              className={
                others.length > 0
                  ? "mt-1.5 border-t border-hairline pt-1.5"
                  : undefined
              }
            >
              <SignOutRow expanded={expanded} />
            </div>
          </div>
        </nav>

        {/*
         * The bar floats over the content rather than reserving space, so the
         * padding below is what keeps the last row of a page reachable. Grey,
         * because every in-app screen sits on the grey canvas.
         */}
        <div className="flex min-w-0 flex-1 flex-col bg-surface-1 pb-24 lg:pb-0">
          {children}
        </div>
      </div>

      {/*
        * Floating pill, sized to its contents rather than the viewport.
        *
        * It used to be `inset-x-4` with `flex-1` items, so a two-item section
        * (Reviewer) got two half-screen targets. Now the bar is centred and
        * only as wide as the items it holds, and the active item is a rounded
        * pill inset from the bar's edge instead of a full-height block with a
        * top stripe. `max-w` keeps four items inside a 320px screen.
        *
        * Translucent with a blur behind it, so content shows through as it
        * scrolls under. Written as Tailwind utilities rather than the
        * `.glass-panel-dark` class in globals.css — that class's declarations
        * were not reaching the element (no matching rule at runtime), so its
        * backdrop-filter silently did nothing.
        */}
      <nav
        aria-label={`${section.name} navigation`}
        className="fixed bottom-4 left-1/2 z-30 flex max-w-[calc(100vw-2rem)] -translate-x-1/2 items-center gap-1 rounded-[22px] border border-white/10 bg-inverse-canvas/85 p-1.5 shadow-[0_14px_35px_rgb(17_32_51/0.32)] backdrop-blur-xl backdrop-saturate-150 lg:hidden"
      >
        {barItems.map((item) => {
          const active = item.href === current;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`flex h-[52px] min-w-16 flex-col items-center justify-center gap-1 rounded-2xl px-2 no-underline transition-colors hover:no-underline ${
                active
                  ? "bg-inverse-surface-1 text-inverse-ink"
                  : "text-inverse-ink-muted"
              }`}
            >
              <NavIcon name={item.icon} />
              <span className="truncate text-caption">{item.short}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
