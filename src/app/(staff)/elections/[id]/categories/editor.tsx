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

function PendingButton({
  label,
  variant = "primary",
}: {
  label: string;
  variant?: "primary" | "tertiary" | "ghost";
}) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant={variant} disabled={pending}>
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
                    className="cursor-pointer text-caption text-error-ink"
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
        <div className="min-w-[180px] flex-1">
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
        <div key={category.id} className="border border-hairline bg-canvas">
          <div className="flex items-center justify-between gap-4 border-b border-hairline px-6 py-4">
            <h2 className="text-card-title">{category.name}</h2>
            <form action={removeAction}>
              <input type="hidden" name="categoryId" value={category.id} />
              <input type="hidden" name="electionId" value={electionId} />
              <button
                type="submit"
                className="cursor-pointer text-caption text-error-ink"
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

      <div className="border border-hairline bg-canvas px-6 py-6">
        {addState.error ? <FormError>{addState.error}</FormError> : null}
        <form action={addAction} className="flex flex-wrap items-end gap-3">
          <input type="hidden" name="electionId" value={electionId} />
          <div className="min-w-[220px] flex-1">
            <label
              htmlFor="new-category"
              className="mb-1.5 block text-caption text-ink-muted"
            >
              New category name
            </label>
            <TextInput
              id="new-category"
              name="name"
              placeholder="Male"
              autoComplete="off"
            />
          </div>
          <PendingButton label="Add category" />
        </form>
        <p className="mt-3 text-caption text-ink-muted">
          Category names are free text — whatever this election calls them.
        </p>
      </div>
    </div>
  );
}
