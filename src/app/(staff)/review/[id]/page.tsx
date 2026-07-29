import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { DecisionForm } from "./decision-form";
import { requireRole } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Review submission · Campus Elections",
};

// A signed URL is minted per request, so this page must never be cached.
export const dynamic = "force-dynamic";

export default async function ReviewDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole(["REVIEWER"], "/review");
  const { id } = await params;

  const supabase = await createClient();

  const [{ data: submission }, { data: departments }] = await Promise.all([
    supabase
      .from("verification_queue")
      .select("submission_id, full_name, email, id_card_path, submitted_at")
      .eq("submission_id", id)
      .maybeSingle(),
    supabase
      .from("departments")
      .select("code, name")
      .eq("active", true)
      .order("code"),
  ]);

  // The view only returns PENDING rows, so a decided submission 404s here —
  // which is the behaviour we want: there is nothing left to look at.
  if (!submission) notFound();

  const { data: signed } = submission.id_card_path
    ? await supabase.storage
        .from("id-cards")
        .createSignedUrl(submission.id_card_path, 60)
    : { data: null };

  return (
    <main className="flex-1 bg-surface-1 px-4 py-16">
      <div className="mx-auto w-full max-w-[880px]">
        <p className="mb-4 text-body-sm">
          <Link href="/review">← Verification queue</Link>
        </p>

        <div className="border border-hairline bg-canvas">
          <div className="flex items-baseline justify-between gap-4 border-b border-hairline px-6 py-4">
            <div>
              <h1 className="text-card-title">Review submission</h1>
              <p className="text-body-sm text-ink-muted">
                {submission.full_name}
              </p>
            </div>
            <span className="text-body-sm text-ink-muted">
              {submission.email}
            </span>
          </div>

          <div className="grid gap-px bg-hairline md:grid-cols-2">
            <section className="bg-canvas p-6">
              <p className="text-caption text-ink-muted">Uploaded ID card</p>
              <p className="mt-1 text-caption text-ink-subtle">
                Link expires in 60 seconds. Deleted immediately after your
                decision.
              </p>
              <div className="mt-4 border border-hairline bg-surface-1">
                {signed?.signedUrl ? (
                  /*
                   * A plain <img>, not next/image, on purpose: the image
                   * optimizer writes optimized copies into .next/cache, which
                   * would keep an ID card on disk after we deleted the
                   * original (invariant 6).
                   */
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={signed.signedUrl}
                    alt={`ID card submitted by ${submission.full_name}`}
                    className="h-auto w-full"
                  />
                ) : (
                  <p className="p-6 text-body-sm text-ink-muted">
                    The image is no longer available.
                  </p>
                )}
              </div>
            </section>

            <section className="bg-canvas p-6">
              <DecisionForm
                submissionId={submission.submission_id!}
                fullName={submission.full_name ?? ""}
                departments={departments ?? []}
              />
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}
