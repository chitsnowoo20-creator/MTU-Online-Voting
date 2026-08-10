import { z } from "zod";

/**
 * Shared by the form and the Server Action. The client-side pass is UX only —
 * the action re-parses the same schema, because a client check is assumed
 * bypassable (AGENTS.md invariant 10).
 */

/** Minimum 10 characters, as the design reference states under the field. */
export const PASSWORD_MIN = 10;

export const registerSchema = z.object({
  /*
   * `full_name` is not decorative: generate_staff_username() derives a staff
   * member's handle from it, and the reviewer queue shows it beside the ID card.
   */
  fullName: z
    .string()
    .trim()
    .min(2, "Enter your full name as it appears on your ID card.")
    .max(120, "That name is too long."),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Enter a valid email address."),
  password: z
    .string()
    .min(PASSWORD_MIN, `Use at least ${PASSWORD_MIN} characters.`)
    .max(72, "Passwords are limited to 72 characters."),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address."),
  password: z.string().min(1, "Enter your password."),
});

export const forgotPasswordSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address."),
});

export const resetPasswordSchema = z
  .object({
    password: z
      .string()
      .min(PASSWORD_MIN, `Use at least ${PASSWORD_MIN} characters.`)
      .max(72, "Passwords are limited to 72 characters."),
    confirmPassword: z.string().min(1, "Confirm your password."),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match.",
    path: ["confirmPassword"],
  });

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
