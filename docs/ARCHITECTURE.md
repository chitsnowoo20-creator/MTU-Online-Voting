# ARCHITECTURE — University King & Queen Voting System

**Stack:** Next.js (App Router, TypeScript) · Supabase (Postgres + Auth + Storage + RLS + RPC + pg_cron) · Vercel (hosting).

This document explains *how the pieces fit and why*. The security-critical parts — ballot secrecy, atomic voting, least privilege — are called out explicitly because they constrain how everything else is built.

---

## 1. High-level shape

```
┌─────────────────────────── Browser ───────────────────────────┐
│  Next.js App Router (Server Components + Client Components)    │
│  - Public pages (login, register, results)                    │
│  - Voter pages (verify, vote)                                 │
│  - Reviewer / Officer / Admin dashboards                      │
└───────────────┬───────────────────────────────┬──────────────┘
                │ anon key (RLS-scoped)          │ server-only
                ▼                                ▼
        ┌───────────────┐              ┌──────────────────────┐
        │ Supabase Auth │              │ Next.js Server layer │
        │ (email conf.) │              │ Server Actions /     │
        └───────────────┘              │ Route Handlers       │
                                       │ (service role, RPC)  │
                                       └──────────┬───────────┘
                                                  ▼
        ┌───────────────────── Supabase Postgres ──────────────────────┐
        │  Tables + RLS policies                                       │
        │  SECURITY DEFINER functions:  cast_vote(), decide_review()   │
        │  Views:  election_results (post-publish only)                │
        │  pg_cron:  purge_id_images(), auto_close_elections()         │
        └──────────────────────────────────────────────────────────────┘
                                                  ▼
                                       ┌──────────────────────┐
                                       │ Supabase Storage     │
                                       │  id-cards (private)  │
                                       │  candidate-photos    │
                                       └──────────────────────┘
```

---

## 2. Client / server split in Next.js

- **Server Components** do all data reads. They run on the server, hold the user's session (via `@supabase/ssr`), and query Postgres through the **anon key under RLS** — so a bug can never over-fetch beyond what the policy allows.
- **Client Components** handle interactivity only (forms, buttons, optimistic UI). They never hold secrets.
- **Mutations** go through **Server Actions** (or Route Handlers). Anything privileged — casting a vote, deciding a review, changing election state — is a server action that calls a Postgres RPC. The service-role key, if used at all, lives only here and never in a component that ships to the browser.

Rule of thumb: **reads through RLS, writes through RPC.**

---

## 3. Authentication

- Supabase Auth handles registration, email confirmation, and sessions. We use the **built-in email-confirmation** flow — no custom code.
- **Production must use custom SMTP**; the built-in mailer is development-only and rate-limited, which would break a 1,000-user signup rush.
- Sessions are carried server-side via cookies (`@supabase/ssr`). The middleware refreshes the session and gates routes by role.
- `email_confirmed` (Supabase) and `voter_status` (ours) are **separate**. Middleware checks both where relevant.

---

## 4. Authorization (RLS + roles)

Row Level Security is the primary guard. Every table has explicit policies; nothing is world-readable by default.

- **Voter** is implicit for any profile with `voter_status = APPROVED`.
- **Reviewer / Election Officer / Admin** come from a `user_roles` table, checked inside policies via helper functions (`is_reviewer()`, `is_officer()`, `is_admin()`).
- The **service-role key bypasses RLS entirely**, so it is treated as radioactive: server-only, minimal surface, every use reviewed. If ballot secrecy depended solely on RLS, this key could undo it — which is why the vote path also has structural protection (§6).

---

## 5. Election lifecycle as a state machine

```
DRAFT ──lock──▶ CANDIDATES_LOCKED ──open──▶ OPEN ──close──▶ CLOSED ──publish──▶ PUBLISHED
```

| State | Legal operations |
|---|---|
| `DRAFT` | edit categories / awards / candidates / deadlines |
| `CANDIDATES_LOCKED` | final review; candidate list frozen |
| `OPEN` | accept votes; **no structural change** |
| `CLOSED` | tally; resolve ties |
| `PUBLISHED` | results public |

Transitions are the only way state changes, each guarded server-side and logged. Votes are rejected unless the election is `OPEN` **and** `now()` is within `[opens_at, closes_at]`. `auto_close_elections()` (pg_cron) flips `OPEN → CLOSED` at `closes_at` so a forgotten manual close can't leave voting open.

---

## 6. Ballot secrecy — the core of the design

Two tables share **no foreign key**:

- `ballot_issued(election_id, category_id, voter_id, …)` — proves a person voted; carries no choice.
- `votes(election_id, category_id, candidate_id, …)` — carries the choice; carries no voter.

Voting is done through **one SECURITY DEFINER function, `cast_vote()`**, and callers have **no direct INSERT** on either table. Inside a single transaction the function:

1. checks the election is `OPEN` and within its window;
2. checks the caller is an approved voter eligible for that category;
3. checks no `ballot_issued` row already exists for `(election, category, voter)`;
4. inserts the `ballot_issued` row **and** the `votes` row;
5. writes nothing that links the two.

Because the two inserts are the only way a vote is created, and neither table references the other, there is no key to join on. **Timestamps are the remaining leak**: `votes.cast_at` is stored at coarse (e.g. date) precision so rows can't be re-linked by ordering. This is the one invariant that must never be "optimised" away for analytics convenience.

---

## 7. Results

- While an election is not `PUBLISHED`, the `votes` table is **not selectable** by any client role — no live tally.
- On publish, results are read through an **`election_results` view** (or a materialised view refreshed at publish) that aggregates counts per candidate and maps ranks to award labels. The view exposes counts, never voter identities.
- Ties surface here: if two candidates share a rank-boundary count, publication is blocked until a `tie_resolution` row is recorded.

---

## 8. Storage & PII

- **`id-cards` bucket:** private, non-listable, per-user path. Readable only by Reviewers, only while the submission is `PENDING`. **Deleted on decision.** A `purge_id_images()` cron job is the backstop that guarantees nothing lingers.
- **`candidate-photos` bucket:** public-read (they're shown on ballots), write restricted to Officers.
- Signed URLs, short expiry, for any private read.

---

## 9. Scheduled jobs (pg_cron)

- `auto_close_elections()` — closes elections past `closes_at`.
- `purge_id_images()` — deletes card images for decided submissions and any older than the retention window.

---

## 10. Directory layout (Next.js)

```
app/
  (public)/         login, register, results
  (voter)/          verify, vote
  (staff)/
    review/         reviewer queue
    elections/      officer dashboards
    admin/          roles, departments, audit log
  api/              route handlers where server actions don't fit
lib/
  supabase/         server + client factories (@supabase/ssr)
  auth/             role guards, middleware helpers
  db/               typed queries, RPC wrappers
  validation/       zod schemas (URN pattern, username rules, forms)
components/          UI
supabase/
  migrations/       SQL (tables, RLS, functions, cron)
  seed.sql          department presets, initial admin
```

---

## 11. Trust boundaries (summary)

| Boundary | Guard |
|---|---|
| Browser → data reads | RLS under anon key |
| Browser → privileged writes | Server Action → SECURITY DEFINER RPC |
| Vote choice ↔ voter identity | Structural: no shared key + coarse timestamps |
| Service-role key | Server-only, minimal, reviewed |
| ID-card images | Private bucket + reviewer-only + auto-purge |
