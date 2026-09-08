# Campus Elections

Online voting for student elections at Mandalay Technological University.

Students and staff register with any email address, prove who they are once by
uploading their ID card, and then vote from their phone. An election officer
builds the ballot, opens and closes voting, and publishes the result. Nobody —
not an administrator, not the people who built it — can find out how any
individual voted.

## What it guarantees

**One person, one vote.** Identity is verified against a physical ID card by a
human reviewer, and each registration number or staff card can be attached to
one account only. A second account for the same person is refused at the moment
of approval, not left for someone to notice later.

**A secret ballot.** The system records *that* you voted and *what* was chosen
as two separate facts, and keeps no connection between them. This is not a
promise about who is allowed to look — there is genuinely no way to ask the
question. The app cannot show you your own past vote either, which is the same
guarantee seen from the other side.

**No early results.** Vote counts do not exist as something anyone can read
until the election officer publishes them. Not for administrators, not for the
officer running the election, not while voting is still open.

**A complete record.** Every consequential action — approving a voter, granting
a role, opening or closing an election, breaking a tie — is written to a log
that can be added to but never edited or deleted. Voting itself is deliberately
left out of that log, because an entry saying who acted and when, sitting beside
a recorded choice, would undo the secret ballot.

**Nothing kept longer than needed.** An uploaded ID card is visible only to a
reviewer, only while the submission is waiting, and is deleted the moment a
decision is made.

## Who uses it

| | |
|---|---|
| **Voter** | Registers, verifies their identity once, votes in each category |
| **Reviewer** | Works through the queue of ID submissions, approving or rejecting |
| **Election officer** | Builds the ballot, runs the schedule, resolves ties, publishes |
| **Admin** | Grants staff roles, maintains department codes, reads the audit log |

Being approved to vote and holding a staff role are separate things. Every
approved member can vote; a role only adds tools.

## How an election runs

```
Draft → Candidates locked → Open → Closed → Published
```

Categories, awards and candidates are set up while the election is a draft.
Locking the candidates freezes the ballot. Voting runs between a scheduled
opening and closing time, and closes on its own if nobody closes it by hand.
Results are counted only once the officer publishes them — and if two candidates
tie for a position that carries an award, publishing is blocked until the
officer records how the tie was broken and why. That explanation is shown
publicly alongside the result.

The lifecycle only moves forwards. There is no way back to an earlier stage.

## Built with

Next.js (App Router, TypeScript) and Supabase — Postgres, authentication, and
file storage. The rules above are enforced by the database itself rather than by
the screens in front of it, so they hold however the data is reached.

## Documentation

**The system**

- [PRD](docs/PRD.md) — what it has to do, and the requirements the code cites by number
- [Architecture](docs/ARCHITECTURE.md) — how it is put together
- [Schema](docs/SCHEMA.md) — tables, policies and functions
- [AGENTS](docs/AGENTS.md) — the invariants the code refers to throughout

**Working on it**

- [Setting up](docs/setup.md) — running it locally, and against your own Supabase project
- [Roadmap](docs/roadmap.md) — what we would build next, and the limitations we know about
- [Q&A preparation](docs/qa-prep.md) — likely questions about the design, with answers
- [UI shell rework](docs/ui-shell-rework.md) — a record of the interface restructure

## Layout

```
src/app/(public|voter|staff)/   routes, grouped by audience
src/components/                 UI, nav chrome
src/lib/supabase/               server + browser client factories
src/lib/auth/                   role guards
src/lib/validation/             zod schemas, shared by form and server
supabase/migrations/            all SQL — the schema is never edited by hand
supabase/tests/                 security invariant suite
```
