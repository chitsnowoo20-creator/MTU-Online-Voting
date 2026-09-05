"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import {
  addAward,
  addCategory,
  deleteAward,
  deleteCategory,
  type BallotState,
} from "./actions";
import { Button } from "@/components/ui/button";
import { TextInput } from "@/components/ui/field";
import { FormError } from "@/components/ui/tile";

type Award = { id: string; rank: number; label: string };
type Category = { id: string; name: string; awards: Award[] };

/**
 * Destructive row actions. Bare text gave a target the width of the word; this
 * is the same treatment the other staff row actions use.
 */
const ROW_ACTION =
  "-mr-2.5 inline-flex min-h-11 cursor-pointer items-center rounded-lg px-2.5 " +
  "text-caption text-error-ink transition-colors hover:bg-error-bg lg:min-h-8";

function PendingButton({
  label,
  variant = "primary",
  className = "",
}: {
  label: string;
  variant?: "primary" | "tertiary" | "ghost";
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant={variant} disabled={pending} className={className}>
      {pending ? "Saving…" : label}
    </Button>
  );
}

function AwardRows({
  electionId,
  category,
}: {
  electionId: string;
  category: Category;
}) {
  const [addState, addAction] = useActionState<BallotState, FormData>(
    addAward,
    {},
  );
  const [, removeAction] = useActionState<BallotState, FormData>(
    deleteAward,
    {},
  );

  const nextRank =
    category.awards.reduce((max, award) => Math.max(max, award.rank), 0) + 1;

  return (
    <div className="flex flex-col gap-3">
      <p className="text-caption text-ink-muted">Awards — rank to title</p>

      {category.awards.length === 0 ? (
        <p className="text-body-sm text-ink-subtle">
          No awards yet. Rank 1 is the top award.
        </p>
      ) : (
        <ul className="flex flex-col">
          {category.awards
            .slice()
            .sort((a, b) => a.rank - b.rank)
            .map((award) => (
              <li
                key={award.id}
                className="flex items-center justify-between gap-4 border-b border-hairline py-2 text-body-sm last:border-b-0"
              >
                <span>
                  <span className="text-ink-muted">Rank {award.rank}</span>
                  {" · "}
                  {award.label}
                </span>
                <form action={removeAction}>
                  <input type="hidden" name="awardId" value={award.id} />
                  <input type="hidden" name="electionId" value={electionId} />
                  <button
                    type="submit"
                    className={ROW_ACTION}
                  >
                    Remove
                  </button>
                </form>
              </li>
            ))}
        </ul>
      )}

      {addState.error ? <FormError>{addState.error}</FormError> : null}

      <form action={addAction} className="flex flex-wrap items-end gap-3">
        <input type="hidden" name="categoryId" value={category.id} />
        <input type="hidden" name="electionId" value={electionId} />
        <div className="w-20">
          <label
            htmlFor={`rank-${category.id}`}
            className="mb-1.5 block text-caption text-ink-muted"
          >
            Rank
          </label>
          <TextInput
            id={`rank-${category.id}`}
            name="rank"
            type="number"
            min={1}
            defaultValue={nextRank}
            key={nextRank}
          />
        </div>
        {/* Capped: the card is full width now, an award title is not. */}
        <div className="min-w-[180px] max-w-[420px] flex-1">
          <label
            htmlFor={`label-${category.id}`}
            className="mb-1.5 block text-caption text-ink-muted"
          >
            Title
          </label>
          <TextInput
            id={`label-${category.id}`}
            name="label"
            placeholder="King"
          />
        </div>
        <PendingButton label="Add award" variant="tertiary" />
      </form>
    </div>
  );
}

export function CategoryEditor({
  electionId,
  categories,
}: {
  electionId: string;
  categories: Category[];
}) {
  const [addState, addAction] = useActionState<BallotState, FormData>(
    addCategory,
    {},
  );
  const [removeState, removeAction] = useActionState<BallotState, FormData>(
    deleteCategory,
    {},
  );

  return (
    <div className="flex flex-col gap-6">
      {categories.map((category) => (
        <div key={category.id} className="surface-card overflow-hidden">
          <div className="flex items-center justify-between gap-4 border-b border-hairline px-6 py-4">
            <h2 className="text-card-title">{category.name}</h2>
            <form action={removeAction}>
              <input type="hidden" name="categoryId" value={category.id} />
              <input type="hidden" name="electionId" value={electionId} />
              <button
                type="submit"
                className={ROW_ACTION}
              >
                Delete category
              </button>
            </form>
          </div>
          <div className="px-6 py-6">
            <AwardRows electionId={electionId} category={category} />
          </div>
        </div>
      ))}

      {removeState.error ? <FormError>{removeState.error}</FormError> : null}

      <div className="surface-card px-6 py-6">
        {addState.error ? <FormError>{addState.error}</FormError> : null}
        {/*
          * Same framed cell as the audit filters: the label lives inside the
          * cell above a borderless control, so the field reads as one object
          * and the whole 64px cell is the tap target. `items-stretch` lets the
          * button match the field's height without a hard-coded value.
          */}
        <form action={addAction} className="flex flex-wrap items-stretch gap-3">
          <input type="hidden" name="electionId" value={electionId} />
          <label
            htmlFor="new-category"
            className="flex min-w-[220px] max-w-[520px] flex-1 cursor-pointer flex-col justify-center rounded-2xl border border-hairline bg-canvas px-5 py-2.5 shadow-soft transition-colors focus-within:border-primary"
          >
            <span className="text-caption text-ink-muted">
              New category name
            </span>
            <input
              id="new-category"
              name="name"
              placeholder="Male"
              autoComplete="off"
              className="w-full bg-transparent text-body text-ink outline-none placeholder:text-ink-subtle"
            />
          </label>
          <PendingButton label="Add category" className="!rounded-2xl !px-6" />
        </form>
        <p className="mt-3 text-caption text-ink-muted">
          Category names are free text — whatever this election calls them.
        </p>
      </div>
    </div>
  );
}
