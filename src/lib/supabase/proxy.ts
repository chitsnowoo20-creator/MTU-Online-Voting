import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { SUPABASE_ANON_KEY, SUPABASE_URL } from "./env";

/**
 * Paths that require a signed-in user. Route groups don't affect URLs, so these
 * are the real paths behind `app/(voter)/…` and `app/(staff)/…`.
 */
const PROTECTED_PREFIXES = [
  "/verify",
  "/vote",
  "/account",
  "/review",
  "/elections",
  "/admin",
];

/**
 * Refreshes the Supabase session cookie and bounces signed-out users away from
 * protected paths.
 *
 * This is an *optimistic* check only. Next's own guidance is that proxy should
 * not be a full authorization solution, and ours isn't: role checks, voter
 * eligibility and election state are all enforced in RLS policies and in the
 * SECURITY DEFINER functions, where they cannot be skipped by requesting a
 * route directly (AGENTS.md invariant 10).
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  // Do not remove: this call is what refreshes an expiring token, and it must
  // happen between creating the client and returning the response.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isProtected = PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );

  if (!user && isProtected) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    redirectUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(redirectUrl);
  }

  // Return this exact response object — a new one would drop the refreshed
  // session cookies and sign the user out at random.
  return response;
}
