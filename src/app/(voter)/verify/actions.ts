"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

export type SubmitState = { error?: string };

/**
 * Records a verification submission against an already-uploaded card image.
 *
 * The upload itself happens from the browser, straight to Storage under the
 * `id-cards/{uid}/…` prefix its RLS policy allows. If this call fails after the
 * upload succeeded the object is orphaned — no PENDING submission references
 * it — and purge_id_images() sweeps it up on its next run, so a half-finished
 * submission never leaves an image lying around.
 */
export async function submitVerification(path: string): Promise<SubmitState> {
  const supabase = await createClient();

  const { error } = await supabase.rpc("submit_verification", {
    p_id_card_path: path,
  });

  if (error) {
    // Clean up eagerly rather than waiting for the nightly purge.
    await supabase.storage.from("id-cards").remove([path]);
    return { error: error.message };
  }

  revalidatePath("/verify");
  revalidatePath("/account");
  return {};
}
