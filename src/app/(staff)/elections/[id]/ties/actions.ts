"use server";

import { revalidatePath } from "next/cache";

import { requireRole } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";

export type TieState = { error?: string; saved?: string };

/**
 * Records the officer's arbitration of one tied category.
 *
 * RLS allows this insert only for an officer while the election is CLOSED, and
 * `unique (category_id)` means a category can be resolved once. The
 * justification is not optional and is shown publicly on the results page —
 * a tie broken without a stated reason is exactly the kind of thing the audit
 * trail exists to prevent.
 */
export async function resolveTie(
  _prev: TieState,
  formData: FormData,
): Promise<TieState> {
  const user = await requireRole(["ELECTION_OFFICER"], "/elections");

  const electionId = formData.get("electionId")?.toString() ?? "";
  const categoryId = formData.get("categoryId")?.toString() ?? "";
  const justification = formData.get("justification")?.toString().trim() ?? "";
  const candidateIds = formData.getAll("candidateId").map(String);

  if (justification.length < 10) {
    return {
      error:
        "Explain how the tie was broken — this is published alongside the result.",
    };
  }

  const resolution: Record<string, number> = {};
  const seen = new Set<number>();

  for (const candidateId of candidateIds) {
    const raw = formData.get(`rank-${candidateId}`)?.toString() ?? "";
    const rank = Number.parseInt(raw, 10);

    if (!Number.isInteger(rank) || rank < 1) {
      return { error: "Give every tied candidate a final rank." };
    }
    if (seen.has(rank)) {
      return { error: `Two candidates were both given rank ${rank}.` };
    }
    seen.add(rank);
    resolution[candidateId] = rank;
  }

  if (Object.keys(resolution).length === 0) {
    return { error: "Nothing to resolve." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("tie_resolutions").insert({
    election_id: electionId,
    category_id: categoryId,
    resolved_by: user.id,
    justification,
    resolution,
  });

  if (error) {
    if (error.code === "23505") {
      return { error: "This category has already been resolved." };
    }
    return { error: error.message };
  }

  revalidatePath(`/elections/${electionId}/ties`);
  revalidatePath(`/elections/${electionId}`);
  return { saved: categoryId };
}
