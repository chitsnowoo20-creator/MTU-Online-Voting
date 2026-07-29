"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { register, type FormState } from "../auth-actions";
import { Button } from "@/components/ui/button";
import { Field, TextInput } from "@/components/ui/field";
import { FormError } from "@/components/ui/tile";
import { PASSWORD_MIN } from "@/lib/validation/auth";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full">
      {pending ? "Creating account…" : "Create account"}
    </Button>
  );
}

export function RegisterForm() {
  const [state, formAction] = useActionState<FormState, FormData>(register, {});

  return (
    <form action={formAction} className="flex flex-col gap-6">
      {state.error ? <FormError>{state.error}</FormError> : null}

      <Field
        label="Full name"
        htmlFor="fullName"
        helper="As it appears on your student or staff ID card."
        error={state.fieldErrors?.fullName}
      >
        <TextInput
          id="fullName"
          name="fullName"
          autoComplete="name"
          required
          invalid={Boolean(state.fieldErrors?.fullName)}
        />
      </Field>

      <Field
        label="Email address"
        htmlFor="email"
        helper="Any address works — it only proves you control a mailbox."
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

      <Field
        label="Password"
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

      <SubmitButton />
    </form>
  );
}
