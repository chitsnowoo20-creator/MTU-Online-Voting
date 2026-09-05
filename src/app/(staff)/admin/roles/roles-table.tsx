"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { setRole } from "./actions";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DataTable } from "@/components/ui/data-table";
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

/**
 * Typed confirmation for admin grants and revokes.
 *
 * Only ADMIN goes through this. Reviewer and Officer are reversible in a click
 * and stay instant — gating everything would just train people to type past the
 * dialog without reading it.
 *
 * The phrase is the target's own email rather than a fixed word: "CONFIRM"
 * becomes muscle memory after the second time, whereas typing the address
 * forces you to look at *who* you are about to change.
 *
 * This is UX, not a security boundary. RLS still decides who may write to
 * `user_roles`, and the audit trigger still records it either way.
 */
function AdminRoleDialog({
  user,
  grant,
  onCancel,
  onConfirm,
}: {
  user: DirectoryRow;
  grant: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const [typed, setTyped] = useState("");
  const matches = typed.trim().toLowerCase() === user.email.toLowerCase();

  return (
    <ConfirmDialog
      title={grant ? "Grant admin access?" : "Remove admin access?"}
      onCancel={onCancel}
      footer={
        <>
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            type="button"
            variant={grant ? "primary" : "danger"}
            disabled={!matches}
            onClick={onConfirm}
          >
            {grant ? "Grant admin" : "Remove admin"}
          </Button>
        </>
      }
    >
      <p className="text-body-sm text-ink-muted">
        {grant ? (
          <>
            <span className="text-ink">{user.full_name}</span> will be able to
            grant and revoke roles for anyone — including themselves — manage
            departments, and read the full audit log.
          </>
        ) : (
          <>
            <span className="text-ink">{user.full_name}</span> will lose role
            management, departments and the audit log. Any other role they hold
            is unaffected.
          </>
        )}
      </p>

      <label className="mt-5 block">
        {/* `break-words`: an email is one unbreakable token, so a long address
            would run past the dialog on a narrow screen. */}
        <span className="block break-words text-caption text-ink-muted">
          Type <span className="text-ink">{user.email}</span> to continue
        </span>
        <input
          value={typed}
          onChange={(event) => setTyped(event.target.value)}
          autoFocus
          autoComplete="off"
          spellCheck={false}
          aria-label={`Type ${user.email} to confirm`}
          className="mt-1.5 w-full rounded-xl border border-hairline bg-canvas px-4 py-3 text-body text-ink outline-none transition-colors focus:border-primary"
        />
      </label>
    </ConfirmDialog>
  );
}

export function RolesTable({ users }: { users: DirectoryRow[] }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const [adminChange, setAdminChange] = useState<{
    user: DirectoryRow;
    grant: boolean;
  } | null>(null);

  /**
   * ADMIN is the only role that opens a dialog. The checkbox is controlled by
   * server data and no local state changes here, so it snaps back on its own
   * while the dialog is open and only moves once the write lands.
   */
  function request(user: DirectoryRow, role: AppRole, grant: boolean) {
    if (role === "ADMIN") {
      setError(null);
      setAdminChange({ user, grant });
      return;
    }
    toggle(user.profile_id, role, grant);
  }

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

      <div className="surface-panel">
        {users.length === 0 ? (
          <p className="px-6 py-12 text-center text-body text-ink-muted">
            No users match that search.
          </p>
        ) : (
          <>
            <ul className="flex flex-col divide-y divide-hairline md:hidden">
              {users.map((user) => (
                <li key={user.profile_id} className="px-6 py-4">
                  <p className="text-ink">{user.full_name}</p>
                  <p className="text-caption text-ink-muted">{user.email}</p>
                  <div className="mt-3 flex flex-col gap-2">
                    {ROLES.map(({ role, label }) => {
                      const has = user.roles.includes(role);
                      return (
                        <label
                          key={role}
                          className="flex items-center gap-2 text-body-sm"
                        >
                          <input
                            type="checkbox"
                            checked={has}
                            disabled={pending}
                            aria-label={`${label} — ${user.full_name}`}
                            onChange={(event) =>
                              request(user, role, event.target.checked)
                            }
                            className="size-4 cursor-pointer accent-[var(--color-primary)] disabled:cursor-wait"
                          />
                          {label}
                        </label>
                      );
                    })}
                  </div>
                </li>
              ))}
            </ul>

            <div className="hidden md:block">
              <DataTable minWidth={640}>
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
                          <p className="text-caption text-ink-muted">
                            {user.email}
                          </p>
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
                                  request(user, role, event.target.checked)
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
              </DataTable>
            </div>
          </>
        )}
      </div>

      <p className="text-caption text-ink-muted">
        Every grant and revoke is written to the audit log with your name
        against it.
      </p>

      {adminChange ? (
        <AdminRoleDialog
          key={`${adminChange.user.profile_id}-${adminChange.grant}`}
          user={adminChange.user}
          grant={adminChange.grant}
          onCancel={() => setAdminChange(null)}
          onConfirm={() => {
            toggle(adminChange.user.profile_id, "ADMIN", adminChange.grant);
            setAdminChange(null);
          }}
        />
      ) : null}
    </div>
  );
}
