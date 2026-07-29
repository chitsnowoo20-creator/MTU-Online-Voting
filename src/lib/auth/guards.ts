import { redirect } from "next/navigation";

import type { Database } from "@/lib/db/database.types";
import { createClient } from "@/lib/supabase/server";

type AppRole = Database["public"]["Enums"]["app_role"];
type VoterStatus = Database["public"]["Enums"]["voter_status"];
type MemberType = Database["public"]["Enums"]["member_type"];

export type CurrentUser = {
  id: string;
  email: string | null;
  emailConfirmedAt: string | null;
  fullName: string;
  voterStatus: VoterStatus;
  memberType: MemberType | null;
  roles: AppRole[];
};

/**
 * The signed-in user with their profile and roles, or null.
 *
 * `email_confirmed` (Supabase) and `voter_status` (ours) are returned as the
 * separate things they are — neither is allowed to imply the other
 * (AGENTS.md invariant 9). Callers that care about both must check both.
 *
 * Everything here reads under RLS: the profile row and the role rows are
 * visible because the policies grant a user their own, not because this code
 * asked nicely.
 */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const [{ data: profile }, { data: roleRows }] = await Promise.all([
    supabase
      .from("profiles")
      .select("full_name, voter_status, member_type")
      .eq("id", user.id)
      .maybeSingle(),
    supabase.from("user_roles").select("role").eq("profile_id", user.id),
  ]);

  return {
    id: user.id,
    email: user.email ?? null,
    emailConfirmedAt: user.email_confirmed_at ?? null,
    fullName: profile?.full_name ?? "",
    voterStatus: profile?.voter_status ?? "UNVERIFIED",
    memberType: profile?.member_type ?? null,
    roles: (roleRows ?? []).map((r) => r.role),
  };
}

/** Redirects to sign-in when there is no session. */
export async function requireUser(returnTo?: string): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) {
    const next = returnTo ? `?next=${encodeURIComponent(returnTo)}` : "";
    redirect(`/login${next}`);
  }
  return user;
}

/**
 * Redirects unless the user holds one of `roles`.
 *
 * This gates the *screen*. It is not the security boundary — the RLS policies
 * and the SECURITY DEFINER functions are, and they re-check the same role on
 * every read and write. Removing this guard would leak a layout, not data.
 */
export async function requireRole(
  roles: AppRole[],
  returnTo?: string,
): Promise<CurrentUser> {
  const user = await requireUser(returnTo);
  if (!roles.some((role) => user.roles.includes(role))) {
    redirect("/account");
  }
  return user;
}

/** Approved voters only — the gate in front of the ballot. */
export async function requireApprovedVoter(
  returnTo?: string,
): Promise<CurrentUser> {
  const user = await requireUser(returnTo);
  if (user.voterStatus !== "APPROVED") {
    redirect("/account");
  }
  return user;
}
