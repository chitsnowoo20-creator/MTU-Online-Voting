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
    <Button type="submit" disabled={pending} className="!min-h-14 !px-7">
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
  const [state, formAction] = useActionState<CastState, FormData>(castVote, {});
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  const selected = candidates.find((candidate) => candidate.id === selectedId);

  return (
    <section className="overflow-hidden rounded-[28px] border border-hairline bg-canvas shadow-card">
      <div className="flex flex-wrap items-baseline justify-between gap-2 bg-[image:var(--gradient-mesh)] bg-inverse-canvas px-7 py-5">
        <h2 className="text-headline text-inverse-ink">{categoryName}</h2>
        <p className="rounded-full bg-white/10 px-3 py-1.5 text-caption font-semibold text-inverse-ink-muted">
          {awardLabels.length > 0 ? `Deciding: ${awardLabels.join(", ")}` : "One vote"}
        </p>
      </div>

      <div className="px-6 py-7">
        {state.error ? (
          <div className="mb-5">
            <FormError>{state.error}</FormError>
          </div>
        ) : null}

        <ul
          role="radiogroup"
          aria-label={`Candidates for ${categoryName}`}
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
        >
          {candidates.map((candidate) => {
            const isSelected = candidate.id === selectedId;
            return (
              <li key={candidate.id}>
                <button
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  disabled={confirming}
                  onClick={() => setSelectedId(candidate.id)}
                  /*
                   * Same card as the officer's candidate manager: photo bleeds
                   * to the edges and is clipped by the card's radius, body sits
                   * in its own padded block. `rounded-[var(--radius-lg)]` is the
                   * radius `.surface-card` uses, so the two match exactly — this
                   * card cannot use that class directly because it needs a 2px
                   * border to carry the selected state.
                   */
                  className={
                    "card-hover group flex w-full cursor-pointer flex-col overflow-hidden " +
                    "rounded-[var(--radius-lg)] border-2 text-left transition-all " +
                    (isSelected
                      ? "border-primary bg-primary/5 shadow-[0_0_0_4px_rgb(87_173_222/0.15)]"
                      : "border-hairline bg-canvas hover:border-primary/40 hover:shadow-soft")
                  }
                >
                  <div className="relative aspect-square w-full overflow-hidden bg-surface-1">
                    <Image
                      src={candidate.photo_url}
                      alt=""
                      fill
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 280px"
                      className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                    />
                    <div
                      className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink/10 via-transparent to-transparent"
                      aria-hidden="true"
                    />
                    {isSelected ? (
                      <span className="absolute right-2.5 top-2.5 flex h-7 w-7 items-center justify-center rounded-full bg-[image:var(--gradient-brand)] text-sm text-white shadow-soft">
                        ✓
                      </span>
                    ) : null}
                  </div>

                  <div className="flex flex-1 flex-col gap-0.5 p-4">
                    <span className="truncate text-body font-semibold text-ink">
                      {candidate.display_name}
                    </span>
                    {candidate.tagline ? (
                      <span className="line-clamp-2 text-caption text-ink-muted">
                        {candidate.tagline}
                      </span>
                    ) : null}
                    {candidate.department_code ? (
                      <span className="mt-2 inline-block w-fit rounded-full bg-surface-2 px-2.5 py-1 text-caption font-medium text-ink-subtle">
                        {candidate.department_code}
                      </span>
                    ) : null}
                  </div>
                </button>
              </li>
            );
          })}
        </ul>

        <div className="mt-7 border-t border-hairline pt-6">
          {confirming && selected ? (
            <form action={formAction} className="flex flex-col gap-3 rounded-2xl bg-surface-1 p-5">
              <input type="hidden" name="categoryId" value={categoryId} />
              <input type="hidden" name="candidateId" value={selected.id} />
              <p className="text-body font-semibold text-ink">
                Cast your vote for {selected.display_name}?
              </p>
              <p className="text-body-sm text-ink-muted">
                This is final. You get one vote in {categoryName}, and it can&rsquo;t
                be changed or withdrawn afterwards.
              </p>
              <div className="flex flex-wrap gap-3 pt-1">
                <Confirm name={selected.display_name} />
                <Button type="button" variant="ghost" onClick={() => setConfirming(false)}>
                  Go back
                </Button>
              </div>
            </form>
          ) : (
            <Button
              type="button"
              disabled={!selected}
              onClick={() => setConfirming(true)}
              className="!min-h-14 !px-7"
            >
              {selected ? `Continue with ${selected.display_name}` : "Select a candidate"}
            </Button>
          )}
        </div>
      </div>
    </section>
  );
}