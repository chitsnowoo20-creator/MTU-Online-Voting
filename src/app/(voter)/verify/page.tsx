import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { UploadForm } from "./upload-form";
import { DashboardPage, RailCard } from "@/components/ui/dashboard-page";
import { Tag } from "@/components/ui/tag";
import { requireUser } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Verify identity · Campus Elections",
};

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

  const back = { href: "/account", label: "Back to your status" };
  const rejected = user.voterStatus === "REJECTED";

  if (user.voterStatus === "PENDING") {
    return (
      <DashboardPage
        eyebrow="Identity verification"
        title="Submitted"
        subtitle="Your ID card is with a reviewer."
        status={<Tag tone="pending">Pending</Tag>}
        back={back}
        rail={
          <RailCard title="Submission">
            <dl className="flex flex-col gap-3 text-body-sm">
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
          </RailCard>
        }
      >
        <section className="surface-panel px-6 py-6">
          <p className="text-body text-ink-muted">
            A reviewer will check your ID shortly. We&rsquo;ll email{" "}
            <span className="text-ink">{user.email}</span> as soon as
            there&rsquo;s a decision.
          </p>
          <p className="mt-6 text-caption text-ink-muted">
            You can close this page — nothing else is needed from you.
          </p>
        </section>
      </DashboardPage>
    );
  }

  return (
    <DashboardPage
      eyebrow="Identity verification"
      title={rejected ? "Try again" : "Verify identity"}
      subtitle="Upload a clear photo of your student or staff ID card. A reviewer records your registration number or generates your staff username, then the image is deleted."
      status={rejected ? <Tag tone="error">Not approved</Tag> : undefined}
      back={back}
      /*
       * A first-time upload has nothing secondary to show, so the shell drops
       * to a single column rather than parking an empty rail beside the form.
       */
      rail={
        rejected && submission?.rejection_reason ? (
          <RailCard title="Reason from reviewer">
            <p className="text-body-sm text-ink-muted">
              {submission.rejection_reason}
            </p>
          </RailCard>
        ) : undefined
      }
    >
      <section className="surface-panel px-6 py-6">
        <UploadForm userId={user.id} />
      </section>
    </DashboardPage>
  );
}
