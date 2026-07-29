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
          <div className="min-w-[200px] flex-1">
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
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="cursor-pointer text-caption text-primary"
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
              className="cursor-pointer text-caption text-ink-muted"
            >
              {department.active ? "Deactivate" : "Reactivate"}
            </button>
          </form>
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
      <div className="border border-hairline bg-canvas">
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

      <div className="border border-hairline bg-canvas px-6 py-6">
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
          <div className="min-w-[220px] flex-1">
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
