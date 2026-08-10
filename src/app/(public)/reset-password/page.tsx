import type { Metadata } from "next";
import Link from "next/link";

import { ResetPasswordForm } from "./reset-password-form";
import { AuthShell } from "@/components/ui/auth-shell";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Choose a new password · Campus Elections",
};

export default async function ResetPasswordPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <AuthShell
        title="Link expired"
        intro="This reset link is no longer valid."
      >
        <p className="text-body text-ink-muted">
          Reset links expire after use or after a short time. Request a fresh
          one and open it promptly.
        </p>
        <p className="mt-6 text-body-sm">
          <Link href="/forgot-password">Request a new reset link</Link>
        </p>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Choose a new password"
      intro="Enter a new password for your account."
      footer={
        <>
          <Link href="/login">Back to sign in</Link>
        </>
      }
    >
      <ResetPasswordForm />
    </AuthShell>
  );
}
