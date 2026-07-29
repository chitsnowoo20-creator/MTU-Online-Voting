"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";

import { NavIcon } from "./icons";
import { logout } from "@/app/(public)/auth-actions";
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
 * One header on every width. Below it, a collapsible 256px/48px side rail on
 * desktop and a floating bottom bar on mobile — the bar carries four targets,
 * and anything past four lives behind the header menu. The role never changes
 * the chrome, only the item set.
 */

const RAIL_COOKIE = "nav_rail";

/** Rail row: 48px tall, 2px left rule that only the active row colours in. */
function railRowClass(active: boolean, expanded: boolean): string {
  return [
    "flex h-12 items-center border-l-2 no-underline transition-colors",
    "hover:bg-surface-2 hover:no-underline",
    expanded ? "gap-4 pl-[14px] pr-4" : "justify-center px-0",
    active
      ? "border-primary bg-surface-2 text-ink"
      : "border-transparent text-ink-muted hover:text-ink",
  ].join(" ");
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
      {expanded ? (
        <span
          className={`truncate text-body-sm ${active ? "font-semibold" : ""}`}
        >
          {item.label}
        </span>
      ) : null}
    </Link>
  );
}

function SignOutRow({
  expanded,
  onDone,
}: {
  expanded: boolean;
  onDone?: () => void;
}) {
  return (
    <form action={logout} onSubmit={onDone}>
      <button
        type="submit"
        title={expanded ? undefined : "Sign out"}
        className={`w-full cursor-pointer ${railRowClass(false, expanded)}`}
      >
        <NavIcon name="signOut" />
        {expanded ? <span className="text-body-sm">Sign out</span> : null}
      </button>
    </form>
  );
}

export function AppNav({
  viewer,
  identity,
  railExpanded,
  children,
}: {
  viewer: NavViewer;
  identity: { email: string | null; initials: string };
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
      <header className="sticky top-0 z-30 flex h-12 shrink-0 items-center justify-between border-b border-hairline bg-canvas">
        <div className="flex h-full min-w-0 items-center">
          <button
            type="button"
            onClick={toggleRail}
            aria-expanded={expanded}
            aria-label={expanded ? "Collapse navigation" : "Expand navigation"}
            className="hidden h-12 w-12 cursor-pointer items-center justify-center border-r border-hairline text-ink hover:bg-surface-1 lg:flex"
          >
            <NavIcon name="menu" />
          </button>

          <button
            type="button"
            onClick={() => setMenuPath(menuOpen ? null : pathname)}
            aria-expanded={menuOpen}
            aria-controls="app-nav-menu"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            className="flex h-12 w-12 cursor-pointer items-center justify-center border-r border-hairline text-ink hover:bg-surface-1 lg:hidden"
          >
            <NavIcon name={menuOpen ? "close" : "menu"} />
          </button>

          <Link
            href="/"
            className="px-4 text-body-sm font-semibold text-ink no-underline hover:no-underline"
          >
            Campus Elections
          </Link>
          <span className="hidden truncate text-body-sm text-ink-muted sm:inline">
            {section.name}
          </span>
        </div>

        <div className="flex items-center gap-4 pr-4">
          <span className="hidden truncate text-body-sm text-ink-muted sm:inline">
            {identity.email}
          </span>
          <span
            aria-hidden="true"
            className="flex h-8 w-8 items-center justify-center bg-surface-1 text-caption text-ink"
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
          className="fixed inset-x-0 top-12 bottom-0 z-10 cursor-default bg-ink/20 lg:hidden"
        />
      ) : null}
      {menuOpen ? (
        <div
          id="app-nav-menu"
          className="fixed inset-x-0 top-12 z-20 max-h-[calc(100vh-3rem)] overflow-y-auto border-b border-hairline bg-canvas lg:hidden"
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
          className={`sticky top-12 hidden h-[calc(100vh-3rem)] shrink-0 flex-col border-r border-hairline bg-surface-1 transition-[width] duration-100 lg:flex ${
            expanded ? "w-64" : "w-12"
          }`}
        >
          <ul className="flex flex-col">
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

          {others.length > 0 ? (
            <ul className="flex flex-col border-t border-hairline">
              {expanded ? (
                <li className="px-4 pt-3 pb-1 text-caption text-ink-subtle">
                  Your other access
                </li>
              ) : null}
              {others.map((other) => (
                <li key={other.key}>
                  <Link
                    href={other.items[0].href}
                    title={expanded ? undefined : other.name}
                    className={railRowClass(false, expanded)}
                  >
                    <NavIcon name={other.icon} />
                    {expanded ? (
                      <span className="truncate text-body-sm">
                        {other.name}
                      </span>
                    ) : null}
                  </Link>
                </li>
              ))}
            </ul>
          ) : null}

          <div className="border-t border-hairline">
            <SignOutRow expanded={expanded} />
          </div>

          <button
            type="button"
            onClick={toggleRail}
            aria-expanded={expanded}
            title={expanded ? undefined : "Expand"}
            className={`cursor-pointer border-t border-hairline ${railRowClass(false, expanded)}`}
          >
            <NavIcon name={expanded ? "chevronLeft" : "chevronRight"} />
            {expanded ? <span className="text-body-sm">Collapse</span> : null}
          </button>
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

      <nav
        aria-label={`${section.name} navigation`}
        className="fixed inset-x-4 bottom-4 z-30 flex bg-inverse-canvas lg:hidden"
      >
        {barItems.map((item) => {
          const active = item.href === current;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`flex h-16 flex-1 flex-col items-center justify-center gap-1 border-t-2 no-underline hover:no-underline ${
                active
                  ? "border-primary bg-inverse-surface-1 text-inverse-ink"
                  : "border-transparent text-inverse-ink-muted"
              }`}
            >
              <NavIcon name={item.icon} />
              <span className="text-caption">{item.short}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
