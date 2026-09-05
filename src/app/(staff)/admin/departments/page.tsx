import type { Metadata } from "next";

import { DepartmentEditor } from "./editor";
import { StaffPage } from "@/components/staff/shell";
import { requireRole } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Departments · Campus Elections" };
export const dynamic = "force-dynamic";

export default async function DepartmentsPage() {
  await requireRole(["ADMIN"], "/admin/departments");

  const supabase = await createClient();
  // Admins see inactive rows too — the RLS policy allows it precisely so this
  // screen can reactivate one.
  const { data: departments, error } = await supabase
    .from("departments")
    .select("code, name, active")
    .order("code");

  return (
    <StaffPage
      title="Departments"
      subtitle="Admin"
    >
      {error ? (
        <div className="surface-card px-6 py-8 text-body-sm text-error-ink">
          {error.message}
        </div>
      ) : (
        <DepartmentEditor departments={departments ?? []} />
      )}
    </StaffPage>
  );
}
