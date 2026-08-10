"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { requestPasswordReset, type FormState } from "../auth-actions";
import { Button } from "@/components/ui/button";
import { Field, TextInput } from "@/components/ui/field";
import { FormError } from "@/components/ui/tile";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full">
      {pending ? "Sending…" : "Send reset link"}
    </Button>
  );
}

export function ForgotPasswordForm() {
  const [state, formAction] = useActionState<FormState, FormData>(
    requestPasswordReset,
    {},
  );

  if (state.sent) {
    return (
      <p className="text-body text-ink-muted">
        If that address is registered, a reset link is on its way. Check your
        inbox and spam folder.
      </p>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-6">
      {state.error ? <FormError>{state.error}</FormError> : null}

      <Field
        label="Email address"
        htmlFor="email"
        helper="We'll send a link to reset your password."
        error={state.fieldErrors?.email}
      >
        <TextInput
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          invalid={Boolean(state.fieldErrors?.email)}
        />
      </Field>

      <SubmitButton />
    </form>
  );
}
