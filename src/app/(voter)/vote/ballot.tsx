"use client";

import Image from "next/image";
import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";

import { castVote, type CastState } from "./actions";
import { Button } from "@/components/ui/button";
import { FormError } from "@/components/ui/tile";

export type BallotCandidate = {
  id: string;
  display_name: string;
  tagline: string | null;
  department_code: string | null;
  photo_url: string;
};

function Confirm({ name }: { name: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Casting…" : `Cast my vote for ${name}`}
    </Button>
  );
}

export function CategoryBallot({
  categoryId,
  categoryName,
  awardLabels,
  candidates,
}: {
  categoryId: string;
  categoryName: string;
  awardLabels: string[];
  candidates: BallotCandidate[];
}) {
  const [state, formAction] = useActionState<CastState, FormData>(
    castVote,
    {},
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  const selected = candidates.find((candidate) => candidate.id === selectedId);

  return (
    <section className="border border-hairline bg-canvas">
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-hairline px-6 py-4">
        <h2 className="text-card-title">{categoryName}</h2>
        <p className="text-body-sm text-ink-muted">
          {awardLabels.length > 0
            ? `Deciding: ${awardLabels.join(", ")}`
            : "One vote"}
        </p>
      </div>

      <div className="px-6 py-6">
        {state.error ? (
          <div className="mb-4">
            <FormError>{state.error}</FormError>
          </div>
        ) : null}

        <ul
          role="radiogroup"
          aria-label={`Candidates for ${categoryName}`}
          className="grid gap-px bg-hairline sm:grid-cols-2 lg:grid-cols-3"
        >
          {candidates.map((candidate) => {
            const isSelected = candidate.id === selectedId;
            return (
              <li key={candidate.id} className="bg-canvas">
                <button
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  disabled={confirming}
                  onClick={() => setSelectedId(candidate.id)}
                  className={
                    "flex w-full cursor-pointer flex-col p-4 text-left transition-colors " +
                    (isSelected
                      ? "bg-surface-1 outline outline-2 -outline-offset-2 outline-primary"
                      : "hover:bg-surface-1")
                  }
                >
                  <div className="relative mb-3 aspect-[4/5] w-full bg-surface-1">
                    <Image
                      src={candidate.photo_url}
                      alt=""
                      fill
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 280px"
                      className="object-cover"
                    />
                  </div>
                  <span className="text-body text-ink">
                    {candidate.display_name}
                  </span>
                  {candidate.tagline ? (
                    <span className="text-caption text-ink-muted">
                      {candidate.tagline}
                    </span>
                  ) : null}
                  {candidate.department_code ? (
                    <span className="mt-1 text-caption text-ink-subtle">
                      {candidate.department_code}
                    </span>
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>

        <div className="mt-6 border-t border-hairline pt-6">
          {confirming && selected ? (
            <form action={formAction} className="flex flex-col gap-3">
              <input type="hidden" name="categoryId" value={categoryId} />
              <input type="hidden" name="candidateId" value={selected.id} />
              <p className="text-body text-ink">
                Cast your vote for {selected.display_name}?
              </p>
              <p className="text-body-sm text-ink-muted">
                This is final. You get one vote in {categoryName}, and it
                can&rsquo;t be changed or withdrawn afterwards.
              </p>
              <div className="flex flex-wrap gap-3">
                <Confirm name={selected.display_name} />
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setConfirming(false)}
                >
                  Go back
                </Button>
              </div>
            </form>
          ) : (
            <Button
              type="button"
              disabled={!selected}
              onClick={() => setConfirming(true)}
            >
              {selected ? `Continue with ${selected.display_name}` : "Continue"}
            </Button>
          )}
        </div>
      </div>
    </section>
  );
}
