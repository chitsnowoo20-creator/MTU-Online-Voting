import type { Metadata } from "next";

import { RolesTable, type DirectoryRow } from "./roles-table";
import { StaffPage } from "@/components/staff/shell";
import { Button } from "@/components/ui/button";
import { TextInput } from "@/components/ui/field";
import { requireRole } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Roles · Campus Elections" };
export const dynamic = "force-dynamic";

export default async function RolesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  await requireRole(["ADMIN"], "/admin/roles");
  const { q } = await searchParams;
  const search = q?.trim() ?? "";

  const supabase = await createClient();

  /*
   * `admin_user_directory` is a security-definer view with `is_admin()` in its
   * body — it reads auth.users for the email, which `authenticated` cannot do
   * directly and should not be able to.
   */
  let query = supabase
    .from("admin_user_directory")
    .select("profile_id, full_name, email, roles")
    .order("created_at", { ascending: false })
    .limit(50);

  if (search) {
    query = query.or(`email.ilike.%${search}%,full_name.ilike.%${search}%`);
  }

  const { data: users, error } = await query;

  return (
    <StaffPage
      title="Roles"
      subtitle="Grant and revoke reviewer, officer and admin access. Voting rights are not granted here — every approved user can already vote."
    >
      <form className="mb-6 flex flex-wrap items-end gap-3">
        <div className="min-w-[260px] flex-1">
          <label htmlFor="q" className="mb-1.5 block text-caption text-ink-muted">
            Search by email or name
          </label>
          <TextInput
            id="q"
            name="q"
            defaultValue={search}
            placeholder="o.ford@campus.edu"
            autoComplete="off"
          />
        </div>
        <Button type="submit" variant="tertiary">
          Search
        </Button>
      </form>

      {error ? (
        <div className="surface-card px-6 py-8 text-body-sm text-error-ink">
          {error.message}
        </div>
      ) : (
        <RolesTable
          users={(users ?? []).filter(
            (row): row is DirectoryRow =>
              row.profile_id !== null &&
              row.full_name !== null &&
              row.email !== null &&
              row.roles !== null,
          )}
        />
      )}

      <p className="mt-4 text-caption text-ink-muted">
        Showing the 50 most recent accounts. Search to narrow it down. Every
        approved user can already vote — these are the extra staff roles.
      </p>
    </StaffPage>
  );
}
