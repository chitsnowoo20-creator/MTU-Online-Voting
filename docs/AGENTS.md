# AGENTS.md

Guidance for AI coding agents (and humans) working in this repository. Read this before writing code. The **Security Invariants** section is not negotiable — a change that violates one is wrong even if it compiles and passes tests.

---

## Project

A secure online voting system for electing a university's King & Queen at a freshers' welcome event. ~1,000 voters. The whole point of the project is *trustworthiness*: one vote per person, secret ballots, full auditability. Treat those three as the acceptance criteria for everything.

See `PRD.md` for scope, `ARCHITECTURE.md` for how the pieces fit, `SCHEMA.md` for the data model.

---

## Stack & conventions

- **Next.js** (App Router, TypeScript, Server Components by default).
- **Supabase**: Auth (email confirmation), Postgres (+ RLS), Storage, RPC (SECURITY DEFINER functions), pg_cron.
- **`@supabase/ssr`** for auth/session on the server.
- **zod** for all input validation.
- **Tailwind** for styling.
- SQL lives in `supabase/migrations/`; never edit the database out of band — every schema change is a migration.

Reads go through RLS under the anon key. Writes that touch anything privileged go through a Postgres RPC called from a Server Action. **Reads through RLS, writes through RPC.**

---

## Security Invariants (do not break)

1. **The `votes` table never gains a `voter_id`, and never a foreign key to `ballot_issued`.** Ballot secrecy is structural, not a matter of "we won't query it that way".
2. **`votes.cast_on` stays a `date`.** Do not add time precision, `created_at`, or any finer timestamp — it would let votes be re-linked to voters by ordering.
3. **`cast_vote()` and `decide_review()` are the only writers of their tables.** Do not add direct `INSERT`/`UPDATE` grants on `votes`, `ballot_issued`, or `voter_identity`.
4. **The service-role key is server-only.** It must never appear in a Client Component, a `NEXT_PUBLIC_*` var, or anything shipped to the browser. Prefer the anon key + RLS; reach for service role only when unavoidable, and keep that code tiny.
5. **RLS is enabled on every table.** A new table without an explicit policy is a bug, not a default-open convenience.
6. **ID-card images are deleted on decision.** No code path may retain them, copy them elsewhere, or widen their access beyond the Reviewer role while `PENDING`.
7. **No tally is readable before an election is `PUBLISHED`.** No "admin peek", no live counter, no debug endpoint that selects from `votes`.
8. **Every privileged mutation writes an `audit_log` row.** State transitions, verification decisions, candidate changes, role grants, tie resolutions.
9. **`email_confirmed` (Supabase) and `voter_status` (ours) are separate.** Never let one imply the other.
10. **All eligibility/state checks are enforced server-side.** Client checks are UX only and are assumed bypassable.

If a task seems to require breaking one of these, stop and raise it with the maintainers rather than working around it.

---

## Identity rules

- **Student URN** format `MaNaTa-00000`. Normalise to uppercase + dash-stripped (`MANATA40883`) before storing/compares. Validate the pattern in zod and re-check in the RPC.
- **Staff username** = lowercased full name, spaces→underscores, always suffixed with a department code from the `departments` table (`dr_aung_aung_ceit`). Same-name-same-department → trailing `_2`, `_3`. The reviewer generates it; the physical card is the real anti-duplication anchor.
- Department codes are a **table**, not an enum. Presets: `CE, Arch, EP, EC, CEIT, ME, NE, BioT, ChE, MC`. New ones are inserts by an Admin.
- **Candidates are standalone cards, not user accounts.** The Election Officer creates each (photo, display name, tagline, department); there is no `profile_id` on `candidates` and no link to any voter. Do not reintroduce one — it would create a path to correlate voters with choices.

---

## Election lifecycle

`DRAFT → CANDIDATES_LOCKED → OPEN → CLOSED → PUBLISHED`. State changes go through the transition function only, each guarded and logged. Structural edits (categories, awards, candidates) are legal only in `DRAFT`. Votes are legal only in `OPEN` within `[opens_at, closes_at]`.

Titles are **configurable per election**: a category holds awards as `(rank, label)` pairs, labels are free text. Never hard-code "King"/"Queen".

---

## Directory map

```
app/(public|voter|staff)/   route groups by audience
lib/supabase/               server + client factories
lib/auth/                   role guards, middleware
lib/db/                     typed queries + RPC wrappers
lib/validation/             zod schemas
supabase/migrations/        all SQL
supabase/seed.sql           departments + initial admin
```

---

## Commands (adjust to the actual repo when scaffolded)

```bash
pnpm install
pnpm dev                 # Next.js dev server
pnpm lint && pnpm typecheck
pnpm test
supabase start           # local stack
supabase db reset        # re-apply migrations + seed
supabase db diff         # generate a migration from local changes
```

Prefer `pnpm`. Run `lint`, `typecheck`, and `test` before proposing a change as done.

---

## Style

- TypeScript strict; no `any` without a written reason.
- Server Components for reads; Client Components only where interactivity is needed.
- No secrets in client code. No business rule enforced only on the client.
- Small, reviewable diffs. One concern per PR.
- Keep validation in `lib/validation/` and reuse it on both the form and the server.

---

## When unsure

Ask, or leave a `// TODO(maintainer): <question>` rather than guessing — especially around anything that touches voting, secrecy, or PII. A wrong guess in those areas is expensive; a question is cheap.
