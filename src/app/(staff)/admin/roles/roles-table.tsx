"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { setRole } from "./actions";
import { FormError } from "@/components/ui/tile";
import type { Database } from "@/lib/db/database.types";

type AppRole = Database["public"]["Enums"]["app_role"];

const ROLES: { role: AppRole; label: string }[] = [
  { role: "REVIEWER", label: "Reviewer" },
  { role: "ELECTION_OFFICER", label: "Officer" },
  { role: "ADMIN", label: "Admin" },
];

export type DirectoryRow = {
  profile_id: string;
  full_name: string;
  email: string;
  roles: AppRole[];
};

export function RolesTable({ users }: { users: DirectoryRow[] }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function toggle(profileId: string, role: AppRole, grant: boolean) {
    setError(null);
    const formData = new FormData();
    formData.set("profileId", profileId);
    formData.set("role", role);
    formData.set("grant", String(grant));

    startTransition(async () => {
      const result = await setRole({}, formData);
      if (result.error) setError(result.error);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-4">
      {error ? <FormError>{error}</FormError> : null}

      <div className="border border-hairline bg-canvas">
        {users.length === 0 ? (
          <p className="px-6 py-12 text-center text-body text-ink-muted">
            No users match that search.
          </p>
        ) : (
          <table className="w-full border-collapse text-body-sm">
            <thead>
              <tr className="border-b border-hairline text-left text-caption text-ink-muted">
                <th className="px-6 py-3 font-normal">User</th>
                {ROLES.map(({ role, label }) => (
                  <th key={role} className="px-4 py-3 text-center font-normal">
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr
                  key={user.profile_id}
                  className="border-b border-hairline last:border-b-0"
                >
                  <td className="px-6 py-4">
                    <p className="text-ink">{user.full_name}</p>
                    <p className="text-caption text-ink-muted">{user.email}</p>
                  </td>
                  {ROLES.map(({ role, label }) => {
                    const has = user.roles.includes(role);
                    return (
                      <td key={role} className="px-4 py-4 text-center">
                        <input
                          type="checkbox"
                          checked={has}
                          disabled={pending}
                          aria-label={`${label} — ${user.full_name}`}
                          onChange={(event) =>
                            toggle(user.profile_id, role, event.target.checked)
                          }
                          className="size-4 cursor-pointer accent-[var(--color-primary)] disabled:cursor-wait"
                        />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <p className="text-caption text-ink-muted">
        Every grant and revoke is written to the audit log with your name
        against it.
      </p>
    </div>
  );
}
