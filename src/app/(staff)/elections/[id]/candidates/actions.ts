"use server";

import { revalidatePath } from "next/cache";

import { requireRole } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import { candidateSchema } from "@/lib/validation/election";

export type CandidateState = {
  error?: string;
  fieldErrors?: Record<string, string>;
};

/**
 * A candidate is a standalone card, not an account. There is no profile_id on
 * the table and none is accepted here — that absence is what makes it
 * impossible to correlate a voter with a choice (AGENTS.md, identity rules).
 */
export async function addCandidate(
  _prev: CandidateState,
  formData: FormData,
): Promise<CandidateState> {
  await requireRole(["ELECTION_OFFICER"], "/elections");

  const parsed = candidateSchema.safeParse({
    categoryId: formData.get("categoryId"),
    displayName: formData.get("displayName"),
    tagline: formData.get("tagline")?.toString() || undefined,
    departmentCode: formData.get("departmentCode")?.toString() || undefined,
    photoPath: formData.get("photoPath"),
  });

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? "");
      if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { fieldErrors };
  }

  const electionId = formData.get("electionId")?.toString() ?? "";
  const supabase = await createClient();

  const { count } = await supabase
    .from("candidates")
    .select("id", { count: "exact", head: true })
    .eq("category_id", parsed.data.categoryId);

  const { error } = await supabase.from("candidates").insert({
    category_id: parsed.data.categoryId,
    display_name: parsed.data.displayName,
    tagline: parsed.data.tagline ?? null,
    department_code: parsed.data.departmentCode || null,
    photo_path: parsed.data.photoPath,
    display_order: count ?? 0,
  });

  if (error) {
    // The row never landed, so the uploaded photo is an orphan — remove it
    // rather than leaving it in a public bucket forever.
    await supabase.storage
      .from("candidate-photos")
      .remove([parsed.data.photoPath]);
    return { error: error.message };
  }

  revalidatePath(`/elections/${electionId}/candidates`);
  revalidatePath(`/elections/${electionId}`);
  return {};
}

export async function deleteCandidate(
  _prev: CandidateState,
  formData: FormData,
): Promise<CandidateState> {
  await requireRole(["ELECTION_OFFICER"], "/elections");

  const id = formData.get("candidateId")?.toString() ?? "";
  const electionId = formData.get("electionId")?.toString() ?? "";
  const photoPath = formData.get("photoPath")?.toString();

  const supabase = await createClient();
  const { error } = await supabase.from("candidates").delete().eq("id", id);
  if (error) return { error: error.message };

  if (photoPath) {
    await supabase.storage.from("candidate-photos").remove([photoPath]);
  }

  revalidatePath(`/elections/${electionId}/candidates`);
  revalidatePath(`/elections/${electionId}`);
  return {};
}
