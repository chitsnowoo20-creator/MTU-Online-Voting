"use server";

import { revalidatePath } from "next/cache";

import { requireRole } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import { awardSchema, categorySchema } from "@/lib/validation/election";

export type BallotState = { error?: string };

/**
 * Every write here goes through RLS, which permits it only for an officer and
 * only while the election is DRAFT (FR-13). The audit triggers on categories
 * and awards record each change, so no RPC is needed for the audit trail.
 */

export async function addCategory(
  _prev: BallotState,
  formData: FormData,
): Promise<BallotState> {
  await requireRole(["ELECTION_OFFICER"], "/elections");

  const parsed = categorySchema.safeParse({
    electionId: formData.get("electionId"),
    name: formData.get("name"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid category." };
  }

  const supabase = await createClient();
  const { count } = await supabase
    .from("categories")
    .select("id", { count: "exact", head: true })
    .eq("election_id", parsed.data.electionId);

  const { error } = await supabase.from("categories").insert({
    election_id: parsed.data.electionId,
    name: parsed.data.name,
    display_order: count ?? 0,
  });

  if (error) return { error: error.message };

  revalidatePath(`/elections/${parsed.data.electionId}/categories`);
  revalidatePath(`/elections/${parsed.data.electionId}`);
  return {};
}

export async function deleteCategory(
  _prev: BallotState,
  formData: FormData,
): Promise<BallotState> {
  await requireRole(["ELECTION_OFFICER"], "/elections");

  const id = formData.get("categoryId")?.toString() ?? "";
  const electionId = formData.get("electionId")?.toString() ?? "";

  const supabase = await createClient();
  // Awards and candidates cascade with the category.
  const { error } = await supabase.from("categories").delete().eq("id", id);
  if (error) return { error: error.message };

  revalidatePath(`/elections/${electionId}/categories`);
  revalidatePath(`/elections/${electionId}`);
  return {};
}

export async function addAward(
  _prev: BallotState,
  formData: FormData,
): Promise<BallotState> {
  await requireRole(["ELECTION_OFFICER"], "/elections");

  const parsed = awardSchema.safeParse({
    categoryId: formData.get("categoryId"),
    rank: formData.get("rank"),
    label: formData.get("label"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid award." };
  }

  const electionId = formData.get("electionId")?.toString() ?? "";
  const supabase = await createClient();

  const { error } = await supabase.from("awards").insert({
    category_id: parsed.data.categoryId,
    rank: parsed.data.rank,
    label: parsed.data.label,
  });

  if (error) {
    // unique (category_id, rank)
    if (error.code === "23505") {
      return { error: `Rank ${parsed.data.rank} is already taken here.` };
    }
    return { error: error.message };
  }

  revalidatePath(`/elections/${electionId}/categories`);
  revalidatePath(`/elections/${electionId}`);
  return {};
}

export async function deleteAward(
  _prev: BallotState,
  formData: FormData,
): Promise<BallotState> {
  await requireRole(["ELECTION_OFFICER"], "/elections");

  const id = formData.get("awardId")?.toString() ?? "";
  const electionId = formData.get("electionId")?.toString() ?? "";

  const supabase = await createClient();
  const { error } = await supabase.from("awards").delete().eq("id", id);
  if (error) return { error: error.message };

  revalidatePath(`/elections/${electionId}/categories`);
  revalidatePath(`/elections/${electionId}`);
  return {};
}
