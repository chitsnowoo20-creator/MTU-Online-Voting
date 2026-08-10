"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { updatePassword, type FormState } from "../auth-actions";
import { Button } from "@/components/ui/button";
import { Field, TextInput } from "@/components/ui/field";
import { FormError } from "@/components/ui/tile";
import { PASSWORD_MIN } from "@/lib/validation/auth";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full">
      {pending ? "Saving…" : "Set new password"}
    </Button>
  );
}

export function ResetPasswordForm() {
  const [state, formAction] = useActionState<FormState, FormData>(
    updatePassword,
    {},
  );

  return (
    <form action={formAction} className="flex flex-col gap-6">
      {state.error ? <FormError>{state.error}</FormError> : null}

      <Field
        label="New password"
        htmlFor="password"
        helper={`Minimum ${PASSWORD_MIN} characters.`}
        error={state.fieldErrors?.password}
      >
        <TextInput
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={PASSWORD_MIN}
          required
          invalid={Boolean(state.fieldErrors?.password)}
        />
      </Field>

      <Field
        label="Confirm password"
        htmlFor="confirmPassword"
        error={state.fieldErrors?.confirmPassword}
      >
        <TextInput
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          minLength={PASSWORD_MIN}
          required
          invalid={Boolean(state.fieldErrors?.confirmPassword)}
        />
      </Field>

      <SubmitButton />
    </form>
  );
}
