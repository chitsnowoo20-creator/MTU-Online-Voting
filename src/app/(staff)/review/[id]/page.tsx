import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { DecisionForm } from "./decision-form";
import { IdCardViewer } from "./id-card-viewer";
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
        .createSignedUrl(submission.id_card_path, 300)
    : { data: null };

  return (
    <main className="surface-page flex-1 px-4 py-8 sm:py-12 lg:py-16">
      <div className="mx-auto w-full max-w-[1060px]">
        <p className="mb-4 text-body-sm">
          <Link href="/review">← Verification queue</Link>
        </p>

        <div className="surface-panel overflow-hidden">
          <div className="relative overflow-hidden border-b border-hairline bg-gradient-to-br from-canvas via-canvas to-primary/10 px-6 py-6 sm:px-8 sm:py-7">
            <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-primary/10 blur-3xl" />
            <div className="relative flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
              <div>
                <p className="eyebrow-label">Identity verification</p>
                <h1 className="mt-1 text-headline">Review submission</h1>
                <p className="mt-2 text-body text-ink-muted">
                  Confirm the details for{" "}
                  <span className="font-semibold text-ink">
                    {submission.full_name}
                  </span>
                  .
                </p>
              </div>
              <div className="rounded-xl border border-hairline bg-canvas/85 px-4 py-3 shadow-soft sm:min-w-60">
                <p className="text-caption font-semibold uppercase tracking-[0.12em] text-ink-subtle">
                  Submitted by
                </p>
                <p className="mt-0.5 break-all text-body-sm font-medium text-ink">
                  {submission.email}
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-px bg-hairline lg:grid-cols-[1.05fr_0.95fr]">
            <section className="surface-card p-5 sm:p-7">
              <div className="mb-5 flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/12 text-caption font-bold text-brand-ink">1</span>
                <div>
                  <h2 className="text-subhead">Check identification</h2>
                  <p className="text-caption text-ink-muted">Inspect the submitted card before deciding.</p>
                </div>
              </div>
              <IdCardViewer
                submissionId={submission.submission_id!}
                fullName={submission.full_name ?? ""}
                initialUrl={signed?.signedUrl ?? null}
              />
            </section>

            <section className="surface-card p-5 sm:p-7">
              <div className="mb-5 flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/12 text-caption font-bold text-brand-ink">2</span>
                <div>
                  <h2 className="text-subhead">Record your decision</h2>
                  <p className="text-caption text-ink-muted">Approval creates the voter account immediately.</p>
                </div>
              </div>
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
