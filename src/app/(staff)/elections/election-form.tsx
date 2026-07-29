"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";

import {
  createElection,
  updateElection,
  type ElectionFormState,
} from "./actions";
import { Button } from "@/components/ui/button";
import { Field, TextInput } from "@/components/ui/field";
import { FormError } from "@/components/ui/tile";

/** An ISO instant as the `datetime-local` input wants it, in the viewer's zone. */
function toLocalInput(iso: string | null | undefined): string {
  if (!iso) return "";
  const date = new Date(iso);
  const pad = (value: number) => String(value).padStart(2, "0");
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}`
  );
}

/**
 * A `datetime-local` input paired with a hidden ISO field.
 *
 * The visible input speaks the officer's local time; the hidden one carries UTC
 * so the server never has to guess which zone the string was written in.
 *
 * The visible value legitimately differs between server and client render — the
 * server formats in its own zone, the browser in the officer's — hence
 * `suppressHydrationWarning` on that input alone. The hidden ISO value round
 * trips to the same instant either way, so it hydrates cleanly.
 */
function DateTimeField({
  name,
  label,
  helper,
  error,
  defaultIso,
}: {
  name: string;
  label: string;
  helper?: string;
  error?: string;
  defaultIso?: string | null;
}) {
  const [local, setLocal] = useState(() => toLocalInput(defaultIso));

  return (
    <Field label={label} htmlFor={name} helper={helper} error={error}>
      <TextInput
        id={name}
        type="datetime-local"
        value={local}
        onChange={(event) => setLocal(event.target.value)}
        invalid={Boolean(error)}
        suppressHydrationWarning
      />
      <input
        type="hidden"
        name={name}
        value={local ? new Date(local).toISOString() : ""}
      />
    </Field>
  );
}

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Saving…" : label}
    </Button>
  );
}

export type ElectionDefaults = {
  id: string;
  name: string;
  opensAt: string | null;
  closesAt: string | null;
  verificationDeadline: string | null;
};

export function ElectionForm({
  election,
}: {
  election?: ElectionDefaults;
}) {
  const [state, formAction] = useActionState<ElectionFormState, FormData>(
    election ? updateElection : createElection,
    {},
  );

  return (
    <form
      action={formAction}
      className="flex flex-col gap-6 border border-hairline bg-canvas p-6"
    >
      {election ? <input type="hidden" name="id" value={election.id} /> : null}
      {state.error ? <FormError>{state.error}</FormError> : null}

      <Field
        label="Election name"
        htmlFor="name"
        error={state.fieldErrors?.name}
      >
        <TextInput
          id="name"
          name="name"
          defaultValue={election?.name}
          placeholder="Freshers' Coronation 2026"
          invalid={Boolean(state.fieldErrors?.name)}
        />
      </Field>

      <div className="grid gap-6 sm:grid-cols-2">
        <DateTimeField
          name="opensAt"
          label="Opens"
          defaultIso={election?.opensAt}
          error={state.fieldErrors?.opensAt}
        />
        <DateTimeField
          name="closesAt"
          label="Closes"
          defaultIso={election?.closesAt}
          error={state.fieldErrors?.closesAt}
        />
      </div>

      <DateTimeField
        name="verificationDeadline"
        label="Verification deadline"
        helper="Last moment a voter can be verified for this election. Must be on or before Opens."
        defaultIso={election?.verificationDeadline}
        error={state.fieldErrors?.verificationDeadline}
      />

      <div className="flex flex-wrap items-center gap-3 border-t border-hairline pt-6">
        <Submit label={election ? "Save changes" : "Create election"} />
        <Link
          href={election ? `/elections/${election.id}` : "/elections"}
          className="text-body-sm"
        >
          Cancel
        </Link>
      </div>

      <p className="text-caption text-ink-muted">
        Times can be left blank in draft, but voting cannot open until both
        Opens and Closes are set.
      </p>
    </form>
  );
}
