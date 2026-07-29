# Campus Elections

A secure online voting system for university student elections. One vote per
person, secret ballots, full auditability.

Next.js (App Router, TypeScript) on Supabase — Postgres with row-level security,
auth with email confirmation, Storage for ID cards, and `SECURITY DEFINER`
functions for every privileged write.

---

## Requirements

| | |
|---|---|
| Node.js | 20.9 or newer (`node --version`) |
| pnpm | 10 or newer — `npm install -g pnpm` |
| Supabase account | free tier is enough |

The Supabase CLI ships as a dev dependency, so there is nothing to install
globally. Run it as `pnpm supabase <command>`.

---

## 1. Clone and install

```bash
git clone https://github.com/yukinoIsMine/campus-elections.git
```

```bash
cd campus-elections && pnpm install
```

## 2. Set up the database

Create a project at [supabase.com/dashboard](https://supabase.com/dashboard),
then link this checkout to it and apply the schema. The project ref is in the
dashboard URL (`https://supabase.com/dashboard/project/<ref>`).

```bash
pnpm supabase link --project-ref <your-project-ref>
```

```bash
pnpm db:push
```

That applies all 15 migrations: tables, RLS policies, RPCs, Storage buckets and
their policies. Then seed the department codes — open the dashboard's **SQL
Editor** and run the `insert into departments …` statement from
[`supabase/seed.sql`](supabase/seed.sql).

Two optional extras in the dashboard:

- **Database → Extensions → enable `pg_cron`**, then re-run `pnpm db:push`, to
  activate the scheduled jobs (auto-close a forgotten election, purge ID-card
  images). Without it everything still works — the migration skips with a
  notice and closing is manual.
- **Project Settings → Auth → SMTP.** The built-in mailer is rate-limited and
  only delivers to project members, so it is fine for development and not for
  ~1,000 signups.

## 3. Environment variables

```bash
cp .env.example .env.local
```

Fill in both values from the dashboard, under *Project Settings → API*.

```
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key>
```

Only these two. The anon key is *meant* to reach the browser — row-level
security is what protects the data. The service-role key is not used anywhere in
this codebase and must never be added to a `NEXT_PUBLIC_*` variable.

## 4. Run it

```bash
pnpm dev
```

Open <http://localhost:3000>.

## 5. Create the first Admin

Roles are granted by an Admin, so the first one is seeded by hand.

1. Register through the app at `/register`.
2. Confirm the email from your inbox.
3. Run this against the database (SQL Editor, or `psql`) with your address — it
   needs to bypass RLS, so it cannot be done from the app:

```sql
insert into user_roles (profile_id, role)
select u.id, 'ADMIN' from auth.users u
where u.email = 'you@example.edu'
on conflict do nothing;
```

Sign out and back in. `/admin` is now reachable, and from
**Admin → Roles** you can grant Reviewer and Election Officer to anyone else.

---

## Checks

Run all three before proposing a change as done.

```bash
pnpm lint && pnpm typecheck
```

```bash
pnpm test
```

`pnpm test` runs the SQL suite that proves the security invariants — ballot
secrecy, one vote per voter, no tally before publish. Point `DATABASE_URL` at a
throwaway Postgres with the migrations applied; the suite writes test rows, so
never run it against the project the app is using. `supabase/tests/` has a shim
for setting up a plain Postgres to run it against.

## Scripts

| Command | What it does |
|---|---|
| `pnpm dev` | Development server |
| `pnpm build` / `pnpm start` | Production build and serve |
| `pnpm lint` / `pnpm typecheck` | ESLint / `tsc --noEmit` |
| `pnpm test` | SQL invariant suite |
| `pnpm db:push` | Apply migrations to the linked project |
| `pnpm db:reset` | Re-apply migrations + seed (local stack only — it drops data) |
| `pnpm db:diff` | Generate a migration from local schema changes |
| `pnpm db:types` | Regenerate `src/lib/db/database.types.ts` |

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
