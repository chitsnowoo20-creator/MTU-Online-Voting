import { type EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";

import { createClient } from "@/lib/supabase/server";

/**
 * Email confirmation landing point.
 *
 * Handles both shapes Supabase can send:
 *   - `token_hash` + `type`  — what the recommended SSR email template sends
 *   - `code`                 — the PKCE exchange
 *
 * Confirming an email sets `email_confirmed_at` in Supabase Auth and nothing
 * else. It does not touch `voter_status`, which only a Reviewer can move
 * (AGENTS.md invariant 9) — so this redirects to the status page, not the
 * ballot.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const code = searchParams.get("code");
  const next = searchParams.get("next");
  const destination = next?.startsWith("/") ? next : "/account";

  const supabase = await createClient();

  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash: tokenHash,
    });
    if (!error) return NextResponse.redirect(new URL(destination, origin));
    return NextResponse.redirect(
      new URL(`/confirm?error=${encodeURIComponent(error.message)}`, origin),
    );
  }

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(destination, origin));
    return NextResponse.redirect(
      new URL(`/confirm?error=${encodeURIComponent(error.message)}`, origin),
    );
  }

  return NextResponse.redirect(
    new URL("/confirm?error=This+confirmation+link+is+incomplete.", origin),
  );
}
