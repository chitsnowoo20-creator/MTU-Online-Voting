import type { Metadata } from "next";
import Link from "next/link";

import { ResendForm } from "./resend-form";
import { AuthShell } from "@/components/ui/auth-shell";
import { ButtonLink } from "@/components/ui/button";
import { FormError } from "@/components/ui/tile";

export const metadata: Metadata = {
  title: "Check your inbox · Campus Elections",
};

export default async function ConfirmPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string; error?: string }>;
}) {
  const { email, error } = await searchParams;

  return (
    <AuthShell
      title="Check your inbox"
      intro={
        email ? (
          <>
            We sent a confirmation link to{" "}
            <span className="text-ink">{email}</span>.
          </>
        ) : (
          <>We sent you a confirmation link.</>
        )
      }
    >
      <div className="flex flex-col gap-6">
        {error ? <FormError>{error}</FormError> : null}

        <p className="text-body text-ink-muted">
          Click it to activate your account, then return here to verify your
          identity. Confirming your email proves you own the mailbox — a
          reviewer still has to check your ID card before you can vote.
        </p>

        <p className="text-body-sm text-ink-muted">
          Nothing yet? Check your spam folder, or resend the link.
        </p>

        <div className="flex flex-wrap gap-3">
          {email ? <ResendForm email={email} /> : null}
          <ButtonLink href="/register" variant="ghost">
            Change email
          </ButtonLink>
        </div>
      </div>

      <p className="mt-8 text-body-sm text-ink-muted">
        Already confirmed? <Link className="auth-link" href="/login">Sign in</Link>
      </p>
    </AuthShell>
  );
}
