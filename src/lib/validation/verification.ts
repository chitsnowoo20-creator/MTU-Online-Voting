import { z } from "zod";

/** Accepted card images. The bucket enforces the same limits server-side. */
export const ID_CARD_MAX_BYTES = 5 * 1024 * 1024;
export const ID_CARD_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];

/**
 * Student URN: `MaNaTa-00000` as typed, `MANATA40883` as stored.
 *
 * Normalising here and re-checking in decide_review() is deliberate duplication
 * — the RPC's copy is the one that counts, this one just gives a useful error
 * before a round trip.
 */
export function normalizeUrn(raw: string): string {
  return raw.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
}

export function isValidUrn(raw: string | undefined | null): boolean {
  return /^MANATA[0-9]{5}$/.test(normalizeUrn(raw ?? ""));
}

export const URN_PLACEHOLDER = "MaNaTa-00000";

export const decisionSchema = z
  .object({
    submissionId: z.string().uuid(),
    approve: z.boolean(),
    memberType: z.enum(["STUDENT", "STAFF"]).optional(),
    urn: z.string().optional(),
    department: z.string().optional(),
    reason: z.string().optional(),
  })
  .superRefine((value, ctx) => {
    if (value.approve) {
      if (!value.memberType) {
        ctx.addIssue({
          code: "custom",
          path: ["memberType"],
          message: "Choose whether this is a student or staff card.",
        });
        return;
      }
      if (value.memberType === "STUDENT" && !isValidUrn(value.urn)) {
        ctx.addIssue({
          code: "custom",
          path: ["urn"],
          message: `Registration number must look like ${URN_PLACEHOLDER}.`,
        });
      }
      if (value.memberType === "STAFF" && !value.department) {
        ctx.addIssue({
          code: "custom",
          path: ["department"],
          message: "Pick the department shown on the card.",
        });
      }
      return;
    }

    // A rejection the voter cannot act on is worse than no reason at all —
    // they see this text on their "Try again" screen.
    if ((value.reason ?? "").trim().length < 5) {
      ctx.addIssue({
        code: "custom",
        path: ["reason"],
        message: "Say what was wrong, so they can fix it and resubmit.",
      });
    }
  });

export type DecisionInput = z.infer<typeof decisionSchema>;
