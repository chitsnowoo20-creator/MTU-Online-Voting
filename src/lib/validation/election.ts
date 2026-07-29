import { z } from "zod";

/**
 * Election setup schemas.
 *
 * These mirror the CHECK constraints in the elections table
 * (`election_window`, `verification_before_open`) and the preconditions in
 * `transition_election()`. The database copy is the one that counts; this one
 * exists so an officer sees the problem in the form instead of as a Postgres
 * error.
 */

const isoOrEmpty = z
  .string()
  .trim()
  .refine(
    (value) => value === "" || !Number.isNaN(Date.parse(value)),
    "That isn't a valid date and time.",
  );

export const electionSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(3, "Give the election a name people will recognise.")
      .max(120, "That name is too long."),
    opensAt: isoOrEmpty,
    closesAt: isoOrEmpty,
    verificationDeadline: isoOrEmpty,
  })
  .superRefine((value, ctx) => {
    const opens = value.opensAt ? Date.parse(value.opensAt) : null;
    const closes = value.closesAt ? Date.parse(value.closesAt) : null;
    const deadline = value.verificationDeadline
      ? Date.parse(value.verificationDeadline)
      : null;

    if (opens !== null && closes !== null && closes <= opens) {
      ctx.addIssue({
        code: "custom",
        path: ["closesAt"],
        message: "Voting has to close after it opens.",
      });
    }

    if (opens !== null && deadline !== null && deadline > opens) {
      ctx.addIssue({
        code: "custom",
        path: ["verificationDeadline"],
        message:
          "Verification must close on or before voting opens — a voter approved after that can't vote in this election.",
      });
    }
  });

export const categorySchema = z.object({
  electionId: z.string().uuid(),
  name: z
    .string()
    .trim()
    .min(1, "Name the category.")
    .max(60, "Keep the category name short."),
});

export const awardSchema = z.object({
  categoryId: z.string().uuid(),
  rank: z.coerce
    .number()
    .int("Rank has to be a whole number.")
    .min(1, "Rank starts at 1.")
    .max(20, "That's more ranks than any category needs."),
  label: z
    .string()
    .trim()
    .min(1, "Give the award a title, e.g. King.")
    .max(60, "Keep the title short."),
});

export const candidateSchema = z.object({
  categoryId: z.string().uuid(),
  displayName: z
    .string()
    .trim()
    .min(2, "Add the candidate's name.")
    .max(80, "That name is too long."),
  tagline: z
    .string()
    .trim()
    .max(140, "Keep the tagline to a line or so.")
    .optional(),
  departmentCode: z.string().trim().optional(),
  photoPath: z.string().trim().min(1, "A photo is required."),
});

export const CANDIDATE_PHOTO_MAX_BYTES = 5 * 1024 * 1024;
export const CANDIDATE_PHOTO_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
];
