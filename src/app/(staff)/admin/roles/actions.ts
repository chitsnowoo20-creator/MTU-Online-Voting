"use server";

import { revalidatePath } from "next/cache";

import { requireRole } from "@/lib/auth/guards";
import type { Database } from "@/lib/db/database.types";
import { createClient } from "@/lib/supabase/server";

type AppRole = Database["public"]["Enums"]["app_role"];

export type RoleState = { error?: string };

/**
 * Grants or revokes one role for one user.
 *
 * The write goes through RLS — admins only, and `granted_by` must be the
 * caller — and the audit trigger on `user_roles` records it. FR-22 and
 * invariant 8 are satisfied by the database, not by this function remembering
 * to log.
 */
export async function setRole(
  _prev: RoleState,
  formData: FormData,
): Promise<RoleState> {
  const admin = await requireRole(["ADMIN"], "/admin/roles");

  const profileId = formData.get("profileId")?.toString() ?? "";
  const role = formData.get("role")?.toString() as AppRole;
  const grant = formData.get("grant") === "true";

  if (!profileId || !role) return { error: "Missing user or role." };

  /*
   * Guard against the obvious footgun: the last admin removing their own admin
   * access locks everyone out of role management for good, since only an admin
   * can grant it back. Another admin can still revoke you — this only stops you
   * doing it to yourself.
   */
  if (!grant && role === "ADMIN" && profileId === admin.id) {
    return {
      error:
        "You can't remove your own admin access. Ask another admin to do it.",
    };
  }

  const supabase = await createClient();

  if (grant) {
    const { error } = await supabase
      .from("user_roles")
      .insert({ profile_id: profileId, role, granted_by: admin.id });

    // Already held — the checkbox and the database simply agree now.
    if (error && error.code !== "23505") return { error: error.message };
  } else {
    const { error } = await supabase
      .from("user_roles")
      .delete()
      .eq("profile_id", profileId)
      .eq("role", role);

    if (error) return { error: error.message };
  }

  revalidatePath("/admin/roles");
  return {};
}
