"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { resolveTie, type TieState } from "./actions";
import { Button } from "@/components/ui/button";
import { TextInput } from "@/components/ui/field";
import { FormError } from "@/components/ui/tile";

export type TiedGroup = {
  categoryId: string;
  categoryName: string;
  resultRank: number;
  candidates: { id: string; name: string }[];
};

function Save() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Recording…" : "Record resolution"}
    </Button>
  );
}

export function TieForm({
  electionId,
  group,
}: {
  electionId: string;
  group: TiedGroup;
}) {
  const [state, formAction] = useActionState<TieState, FormData>(
    resolveTie,
    {},
  );

  if (state.saved === group.categoryId) {
    return (
      <div className="surface-card px-6 py-5">
        <h2 className="text-card-title">{group.categoryName}</h2>
        <p className="mt-1 text-body-sm text-ink-muted">
          Resolution recorded. This category no longer blocks publication.
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className="surface-card overflow-hidden">
      <input type="hidden" name="electionId" value={electionId} />
      <input type="hidden" name="categoryId" value={group.categoryId} />

      <div className="border-b border-hairline px-6 py-4">
        <h2 className="text-card-title">{group.categoryName}</h2>
        <p className="text-body-sm text-ink-muted">
          {group.candidates.length} candidates are level at rank{" "}
          {group.resultRank}.
        </p>
      </div>

      <div className="flex flex-col gap-5 px-6 py-6">
        {state.error ? <FormError>{state.error}</FormError> : null}

        <div className="flex flex-col gap-3">
          <p className="text-caption text-ink-muted">
            Give each one a final rank
          </p>
          {group.candidates.map((candidate, index) => (
            <div
              key={candidate.id}
              className="flex items-center justify-between gap-4 border-b border-hairline pb-3 last:border-b-0"
            >
              <span className="text-body-sm">{candidate.name}</span>
              <input type="hidden" name="candidateId" value={candidate.id} />
              <div className="w-24">
                <TextInput
                  name={`rank-${candidate.id}`}
                  type="number"
                  min={1}
                  defaultValue={group.resultRank + index}
                  aria-label={`Final rank for ${candidate.name}`}
                />
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-col">
          <label
            htmlFor={`justification-${group.categoryId}`}
            className="mb-1.5 text-caption text-ink-muted"
          >
            How was this decided?
          </label>
          <textarea
            id={`justification-${group.categoryId}`}
            name="justification"
            rows={3}
            placeholder="Coin toss witnessed by the organising committee, 6 Sep 19:20."
            className="w-full rounded-xl border border-hairline bg-canvas px-4 py-3 text-body text-ink shadow-[inset_0_1px_2px_rgb(20_32_51/0.03)] outline-none transition-all focus:border-primary focus:ring-4 focus:ring-primary/10"
          />
          <p className="mt-1.5 text-caption text-ink-muted">
            Published with the result and written to the audit log.
          </p>
        </div>

        <div>
          <Save />
        </div>
      </div>
    </form>
  );
}
