"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { resendConfirmation, type FormState } from "../auth-actions";
import { Button } from "@/components/ui/button";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="tertiary" disabled={pending}>
      {pending ? "Sending…" : "Resend link"}
    </Button>
  );
}

export function ResendForm({ email }: { email: string }) {
  const [state, formAction] = useActionState<FormState, FormData>(
    resendConfirmation,
    {},
  );
  return (
    <form action={formAction} className="flex flex-col gap-3">
      <input type="hidden" name="email" value={email} />
      <SubmitButton />
      {state.error ? (
        <p className="text-caption text-error-ink">{state.error}</p>
      ) : state.sent ? (
        <p className="text-caption text-ink-muted">Sent — check your inbox.</p>
      ) : null}
    </form>
  );
}
