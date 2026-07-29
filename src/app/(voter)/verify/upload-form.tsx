"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";

import { submitVerification } from "./actions";
import { Button } from "@/components/ui/button";
import { FormError } from "@/components/ui/tile";
import { createClient } from "@/lib/supabase/client";
import {
  ID_CARD_MAX_BYTES,
  ID_CARD_MIME_TYPES,
} from "@/lib/validation/verification";

export function UploadForm({ userId }: { userId: string }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [pending, startTransition] = useTransition();

  const busy = uploading || pending;

  function choose(next: File | null) {
    setError(null);
    if (!next) return setFile(null);

    if (!ID_CARD_MIME_TYPES.includes(next.type)) {
      setFile(null);
      return setError("That file isn't a JPG, PNG or WebP image.");
    }
    if (next.size > ID_CARD_MAX_BYTES) {
      setFile(null);
      return setError("That image is over 5 MB. Try a smaller photo.");
    }
    setFile(next);
  }

  async function submit() {
    if (!file) return;
    setError(null);
    setUploading(true);

    /*
     * Uploaded from the browser under the user's own session — the id-cards
     * insert policy only permits a path beginning with their own uid, so a
     * bug here cannot write into someone else's folder.
     */
    const supabase = createClient();
    const extension = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
    const path = `${userId}/${crypto.randomUUID()}.${extension}`;

    const { error: uploadError } = await supabase.storage
      .from("id-cards")
      .upload(path, file, { contentType: file.type, upsert: false });

    setUploading(false);

    if (uploadError) {
      return setError(`Upload failed: ${uploadError.message}`);
    }

    startTransition(async () => {
      const result = await submitVerification(path);
      if (result.error) setError(result.error);
      else router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-6">
      {error ? <FormError>{error}</FormError> : null}

      <div
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          choose(event.dataTransfer.files[0] ?? null);
        }}
        className="flex flex-col items-center gap-3 border border-dashed border-hairline bg-surface-1 px-6 py-10 text-center"
      >
        <p className="text-body text-ink">Drag and drop the photo here</p>
        <p className="text-caption text-ink-muted">JPG, PNG or WebP · max 5 MB</p>
        <input
          ref={inputRef}
          type="file"
          accept={ID_CARD_MIME_TYPES.join(",")}
          className="hidden"
          onChange={(event) => choose(event.target.files?.[0] ?? null)}
        />
        <Button
          type="button"
          variant="tertiary"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
        >
          Choose file
        </Button>
        {file ? (
          <p className="text-body-sm text-ink">{file.name}</p>
        ) : (
          <p className="text-body-sm text-ink-subtle">No file selected</p>
        )}
      </div>

      <p className="text-caption text-ink-muted">
        Your image is visible only to a reviewer, and is deleted immediately
        after their decision. Nothing but the decision itself is kept.
      </p>

      <Button type="button" onClick={submit} disabled={!file || busy}>
        {uploading
          ? "Uploading…"
          : pending
            ? "Submitting…"
            : "Submit for review"}
      </Button>
    </div>
  );
}
