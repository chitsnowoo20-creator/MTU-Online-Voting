import type { Database } from "@/lib/db/database.types";

export type AuditRow = Database["public"]["Tables"]["audit_log"]["Row"];

/**
 * Filter groups for the audit screen.
 *
 * Raw action names (`CANDIDATES_UPDATE`) are precise but unreadable at a
 * glance, so the UI filters by what an admin is actually looking for. The
 * lists are explicit rather than prefix-matched — a new audited table should
 * be a deliberate addition here, not silently absorbed into "elections".
 */
export const AUDIT_GROUPS = {
  verification: {
    label: "Verification decisions",
    actions: ["VERIFY_APPROVE", "VERIFY_REJECT"],
  },
  elections: {
    label: "Elections and ballots",
    actions: [
      "ELECTION_TRANSITION",
      "ELECTIONS_INSERT",
      "ELECTIONS_UPDATE",
      "ELECTIONS_DELETE",
      "CATEGORIES_INSERT",
      "CATEGORIES_UPDATE",
      "CATEGORIES_DELETE",
      "AWARDS_INSERT",
      "AWARDS_UPDATE",
      "AWARDS_DELETE",
      "CANDIDATES_INSERT",
      "CANDIDATES_UPDATE",
      "CANDIDATES_DELETE",
      "TIE_RESOLUTIONS_INSERT",
    ],
  },
  administration: {
    label: "Roles and departments",
    actions: [
      "USER_ROLES_INSERT",
      "USER_ROLES_UPDATE",
      "USER_ROLES_DELETE",
      "DEPARTMENTS_INSERT",
      "DEPARTMENTS_UPDATE",
      "DEPARTMENTS_DELETE",
    ],
  },
  system: {
    label: "System jobs",
    actions: ["PURGE_ID_IMAGES"],
  },
} as const;

export type AuditGroupKey = keyof typeof AUDIT_GROUPS;

function readableRole(role: unknown): string {
  return String(role ?? "")
    .toLowerCase()
    .replace(/_/g, " ");
}

/**
 * Turns one audit row into a sentence. Falls back to the raw action name rather
 * than inventing a description for something it doesn't recognise — an audit
 * trail that guesses is worse than one that is blunt.
 */
export function describeEntry(
  row: AuditRow,
  emailFor: (id: string | null) => string | null,
): string {
  const detail = (row.detail ?? {}) as Record<string, unknown>;
  const target = emailFor(row.entity_id) ?? "a user";

  switch (row.action) {
    case "VERIFY_APPROVE":
      return `Approved a verification submission (${String(detail.member_type ?? "unknown type").toLowerCase()})`;
    case "VERIFY_REJECT":
      return detail.reason
        ? `Rejected a verification submission — ${String(detail.reason)}`
        : "Rejected a verification submission";
    case "ELECTION_TRANSITION":
      return `Moved an election from ${String(detail.from)} to ${String(detail.to)}${
        detail.note ? ` — ${String(detail.note)}` : ""
      }`;
    case "USER_ROLES_INSERT":
      return `Granted ${readableRole(detail.role)} to ${target}`;
    case "USER_ROLES_DELETE":
      return `Revoked ${readableRole(detail.role)} from ${target}`;
    case "DEPARTMENTS_INSERT":
      return `Added department ${String(detail.code ?? "")}`;
    case "DEPARTMENTS_UPDATE":
      return `Updated department ${String(
        (detail.after as Record<string, unknown> | undefined)?.code ?? "",
      )}`;
    case "CANDIDATES_INSERT":
      return `Added candidate ${String(detail.display_name ?? "")}`;
    case "CANDIDATES_DELETE":
      return `Removed candidate ${String(detail.display_name ?? "")}`;
    case "CATEGORIES_INSERT":
      return `Added category ${String(detail.name ?? "")}`;
    case "CATEGORIES_DELETE":
      return `Removed category ${String(detail.name ?? "")}`;
    case "AWARDS_INSERT":
      return `Added award rank ${String(detail.rank ?? "")} — ${String(detail.label ?? "")}`;
    case "AWARDS_DELETE":
      return `Removed award ${String(detail.label ?? "")}`;
    case "TIE_RESOLUTIONS_INSERT":
      return `Resolved a tie — ${String(detail.justification ?? "")}`;
    case "PURGE_ID_IMAGES":
      return `Purged ${String(detail.objects_removed ?? 0)} ID card image(s)`;
    case "ELECTIONS_INSERT":
      return `Created election ${String(detail.name ?? "")}`;
    case "ELECTIONS_UPDATE":
      return "Edited election details";
    case "ELECTIONS_DELETE":
      return `Deleted election ${String(detail.name ?? "")}`;
    default:
      return row.action;
  }
}
