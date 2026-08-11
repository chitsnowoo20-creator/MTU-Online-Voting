"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";

import { decideReview, type DecisionState } from "../actions";
import { Button } from "@/components/ui/button";
import { Field, TextInput } from "@/components/ui/field";
import { FormError } from "@/components/ui/tile";
import { URN_PLACEHOLDER } from "@/lib/validation/verification";

type Department = { code: string; name: string };

function Actions({ rejecting }: { rejecting: boolean }) {
  const { pending } = useFormStatus();
  return (
    <div className="flex flex-wrap gap-3">
      {rejecting ? (
        <Button
          type="submit"
          name="decision"
          value="reject"
          variant="danger"
          disabled={pending}
        >
          {pending ? "Saving…" : "Confirm rejection"}
        </Button>
      ) : (
        <Button
          type="submit"
          name="decision"
          value="approve"
          disabled={pending}
        >
          {pending ? "Saving…" : "Approve"}
        </Button>
      )}
    </div>
  );
}

export function DecisionForm({
  submissionId,
  fullName,
  departments,
}: {
  submissionId: string;
  fullName: string;
  departments: Department[];
}) {
  const [state, formAction] = useActionState<DecisionState, FormData>(
    decideReview,
    {},
  );
  const [memberType, setMemberType] = useState<"STUDENT" | "STAFF">("STUDENT");
  const [rejecting, setRejecting] = useState(false);

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <input type="hidden" name="submissionId" value={submissionId} />
      {state.error ? <FormError>{state.error}</FormError> : null}

      {!rejecting ? (
        <>
          <fieldset>
            <legend className="mb-1.5 text-caption text-ink-muted">
              Member type
            </legend>
            <div className="flex">
              {(["STUDENT", "STAFF"] as const).map((type) => (
                <label
                  key={type}
                  className={
                    "cursor-pointer border px-4 py-3 text-body-sm transition-all " +
                    (memberType === type
                      ? "border-primary bg-primary/10 text-brand-ink shadow-[0_0_0_3px_rgb(87_173_222/0.15)]"
                      : "border-hairline bg-canvas text-ink-muted hover:border-primary/40")
                  }
                >
                  <input
                    type="radio"
                    name="memberType"
                    value={type}
                    checked={memberType === type}
                    onChange={() => setMemberType(type)}
                    className="sr-only"
                  />
                  {type === "STUDENT" ? "Student" : "Staff"}
                </label>
              ))}
            </div>
            {state.fieldErrors?.memberType ? (
              <p className="mt-1.5 text-caption text-error-ink">
                {state.fieldErrors.memberType}
              </p>
            ) : null}
          </fieldset>

          {memberType === "STUDENT" ? (
            <Field
              label="Registration number"
              htmlFor="urn"
              helper="Copy it exactly as printed. Stored uppercased with the dash removed."
              error={state.fieldErrors?.urn}
            >
              <TextInput
                id="urn"
                name="urn"
                placeholder={URN_PLACEHOLDER}
                autoComplete="off"
                invalid={Boolean(state.fieldErrors?.urn)}
              />
            </Field>
          ) : (
            <Field
              label="Department"
              htmlFor="department"
              helper={`The username is generated from "${fullName}" plus this code, with a number appended if it clashes.`}
              error={state.fieldErrors?.department}
            >
              <select
                id="department"
                name="department"
                defaultValue=""
                className="w-full rounded-xl border border-hairline bg-canvas px-4 py-3 text-body text-ink shadow-[inset_0_1px_2px_rgb(20_32_51/0.03)] outline-none transition-all focus:border-primary focus:ring-4 focus:ring-primary/10"
              >
                <option value="" disabled>
                  Select a department
                </option>
                {departments.map((department) => (
                  <option key={department.code} value={department.code}>
                    {department.code} — {department.name}
                  </option>
                ))}
              </select>
            </Field>
          )}
        </>
      ) : (
        <Field
          label="Reason for rejection"
          htmlFor="reason"
          helper="The voter sees this on their retry screen."
          error={state.fieldErrors?.reason}
        >
          <textarea
            id="reason"
            name="reason"
            rows={3}
            className="w-full rounded-xl border border-hairline bg-canvas px-4 py-3 text-body text-ink shadow-[inset_0_1px_2px_rgb(20_32_51/0.03)] outline-none transition-all focus:border-primary focus:ring-4 focus:ring-primary/10"
            placeholder="The photo was too blurry to read the registration number."
          />
        </Field>
      )}

      <div className="flex flex-wrap items-center gap-3 border-t border-hairline pt-6">
        <Actions rejecting={rejecting} />
        <Button
          type="button"
          variant="ghost"
          onClick={() => setRejecting((value) => !value)}
        >
          {rejecting ? "Back to approval" : "Reject…"}
        </Button>
      </div>

      <p className="text-caption text-ink-muted">
        Either decision deletes the card image and writes an entry to the audit
        log. It cannot be undone from this screen.
      </p>
    </form>
  );
}
