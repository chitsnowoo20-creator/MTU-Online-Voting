"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { login, type FormState } from "../auth-actions";
import { Button } from "@/components/ui/button";
import { Field, TextInput } from "@/components/ui/field";
import { FormError } from "@/components/ui/tile";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full">
      {pending ? "Signing in…" : "Sign in"}
    </Button>
  );
}

export function LoginForm({ next }: { next?: string }) {
  const [state, formAction] = useActionState<FormState, FormData>(login, {});

  return (
    <form action={formAction} className="flex flex-col gap-6">
      {state.error ? <FormError>{state.error}</FormError> : null}
      {next ? <input type="hidden" name="next" value={next} /> : null}

      <Field
        label="Email address"
        htmlFor="email"
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
        error={state.fieldErrors?.password}
      >
        <TextInput
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          invalid={Boolean(state.fieldErrors?.password)}
        />
      </Field>

      <SubmitButton />
    </form>
  );
}
