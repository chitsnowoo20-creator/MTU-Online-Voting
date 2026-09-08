import type { Database } from "@/lib/db/database.types";

type ElectionState = Database["public"]["Enums"]["election_state"];

/**
 * The timezone every displayed time is rendered in.
 *
 * Absolute times are formatted on the server, and `toLocaleString` without this
 * option uses whatever timezone the *process* runs in — a developer's laptop
 * locally, UTC in a deployment container. The same instant then reads six and a
 * half hours apart depending on where it was rendered.
 *
 * Stated here rather than left to a `TZ` environment variable so it survives
 * someone forgetting to set one, and so the answer to "which timezone is this?"
 * is in the repository. This is a single-campus election; if it ever needs to
 * follow the viewer instead, that zone has to reach the server (a cookie set on
 * first visit) rather than being read in the browser, or server and client will
 * render different text for the same node.
 */
const ELECTION_TIME_ZONE = "Asia/Yangon";

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

/**
 * "tomorrow", "in 14 hours", "3 days ago".
 *
 * No timezone needed here or in `countdownParts`: both measure the distance
 * between two absolute instants, and a zone shifts both ends equally. That is
 * why relative times were right in every environment while absolute ones were
 * not.
 */
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

/**
 * The same countdown split into a magnitude and its unit.
 *
 * For stat tiles, which read as [big number][small label]. `formatCountdown`
 * returns a phrase — "4 days ago" — which cannot sit at the same type size as
 * the integers beside it, and needed a one-off smaller size to fit.
 */
export function countdownParts(
  iso: string | null,
): { value: number; unit: string; past: boolean } | null {
  if (!iso) return null;

  const diff = Date.parse(iso) - Date.now();
  const past = diff < 0;
  const units: [string, number][] = [
    ["day", 86_400_000],
    ["hour", 3_600_000],
    ["minute", 60_000],
  ];

  for (const [unit, ms] of units) {
    if (Math.abs(diff) >= ms) {
      const value = Math.round(Math.abs(diff) / ms);
      return { value, unit: value === 1 ? unit : `${unit}s`, past };
    }
  }
  return { value: 0, unit: "minutes", past };
}

/** A date and time as a person wants to read it, not as an ISO string. */
export function formatMoment(iso: string | null): string {
  if (!iso) return "Not scheduled";
  return new Date(iso).toLocaleString("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: ELECTION_TIME_ZONE,
  });
}

export function formatRange(
  opensAt: string | null,
  closesAt: string | null,
): string {
  if (!opensAt && !closesAt) return "Not scheduled";
  const options: Intl.DateTimeFormatOptions = {
    day: "numeric",
    month: "short",
    timeZone: ELECTION_TIME_ZONE,
  };
  const from = opensAt
    ? new Date(opensAt).toLocaleDateString("en-GB", options)
    : "—";
  const to = closesAt
    ? new Date(closesAt).toLocaleDateString("en-GB", options)
    : "—";
  return `${from} – ${to}`;
}
