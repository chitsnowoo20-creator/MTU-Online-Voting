import type { Database } from "@/lib/db/database.types";

type ElectionState = Database["public"]["Enums"]["election_state"];

/**
 * Where an election sits relative to its own window.
 *
 * `state = OPEN` only *arms* an election — cast_vote() also requires `now()` to
 * be inside [opens_at, closes_at]. Calling both of those "Open" in the UI told
 * officers voting was live when it wasn't, and would have told voters the same.
 * Every surface derives its wording from here so they cannot disagree.
 */
export type VotingPhase = "NOT_OPEN" | "SCHEDULED" | "LIVE" | "AWAITING_CLOSE";

export function votingPhase(
  state: ElectionState,
  opensAt: string | null,
  closesAt: string | null,
): VotingPhase {
  if (state !== "OPEN") return "NOT_OPEN";

  const now = Date.now();
  const opens = opensAt ? Date.parse(opensAt) : null;
  const closes = closesAt ? Date.parse(closesAt) : null;

  if (opens !== null && now < opens) return "SCHEDULED";
  // Past closing but still flagged OPEN: auto_close_elections() runs every
  // minute, so this is a brief window rather than a stuck election.
  if (closes !== null && now >= closes) return "AWAITING_CLOSE";
  return "LIVE";
}

/** Whether an instant is still ahead of us. */
export function isUpcoming(iso: string | null | undefined): boolean {
  return Boolean(iso) && Date.parse(iso!) > Date.now();
}

/** "tomorrow", "in 14 hours", "3 days ago". */
export function formatCountdown(iso: string | null): string {
  if (!iso) return "";
  const diff = Date.parse(iso) - Date.now();
  const relative = new Intl.RelativeTimeFormat("en-GB", { numeric: "auto" });
  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ["day", 86_400_000],
    ["hour", 3_600_000],
    ["minute", 60_000],
  ];
  for (const [unit, ms] of units) {
    if (Math.abs(diff) >= ms) {
      return relative.format(Math.round(diff / ms), unit);
    }
  }
  return relative.format(0, "minute");
}

/** A date and time as a person wants to read it, not as an ISO string. */
export function formatMoment(iso: string | null): string {
  if (!iso) return "Not scheduled";
  return new Date(iso).toLocaleString("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function formatRange(
  opensAt: string | null,
  closesAt: string | null,
): string {
  if (!opensAt && !closesAt) return "Not scheduled";
  const options: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" };
  const from = opensAt
    ? new Date(opensAt).toLocaleDateString("en-GB", options)
    : "—";
  const to = closesAt
    ? new Date(closesAt).toLocaleDateString("en-GB", options)
    : "—";
  return `${from} – ${to}`;
}
