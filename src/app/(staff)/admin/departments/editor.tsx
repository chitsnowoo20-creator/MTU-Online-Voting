"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";

import {
  addDepartment,
  renameDepartment,
  setDepartmentActive,
  type DepartmentState,
} from "./actions";
import { Button } from "@/components/ui/button";
import { TextInput } from "@/components/ui/field";
import { Tag } from "@/components/ui/tag";
import { FormError } from "@/components/ui/tile";

export type Department = { code: string; name: string; active: boolean };

/**
 * Row actions.
 *
 * These were bare text with no padding, no hover and a hit target the size of
 * the word itself. Same colours and sizes as before — what is added is a real
 * target, a rounded hover fill, and a grouped cluster so the pair reads as this
 * row's controls rather than as two stray links.
 */
const ROW_ACTION =
  "inline-flex cursor-pointer items-center rounded-lg px-2.5 text-caption " +
  // 44px tall for touch; the tighter box is fine once there is a pointer.
  "min-h-11 transition-colors lg:min-h-8";

function Pending({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="tertiary" disabled={pending}>
      {pending ? "Saving…" : label}
    </Button>
  );
}

function Row({ department }: { department: Department }) {
  const [editing, setEditing] = useState(false);
  const [renameState, renameAction] = useActionState<DepartmentState, FormData>(
    renameDepartment,
    {},
  );
  const [activeState, activeAction] = useActionState<DepartmentState, FormData>(
    setDepartmentActive,
    {},
  );

  const error = renameState.error ?? activeState.error;

  return (
    <li className="border-b border-hairline px-6 py-4 last:border-b-0">
      {error ? (
        <div className="mb-3">
          <FormError>{error}</FormError>
        </div>
      ) : null}

      {editing ? (
        <form
          action={renameAction}
          onSubmit={() => setEditing(false)}
          className="flex flex-wrap items-end gap-3"
        >
          <input type="hidden" name="code" value={department.code} />
          <span className="min-w-16 pb-3 text-body-sm text-ink-muted">
            {department.code}
          </span>
          {/* Capped: the card is full width now, and a department name
              does not need a 900px input. */}
          <div className="min-w-[200px] max-w-[420px] flex-1">
            <TextInput
              name="name"
              defaultValue={department.name}
              aria-label={`Full name for ${department.code}`}
            />
          </div>
          <Pending label="Save" />
          <Button
            type="button"
            variant="ghost"
            onClick={() => setEditing(false)}
          >
            Cancel
          </Button>
        </form>
      ) : (
        <div className="flex flex-wrap items-center gap-3">
          <span className="min-w-16 text-body-sm text-ink">
            {department.code}
          </span>
          <span className="flex-1 text-body-sm text-ink-muted">
            {department.name}
          </span>
          {department.active ? null : <Tag tone="locked">Inactive</Tag>}
          {/* `-mr-1.5` pulls the cluster's padding back so the last action's
              text still lines up with the row's own right edge. */}
          <div className="-mr-1.5 flex items-center gap-1">
            <button
              type="button"
              onClick={() => setEditing(true)}
              className={`${ROW_ACTION} text-brand-ink hover:bg-primary/8`}
            >
              Edit
            </button>
            <form action={activeAction}>
              <input type="hidden" name="code" value={department.code} />
              <input
                type="hidden"
                name="active"
                value={String(!department.active)}
              />
              <button
                type="submit"
                className={`${ROW_ACTION} text-ink-muted hover:bg-surface-2 hover:text-ink`}
              >
                {department.active ? "Deactivate" : "Reactivate"}
              </button>
            </form>
          </div>
        </div>
      )}
    </li>
  );
}

export function DepartmentEditor({
  departments,
}: {
  departments: Department[];
}) {
  const [addState, addAction] = useActionState<DepartmentState, FormData>(
    addDepartment,
    {},
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="surface-panel">
        <div className="border-b border-hairline px-6 py-4">
          <h2 className="text-card-title">Departments</h2>
          <p className="text-body-sm text-ink-muted">
            {departments.filter((d) => d.active).length} active
          </p>
        </div>
        <ul>
          {departments.map((department) => (
            <Row key={department.code} department={department} />
          ))}
        </ul>
      </div>

      <div className="surface-card px-6 py-6">
        {addState.error ? <FormError>{addState.error}</FormError> : null}
        <form action={addAction} className="mt-3 flex flex-wrap items-end gap-3">
          <div className="w-32">
            <label
              htmlFor="code"
              className="mb-1.5 block text-caption text-ink-muted"
            >
              Code
            </label>
            <TextInput id="code" name="code" placeholder="CEIT" autoComplete="off" />
          </div>
          <div className="min-w-[220px] max-w-[480px] flex-1">
            <label
              htmlFor="name"
              className="mb-1.5 block text-caption text-ink-muted"
            >
              Full name
            </label>
            <TextInput
              id="name"
              name="name"
              placeholder="Computer Engineering & Information Technology"
              autoComplete="off"
            />
          </div>
          <Pending label="Add" />
        </form>
        <p className="mt-3 text-caption text-ink-muted">
          Codes appear on candidate cards and in generated staff usernames, so
          keep them short. Departments are deactivated rather than deleted —
          existing identity records still point at them.
        </p>
      </div>
    </div>
  );
}
