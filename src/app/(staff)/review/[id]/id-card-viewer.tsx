"use client";

import { useActionState, useEffect, useState } from "react";

import { refreshIdCardUrl, type IdCardUrlState } from "../actions";
import { Button } from "@/components/ui/button";
import { FormError } from "@/components/ui/tile";

const TTL_SECONDS = 300;

export function IdCardViewer({
  submissionId,
  fullName,
  initialUrl,
}: {
  submissionId: string;
  fullName: string;
  initialUrl: string | null;
}) {
  const [url, setUrl] = useState(initialUrl);
  const [secondsLeft, setSecondsLeft] = useState(TTL_SECONDS);
  const [state, refreshAction] = useActionState<IdCardUrlState, FormData>(
    refreshIdCardUrl,
    {},
  );

  useEffect(() => {
    if (!url) return;
    setSecondsLeft(TTL_SECONDS);
    const timer = window.setInterval(() => {
      setSecondsLeft((value) => (value > 0 ? value - 1 : 0));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [url]);

  useEffect(() => {
    if (state.signedUrl) setUrl(state.signedUrl);
  }, [state.signedUrl]);

  function refresh() {
    const formData = new FormData();
    formData.set("submissionId", submissionId);
    refreshAction(formData);
  }

  const expired = secondsLeft === 0;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-caption text-ink-muted">Uploaded ID card</p>
        {url ? (
          <p className="text-caption text-ink-subtle">
            {expired
              ? "Link expired — refresh to view again"
              : `Link expires in ${Math.floor(secondsLeft / 60)}:${String(secondsLeft % 60).padStart(2, "0")}`}
          </p>
        ) : null}
      </div>
      <p className="mt-1 text-caption text-ink-subtle">
        Deleted immediately after your decision.
      </p>

      {state.error ? (
        <div className="mt-3">
          <FormError>{state.error}</FormError>
        </div>
      ) : null}

      <div className="mt-4 overflow-hidden rounded-2xl border border-hairline bg-surface-1 shadow-soft">
        {url && !expired ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={url}
            alt={`ID card submitted by ${fullName}`}
            className="h-auto w-full"
          />
        ) : (
          <div className="flex flex-col items-center gap-3 px-6 py-10 text-center">
            <p className="text-body-sm text-ink-muted">
              {url
                ? "The preview link has expired."
                : "The image is no longer available."}
            </p>
            <Button type="button" variant="tertiary" onClick={refresh}>
              Refresh image
            </Button>
          </div>
        )}
      </div>

      {url && !expired ? (
        <div className="mt-3">
          <Button type="button" variant="ghost" onClick={refresh}>
            Refresh image
          </Button>
        </div>
      ) : null}
    </div>
  );
}
