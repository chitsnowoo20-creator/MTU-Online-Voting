import { cookies } from "next/headers";
import type { ReactNode } from "react";

import { AppNav } from "./app-nav";
import { getCurrentUser } from "@/lib/auth/guards";

/** "Ada Elizabeth King" → "AE"; falls back to the email when we have no name. */
function initialsOf(fullName: string, email: string | null): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length > 0) {
    return parts
      .slice(0, 2)
      .map((part) => part[0]!.toUpperCase())
      .join("");
  }
  return (email?.[0] ?? "?").toUpperCase();
}

/**
 * Wraps a screen in the signed-in chrome (header + rail + mobile bar).
 *
 * A signed-out visitor gets the page bare: `/results` is public, and the
 * authenticated routes redirect through their own guards rather than relying
 * on this layout to do it.
 */
export async function AppFrame({ children }: { children: ReactNode }) {
  const [user, cookieStore] = await Promise.all([getCurrentUser(), cookies()]);

  if (!user) return <>{children}</>;

  return (
    <AppNav
      viewer={{
        roles: user.roles,
        voterStatus: user.voterStatus,
        emailConfirmed: Boolean(user.emailConfirmedAt),
      }}
      identity={{
        email: user.email,
        initials: initialsOf(user.fullName, user.email),
      }}
      railExpanded={cookieStore.get("nav_rail")?.value !== "collapsed"}
    >
      {children}
    </AppNav>
  );
}
