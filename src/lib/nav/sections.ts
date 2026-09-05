import type { IconName } from "@/components/nav/icons";
import type { Database } from "@/lib/db/database.types";

type AppRole = Database["public"]["Enums"]["app_role"];
type VoterStatus = Database["public"]["Enums"]["voter_status"];

/**
 * Everything the navigation needs to know about the signed-in user. All of it
 * is the viewer's own record, so it is safe to hand to a Client Component.
 *
 * Nothing here is a permission check. The rail hides what a role cannot reach
 * so the chrome stays honest; the actual gates are `requireRole`, the RLS
 * policies and the RPCs, which re-check on every request (AGENTS.md
 * invariant 10).
 */
export type NavViewer = {
  roles: AppRole[];
  voterStatus: VoterStatus;
  emailConfirmed: boolean;
};

export type NavItem = {
  href: string;
  /** Rail label. */
  label: string;
  /** Mobile bottom-bar label — the bar is 4 targets wide, so it must be short. */
  short: string;
  icon: IconName;
};

export type SectionKey = "voter" | "reviewer" | "officer" | "admin";

export type NavSection = {
  key: SectionKey;
  name: string;
  icon: IconName;
  items: NavItem[];
};

/** The voter rail. Verification and the ballot are mutually exclusive: the
 * pages themselves redirect (approved → `/account`, unapproved → `/account`),
 * and a rail entry that bounces you is worse than no entry. */
function voterSection(viewer: NavViewer): NavSection {
  const items: NavItem[] = [
    { href: "/", label: "Home", short: "Home", icon: "home" },
    { href: "/account", label: "My status", short: "Status", icon: "status" },
  ];

  if (viewer.voterStatus === "APPROVED") {
    items.push({ href: "/vote", label: "Ballot", short: "Ballot", icon: "ballot" });
  } else if (viewer.emailConfirmed) {
    items.push({
      href: "/verify",
      label: "Verify identity",
      short: "Verify",
      icon: "shield",
    });
  }

  items.push({
    href: "/results",
    label: "Results",
    short: "Results",
    icon: "results",
  });

  return { key: "voter", name: "Voter", icon: "ballot", items };
}

const REVIEWER_SECTION: NavSection = {
  key: "reviewer",
  name: "Reviewer",
  icon: "idCard",
  items: [
    {
      href: "/review",
      label: "Verification queue",
      short: "Queue",
      icon: "idCard",
    },
    { href: "/account", label: "My status", short: "Status", icon: "status" },
  ],
};

const ADMIN_SECTION: NavSection = {
  key: "admin",
  name: "Admin",
  icon: "state",
  items: [
    { href: "/admin", label: "Overview", short: "Admin", icon: "results" },
    { href: "/admin/roles", label: "Roles", short: "Roles", icon: "people" },
    {
      href: "/admin/departments",
      label: "Departments",
      short: "Depts",
      icon: "building",
    },
    { href: "/admin/audit", label: "Audit log", short: "Audit", icon: "log" },
  ],
};

/** `/elections/<id>/...` → the id, or null. `new` is a sibling route, not an
 * election, so it never opens the per-election group. */
function electionIdIn(pathname: string): string | null {
  const match = /^\/elections\/([^/]+)/.exec(pathname);
  if (!match || match[1] === "new") return null;
  return match[1];
}

/**
 * The officer rail. Categories, candidates and state control all live under one
 * election, so they appear only once an election is open — pointing them at
 * `/elections` when none is selected would be a link that lies about where it
 * goes.
 */
function officerSection(pathname: string): NavSection {
  const items: NavItem[] = [
    {
      href: "/elections",
      label: "Elections",
      short: "Elections",
      icon: "calendar",
    },
  ];

  const id = electionIdIn(pathname);
  if (id) {
    items.push(
      {
        href: `/elections/${id}`,
        label: "State control",
        short: "State",
        icon: "state",
      },
      {
        href: `/elections/${id}/categories`,
        label: "Categories",
        short: "Awards",
        icon: "tags",
      },
      {
        href: `/elections/${id}/candidates`,
        label: "Candidates",
        short: "People",
        icon: "people",
      },
    );
  }

  items.push({
    href: "/results",
    label: "Results",
    short: "Results",
    icon: "results",
  });

  return { key: "officer", name: "Officer", icon: "calendar", items };
}

/** Every section this viewer can reach, in rail order. */
export function navSections(
  viewer: NavViewer,
  pathname: string,
): NavSection[] {
  const sections = [voterSection(viewer)];
  if (viewer.roles.includes("REVIEWER")) sections.push(REVIEWER_SECTION);
  if (viewer.roles.includes("ELECTION_OFFICER")) {
    sections.push(officerSection(pathname));
  }
  if (viewer.roles.includes("ADMIN")) sections.push(ADMIN_SECTION);
  return sections;
}

/**
 * Which section the current URL belongs to. The path decides, not the role —
 * an admin who also reviews sees the reviewer rail while on `/review`, and
 * their admin items one click away in the section switcher.
 */
export function activeSection(
  sections: NavSection[],
  pathname: string,
): NavSection {
  const byPath: SectionKey =
    pathname.startsWith("/review")
      ? "reviewer"
      : pathname.startsWith("/elections")
        ? "officer"
        : pathname.startsWith("/admin")
          ? "admin"
          : "voter";

  return sections.find((section) => section.key === byPath) ?? sections[0];
}

/** The item the current URL sits under — longest prefix wins, `/` only exact. */
export function activeHref(
  section: NavSection,
  pathname: string,
): string | null {
  let best: string | null = null;

  for (const item of section.items) {
    const hit =
      item.href === "/"
        ? pathname === "/"
        : pathname === item.href || pathname.startsWith(`${item.href}/`);

    if (hit && (best === null || item.href.length > best.length)) {
      best = item.href;
    }
  }

  return best;
}
