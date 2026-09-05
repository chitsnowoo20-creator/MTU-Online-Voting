import { cookies } from "next/headers";
import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

import { AppNav } from "./app-nav";
import { ButtonLink } from "@/components/ui/button";
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
 * The public header, for signed-out visitors on a public route.
 *
 * `/results` is reachable without an account, and it used to render with no
 * chrome at all — no logo, no sign-in, and no way back to the landing page.
 * This mirrors the landing header so the two read as one site.
 */
function PublicHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-hairline bg-canvas/80 backdrop-blur-lg">
      <div className="mx-auto flex h-16 max-w-[1120px] items-center justify-between px-4 sm:px-6">
        <Link
          href="/"
          className="flex min-w-0 items-center gap-3 text-ink no-underline hover:no-underline"
        >
          <Image
            src="/MTU_Logo.png"
            alt=""
            width={40}
            height={40}
            className="h-10 w-10 shrink-0 object-contain"
          />
          <span className="truncate text-body-sm font-bold tracking-tight">
            MTU Elections
          </span>
        </Link>
        <ButtonLink
          href="/login"
          variant="tertiary"
          className="!min-h-10 !px-4 !text-caption"
        >
          Sign in
        </ButtonLink>
      </div>
    </header>
  );
}

/**
 * Wraps a screen in the signed-in chrome (header + rail + mobile bar), or in
 * the public header when there is no session.
 *
 * The authenticated routes redirect through their own guards, so in practice
 * only `/results` reaches the signed-out branch.
 */
export async function AppFrame({ children }: { children: ReactNode }) {
  const [user, cookieStore] = await Promise.all([getCurrentUser(), cookies()]);

  if (!user) {
    return (
      <>
        <PublicHeader />
        {children}
      </>
    );
  }

  return (
    <AppNav
      viewer={{
        roles: user.roles,
        voterStatus: user.voterStatus,
        emailConfirmed: Boolean(user.emailConfirmedAt),
      }}
      identity={{
        email: user.email,
        displayName: user.fullName || user.email || "Account",
        initials: initialsOf(user.fullName, user.email),
      }}
      railExpanded={cookieStore.get("nav_rail")?.value !== "collapsed"}
    >
      {children}
    </AppNav>
  );
}
