import type { Metadata } from "next";
import Link from "next/link";

import { StaffPage } from "@/components/staff/shell";
import { requireRole } from "@/lib/auth/guards";

export const metadata: Metadata = { title: "Admin · Campus Elections" };

const SECTIONS = [
  {
    href: "/admin/roles",
    title: "Roles",
    detail:
      "Grant and revoke reviewer, officer and admin access. Voting rights are not granted here — every approved user can already vote.",
  },
  {
    href: "/admin/departments",
    title: "Departments",
    detail:
      "The codes used on candidate cards and in generated staff usernames.",
  },
  {
    href: "/admin/audit",
    title: "Audit log",
    detail:
      "Every privileged action, append-only. Read-only by design — nothing can edit it.",
  },
];

export default async function AdminPage() {
  await requireRole(["ADMIN"], "/admin");

  return (
    <StaffPage title="Admin" subtitle="Roles, departments and the audit trail">
      <ul className="grid gap-4 sm:grid-cols-3">
        {SECTIONS.map((section, index) => (
          <li key={section.href} className="surface-card card-hover overflow-hidden rounded-2xl border border-hairline shadow-soft">
            <Link
              href={section.href}
              className="group flex h-full min-h-56 flex-col p-6 no-underline transition-colors hover:bg-primary/5 hover:no-underline"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-body-sm font-bold text-brand-ink">
                0{index + 1}
              </span>
              <span className="mt-6 text-card-title text-ink">{section.title}</span>
              <span className="mt-2 text-body-sm text-ink-muted">{section.detail}</span>
              <span className="mt-auto pt-6 text-body-sm font-semibold text-brand-ink transition-transform group-hover:translate-x-1">
                Open workspace →
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </StaffPage>
  );
}
