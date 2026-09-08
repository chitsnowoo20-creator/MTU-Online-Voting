"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { decisionSchema, normalizeUrn } from "@/lib/validation/verification";

export type DecisionState = {
  error?: string;
  fieldErrors?: Record<string, string>;
};

export type IdCardUrlState = {
  error?: string;
  signedUrl?: string;
  /** When that URL stops working, so the viewer can count down to it. */
  expiresAt?: number;
};

/** Mint a fresh signed URL for the pending submission's ID card image. */
export async function refreshIdCardUrl(
  _prev: IdCardUrlState,
  formData: FormData,
): Promise<IdCardUrlState> {
  const submissionId = String(formData.get("submissionId") ?? "");
  if (!submissionId) return { error: "Missing submission." };

  const supabase = await createClient();
  const { data: submission } = await supabase
    .from("verification_queue")
    .select("id_card_path")
    .eq("submission_id", submissionId)
    .maybeSingle();

  if (!submission?.id_card_path) {
    return { error: "The image is no longer available." };
  }

  const { data: signed, error } = await supabase.storage
    .from("id-cards")
    .createSignedUrl(submission.id_card_path, 300);

  if (error || !signed?.signedUrl) {
    return { error: error?.message ?? "Could not load the image." };
  }

  return { signedUrl: signed.signedUrl, expiresAt: Date.now() + 300_000 };
}

export async function decideReview(
  _prev: DecisionState,
  formData: FormData,
): Promise<DecisionState> {
  const parsed = decisionSchema.safeParse({
    submissionId: formData.get("submissionId"),
    approve: formData.get("decision") === "approve",
    memberType: formData.get("memberType") || undefined,
    urn: formData.get("urn")?.toString() || undefined,
    department: formData.get("department")?.toString() || undefined,
    reason: formData.get("reason")?.toString() || undefined,
  });

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? "");
      if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { fieldErrors };
  }

  const input = parsed.data;
  const supabase = await createClient();

  /*
   * decide_review() does everything that must be atomic: writes the identity
   * anchor (unique index = the duplicate-registration guard), moves
   * voter_status, closes the submission, and writes the audit row. It returns
   * the card's storage path so we can delete the object itself.
   */
  const { data: cardPath, error } = await supabase.rpc("decide_review", {
    p_submission_id: input.submissionId,
    p_approve: input.approve,
    p_member_type: input.approve ? input.memberType : undefined,
    p_urn:
      input.approve && input.memberType === "STUDENT"
        ? normalizeUrn(input.urn ?? "")
        : undefined,
    p_dept:
      input.approve && input.memberType === "STAFF"
        ? input.department
        : undefined,
    p_reason: input.approve ? undefined : input.reason,
  });

  if (error) {
    // EV020 is the duplicate-identity case, which is a real finding rather
    // than a fault — say so plainly instead of showing a Postgres message.
    if (error.code === "EV020") {
      return {
        error:
          "That identity is already registered to another account. Reject this submission and refer it to an admin.",
      };
    }
    return { error: error.message };
  }

  /*
   * Invariant 6: the image goes now, not on the next cron run. The reviewer's
   * own delete policy on the bucket is what authorises this — no service-role
   * key involved.
   */
  if (cardPath) {
    const { error: removeError } = await supabase.storage
      .from("id-cards")
      .remove([cardPath]);
    if (removeError) {
      // The decision is already committed and the DB pointer is nulled;
      // purge_id_images() is the backstop for the object itself.
      console.error("id-card delete failed, leaving it to the purge job", {
        submissionId: input.submissionId,
        message: removeError.message,
      });
    }
  }

  revalidatePath("/review");
  redirect("/review");
}
