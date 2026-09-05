"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useActionState, useRef, useState, useTransition } from "react";

import {
  addCandidate,
  deleteCandidate,
  type CandidateState,
} from "./actions";
import { Button } from "@/components/ui/button";
import { Field, TextInput } from "@/components/ui/field";
import { FormError } from "@/components/ui/tile";
import { createClient } from "@/lib/supabase/client";
import {
  CANDIDATE_PHOTO_MAX_BYTES,
  CANDIDATE_PHOTO_MIME_TYPES,
} from "@/lib/validation/election";

type Department = { code: string; name: string };
type Candidate = {
  id: string;
  display_name: string;
  tagline: string | null;
  department_code: string | null;
  photo_path: string;
  photo_url: string;
};
type Category = { id: string; name: string; candidates: Candidate[] };

export function CandidateManager({
  electionId,
  categories,
  departments,
}: {
  electionId: string;
  categories: Category[];
  departments: Department[];
}) {
  const router = useRouter();
  const [activeId, setActiveId] = useState(categories[0]?.id ?? "");
  const active = categories.find((category) => category.id === activeId);

  const fileRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [, startTransition] = useTransition();
  const [removeState, removeAction] = useActionState<CandidateState, FormData>(
    deleteCandidate,
    {},
  );

  if (categories.length === 0) {
    return (
      <div className="surface-card px-6 py-12 text-center">
        <p className="text-body text-ink-muted">
          Add a category first — every candidate belongs to exactly one.
        </p>
      </div>
    );
  }

  function chooseFile(next: File | null) {
    setError(null);
    if (!next) return setFile(null);
    if (!CANDIDATE_PHOTO_MIME_TYPES.includes(next.type)) {
      setFile(null);
      return setError("That file isn't a JPG, PNG or WebP image.");
    }
    if (next.size > CANDIDATE_PHOTO_MAX_BYTES) {
      setFile(null);
      return setError("That image is over 5 MB.");
    }
    setFile(next);
  }

  async function submit(formData: FormData) {
    setError(null);
    setFieldErrors({});

    if (!file) return setError("A photo is required on every candidate card.");

    setBusy(true);
    const supabase = createClient();
    const extension = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
    const path = `${electionId}/${crypto.randomUUID()}.${extension}`;

    const { error: uploadError } = await supabase.storage
      .from("candidate-photos")
      .upload(path, file, { contentType: file.type, upsert: false });

    if (uploadError) {
      setBusy(false);
      return setError(`Upload failed: ${uploadError.message}`);
    }

    formData.set("photoPath", path);
    const result = await addCandidate({}, formData);
    setBusy(false);

    if (result.error) return setError(result.error);
    if (result.fieldErrors) return setFieldErrors(result.fieldErrors);

    formRef.current?.reset();
    setFile(null);
    startTransition(() => router.refresh());
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap border-b border-hairline">
        {categories.map((category) => (
          <button
            key={category.id}
            type="button"
            onClick={() => setActiveId(category.id)}
            className={
              "cursor-pointer px-5 py-4 text-body-sm " +
              (category.id === activeId
                ? "border-b-2 border-primary text-ink"
                : "text-ink-muted")
            }
          >
            {category.name}
            <span className="ml-2 text-caption text-ink-subtle">
              {category.candidates.length}
            </span>
          </button>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-[300px_1fr]">
        <form
          ref={formRef}
          action={submit}
          className="surface-card flex flex-col gap-5 p-6"
        >
          <h2 className="text-card-title">Add candidate card</h2>
          <input type="hidden" name="categoryId" value={activeId} />
          <input type="hidden" name="electionId" value={electionId} />

          {error ? <FormError>{error}</FormError> : null}

          <div className="flex flex-col gap-2">
            <span className="text-caption text-ink-muted">
              Photo — required
            </span>
            <input
              ref={fileRef}
              type="file"
              accept={CANDIDATE_PHOTO_MIME_TYPES.join(",")}
              className="hidden"
              onChange={(event) => chooseFile(event.target.files?.[0] ?? null)}
            />
            <Button
              type="button"
              variant="tertiary"
              onClick={() => fileRef.current?.click()}
            >
              Choose photo
            </Button>
            <span className="text-caption text-ink-subtle">
              {file ? file.name : "No photo selected"}
            </span>
          </div>

          <Field
            label="Display name"
            htmlFor="displayName"
            error={fieldErrors.displayName}
          >
            <TextInput
              id="displayName"
              name="displayName"
              placeholder="Tunde Adeyemi"
              invalid={Boolean(fieldErrors.displayName)}
            />
          </Field>

          <Field label="Tagline" htmlFor="tagline" error={fieldErrors.tagline}>
            <TextInput
              id="tagline"
              name="tagline"
              placeholder="Robotics club lead"
            />
          </Field>

          <Field
            label="Department"
            htmlFor="departmentCode"
            error={fieldErrors.departmentCode}
          >
            <select
              id="departmentCode"
              name="departmentCode"
              defaultValue=""
              className="w-full rounded-xl border border-hairline bg-canvas px-4 py-3 text-body text-ink shadow-[inset_0_1px_2px_rgb(20_32_51/0.03)] outline-none transition-all focus:border-primary focus:ring-4 focus:ring-primary/10"
            >
              <option value="">No department</option>
              {departments.map((department) => (
                <option key={department.code} value={department.code}>
                  {department.code} — {department.name}
                </option>
              ))}
            </select>
          </Field>

          <Button type="submit" disabled={busy}>
            {busy ? "Saving…" : "Save candidate"}
          </Button>
        </form>

        <div>
          {removeState.error ? (
            <div className="mb-3">
              <FormError>{removeState.error}</FormError>
            </div>
          ) : null}

          <p className="mb-3 text-body-sm text-ink-muted">
            {active?.candidates.length ?? 0} card
            {active?.candidates.length === 1 ? "" : "s"} in {active?.name}
          </p>

          {active && active.candidates.length > 0 ? (
            /*
             * A real card grid. This was `gap-px bg-hairline` — the seam trick
             * where cells butt together and the background shows through as
             * 1px rules. That only works with square, borderless cells; once
             * `surface-card` gained a radius the hairline showed as grey blocks
             * between the cards and across any empty column.
             */
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {active.candidates.map((candidate) => (
                <li
                  key={candidate.id}
                  className="surface-card card-hover group flex flex-col overflow-hidden"
                >
                  {/* Photo bleeds to the card edges and is clipped by its
                      radius, rather than sitting square inside padding. */}
                  <div className="relative aspect-square w-full overflow-hidden bg-surface-1">
                    <Image
                      src={candidate.photo_url}
                      alt={candidate.display_name}
                      fill
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 280px"
                      className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                    />
                  </div>

                  <div className="flex flex-1 flex-col gap-0.5 p-4">
                    <p className="truncate text-body-sm font-semibold text-ink">
                      {candidate.display_name}
                    </p>
                    {candidate.tagline ? (
                      <p className="line-clamp-2 text-caption text-ink-muted">
                        {candidate.tagline}
                      </p>
                    ) : null}

                    <form action={removeAction} className="mt-3 flex">
                      <input
                        type="hidden"
                        name="candidateId"
                        value={candidate.id}
                      />
                      <input
                        type="hidden"
                        name="electionId"
                        value={electionId}
                      />
                      <input
                        type="hidden"
                        name="photoPath"
                        value={candidate.photo_path}
                      />
                      <button
                        type="submit"
                        className="-ml-2.5 inline-flex min-h-11 cursor-pointer items-center rounded-lg px-2.5 text-caption text-error-ink transition-colors hover:bg-error-bg lg:min-h-8"
                      >
                        Remove
                      </button>
                    </form>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="surface-card px-6 py-12 text-center text-body-sm text-ink-muted">
              No candidates in this category yet.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
