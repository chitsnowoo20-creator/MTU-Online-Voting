"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireRole } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";

export type DepartmentState = { error?: string };

const departmentSchema = z.object({
  code: z
    .string()
    .trim()
    .min(2, "Codes are at least two characters.")
    .max(10, "Keep the code short — it appears on candidate cards.")
    .regex(/^[A-Za-z]+$/, "Codes are letters only, e.g. CEIT."),
  name: z
    .string()
    .trim()
    .min(3, "Give the full department name.")
    .max(80, "That name is too long."),
});

export async function addDepartment(
  _prev: DepartmentState,
  formData: FormData,
): Promise<DepartmentState> {
  await requireRole(["ADMIN"], "/admin/departments");

  const parsed = departmentSchema.safeParse({
    code: formData.get("code"),
    name: formData.get("name"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid department." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("departments").insert(parsed.data);

  if (error) {
    if (error.code === "23505") {
      return { error: `The code ${parsed.data.code} is already in use.` };
    }
    return { error: error.message };
  }

  revalidatePath("/admin/departments");
  return {};
}

export async function renameDepartment(
  _prev: DepartmentState,
  formData: FormData,
): Promise<DepartmentState> {
  await requireRole(["ADMIN"], "/admin/departments");

  const code = formData.get("code")?.toString() ?? "";
  const name = formData.get("name")?.toString().trim() ?? "";

  if (name.length < 3) return { error: "Give the full department name." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("departments")
    .update({ name })
    .eq("code", code);

  if (error) return { error: error.message };

  revalidatePath("/admin/departments");
  return {};
}

/**
 * Departments are deactivated, never deleted.
 *
 * `voter_identity.department_code` and `candidates.department_code` reference
 * this table, so a delete would either fail or orphan a verified staff member's
 * identity record. `active = false` keeps the history readable while removing
 * it from the pickers.
 */
export async function setDepartmentActive(
  _prev: DepartmentState,
  formData: FormData,
): Promise<DepartmentState> {
  await requireRole(["ADMIN"], "/admin/departments");

  const code = formData.get("code")?.toString() ?? "";
  const active = formData.get("active") === "true";

  const supabase = await createClient();
  const { error } = await supabase
    .from("departments")
    .update({ active })
    .eq("code", code);

  if (error) return { error: error.message };

  revalidatePath("/admin/departments");
  return {};
}
