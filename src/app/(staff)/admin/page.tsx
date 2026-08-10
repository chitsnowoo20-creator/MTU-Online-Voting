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
      <ul className="grid gap-px bg-hairline sm:grid-cols-3">
        {SECTIONS.map((section) => (
          <li key={section.href} className="surface-card">
            <Link
              href={section.href}
              className="flex h-full flex-col gap-2 p-6 no-underline hover:bg-surface-1 hover:no-underline"
            >
              <span className="text-card-title text-ink">{section.title}</span>
              <span className="text-body-sm text-ink-muted">
                {section.detail}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </StaffPage>
  );
}
