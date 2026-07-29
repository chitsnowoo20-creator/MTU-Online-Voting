"use server";

import { revalidatePath } from "next/cache";

import { requireApprovedVoter } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";

export type CastState = { error?: string; done?: boolean };

/** The RPC's error codes, in words a voter can act on. */
const MESSAGES: Record<string, string> = {
  EV001: "Voting isn't open right now.",
  EV002: "Your account isn't approved to vote yet.",
  EV003: "That candidate isn't in this category.",
  EV004: "You've already voted in this category.",
  EV005:
    "Your identity was verified after this election's deadline, so you can't vote in it.",
};

/**
 * Casts one ballot in one category.
 *
 * Everything that matters happens inside `cast_vote()`: eligibility, the
 * election window, and both table writes in a single transaction. A retry or a
 * double tap hits the unique index on ballot_issued and rolls the whole thing
 * back, so a vote can never be double-counted (FR-17).
 *
 * Note what this does *not* do: it returns no receipt, and no confirmation of
 * who was chosen. It couldn't if it wanted to — once the transaction commits,
 * nothing in the database connects this voter to that choice.
 */
export async function castVote(
  _prev: CastState,
  formData: FormData,
): Promise<CastState> {
  await requireApprovedVoter("/vote");

  const categoryId = formData.get("categoryId")?.toString() ?? "";
  const candidateId = formData.get("candidateId")?.toString() ?? "";

  if (!categoryId || !candidateId) {
    return { error: "Choose a candidate first." };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("cast_vote", {
    p_category_id: categoryId,
    p_candidate_id: candidateId,
  });

  if (error) {
    return { error: MESSAGES[error.code ?? ""] ?? error.message };
  }

  revalidatePath("/vote");
  return { done: true };
}
