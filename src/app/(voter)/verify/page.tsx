import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { UploadForm } from "./upload-form";
import { Tag } from "@/components/ui/tag";
import { requireUser } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Verify identity · Campus Elections",
};

function Panel({
  title,
  status,
  children,
}: {
  title: string;
  status?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="surface-panel">
      <div className="flex items-center justify-between gap-4 border-b border-hairline px-6 py-4">
        <h1 className="text-card-title">{title}</h1>
        {status}
      </div>
      <div className="px-6 py-6">{children}</div>
    </div>
  );
}

export default async function VerifyPage() {
  const user = await requireUser("/verify");

  // FR-3: verification is gated on email confirmation, and on nothing else.
  if (!user.emailConfirmedAt) {
    redirect(`/confirm?email=${encodeURIComponent(user.email ?? "")}`);
  }
  if (user.voterStatus === "APPROVED") redirect("/account");

  const supabase = await createClient();
  const { data: submission } = await supabase
    .from("verification_submissions")
    .select("status, rejection_reason, submitted_at, decided_at")
    .order("submitted_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (
    <main className="flex flex-1 justify-center bg-surface-1 px-4 py-16">
      <div className="w-full max-w-[560px]">
        {user.voterStatus === "PENDING" ? (
          <Panel title="Submitted" status={<Tag tone="pending">Pending</Tag>}>
            <p className="text-body text-ink-muted">
              A reviewer will check your ID shortly. We&rsquo;ll email{" "}
              <span className="text-ink">{user.email}</span> as soon as
              there&rsquo;s a decision.
            </p>
            <dl className="mt-6 flex flex-col gap-3 border-t border-hairline pt-6 text-body-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-ink-muted">Submitted</dt>
                <dd>
                  {submission?.submitted_at
                    ? new Date(submission.submitted_at).toLocaleString("en-GB", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })
                    : "—"}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-ink-muted">Your image</dt>
                <dd>Deleted on decision</dd>
              </div>
            </dl>
            <p className="mt-6 text-caption text-ink-muted">
              You can close this page — nothing else is needed from you.
            </p>
          </Panel>
        ) : (
          <Panel
            title={
              user.voterStatus === "REJECTED" ? "Try again" : "Verify identity"
            }
            status={
              user.voterStatus === "REJECTED" ? (
                <Tag tone="error">Not approved</Tag>
              ) : undefined
            }
          >
            {user.voterStatus === "REJECTED" && submission?.rejection_reason ? (
              <div className="mb-6 border-l-2 border-error bg-error-bg px-4 py-3">
                <p className="text-body-sm text-ink">Reason from reviewer</p>
                <p className="mt-1 text-body-sm text-ink-muted">
                  {submission.rejection_reason}
                </p>
              </div>
            ) : null}

            <p className="mb-6 text-body text-ink-muted">
              Upload a clear photo of your student or staff ID card. A reviewer
              records your registration number or generates your staff username,
              then the image is deleted.
            </p>

            <UploadForm userId={user.id} />
          </Panel>
        )}

        <p className="mt-4 text-body-sm text-ink-muted">
          <Link href="/account">Back to your status</Link>
        </p>
      </div>
    </main>
  );
}
