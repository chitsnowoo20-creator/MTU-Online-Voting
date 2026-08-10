import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { ForgotPasswordForm } from "./forgot-password-form";
import { AuthShell } from "@/components/ui/auth-shell";
import { getCurrentUser } from "@/lib/auth/guards";

export const metadata: Metadata = {
  title: "Reset password · Campus Elections",
};

export default async function ForgotPasswordPage() {
  if (await getCurrentUser()) redirect("/account");

  return (
    <AuthShell
      title="Reset password"
      intro="Enter the email address you registered with."
      footer={
        <>
          Remembered it? <Link className="auth-link" href="/login">Sign in</Link>
        </>
      }
    >
      <ForgotPasswordForm />
    </AuthShell>
  );
}
