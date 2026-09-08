# SCHEMA — University King & Queen Voting System

**Database:** Supabase Postgres. All DDL below is illustrative and belongs in `supabase/migrations/`. RLS is **enabled on every table**; policies are summarised per table and must be written explicitly (Postgres denies by default once RLS is on, which is what we want).

The two rules that shape this schema:
1. `votes` and `ballot_issued` share **no foreign key** — ballot secrecy is structural.
2. Privileged writes go through **SECURITY DEFINER functions**, not direct table grants.

---

## 1. Enums

```sql
create type member_type   as enum ('STUDENT', 'STAFF');
create type voter_status  as enum ('UNVERIFIED', 'PENDING', 'APPROVED', 'REJECTED');
create type app_role      as enum ('REVIEWER', 'ELECTION_OFFICER', 'ADMIN');
create type election_state as enum
  ('DRAFT', 'CANDIDATES_LOCKED', 'OPEN', 'CLOSED', 'PUBLISHED');
```

---

## 2. profiles

Extends `auth.users` (Supabase owns email + password). One row per user.

```sql
create table profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  full_name     text not null,
  member_type   member_type,                       -- null until verified
  voter_status  voter_status not null default 'UNVERIFIED',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
```

**RLS:** a user reads/updates only their own row (but cannot change `voter_status` or `member_type` — those move only via the review RPC). Reviewers read `PENDING` profiles. Admins read all.

---

## 3. departments

The preset short codes; Admin-extensible (kept as a table, not an enum, so new departments are an insert, not a migration).

```sql
create table departments (
  code      text primary key,     -- 'CE', 'CEIT', ...
  name      text not null,
  active    boolean not null default true
);

insert into departments (code, name) values
  ('CE','Civil'), ('Arch','Architecture'), ('EP','Engineering Physics'),
  ('EC','Electronics'), ('CEIT','Computer Engineering & IT'),
  ('ME','Mechanical'), ('NE','?'), ('BioT','Biotechnology'),
  ('ChE','Chemical'), ('MC','Mechatronics');
-- Fill in full names with the team; codes are the frozen preset.
```

**RLS:** anyone authenticated reads active rows; only Admins write.

---

## 4. voter_identity

The durable anchor written **on approval**, after the card image is deleted. This is where uniqueness is enforced.

```sql
create table voter_identity (
  id              uuid primary key default gen_random_uuid(),
  profile_id      uuid not null unique references profiles(id) on delete cascade,
  member_type     member_type not null,
  urn_normalized  text,          -- students: 'MANATA40883'
  staff_username  text,          -- staff:    'dr_aung_aung_ceit'
  department_code text references departments(code),
  reviewed_by     uuid not null references profiles(id),
  reviewed_at     timestamptz not null default now(),

  constraint identity_shape check (
    (member_type = 'STUDENT'
       and urn_normalized is not null
       and staff_username is null)
    or
    (member_type = 'STAFF'
       and staff_username is not null
       and department_code is not null
       and urn_normalized is null)
  )
);

-- Uniqueness = the anti-duplication guarantee.
create unique index uq_urn      on voter_identity (urn_normalized)
  where urn_normalized is not null;
create unique index uq_username on voter_identity (staff_username)
  where staff_username is not null;
```

> `urn_normalized` is uppercased + dash-stripped before insert. The URN pattern (`MaNaTa-00000`) is validated in the app (zod) *and* re-checked in the review RPC.

**RLS:** owner reads own; Reviewers/Admins read all; **no direct writes** — populated only by `decide_review()`.

---

## 5. verification_submissions

The pending-review record and the card-image pointer.

```sql
create table verification_submissions (
  id            uuid primary key default gen_random_uuid(),
  profile_id    uuid not null references profiles(id) on delete cascade,
  id_card_path  text,                    -- storage path; nulled on decision
  status        voter_status not null default 'PENDING',
  submitted_at  timestamptz not null default now(),
  decided_at    timestamptz,
  decided_by    uuid references profiles(id)
);
```

**RLS:** owner reads own; Reviewers read `PENDING`; writes via RPC only. `id_card_path` is set to null (and the object deleted) the moment a decision is recorded.

---

## 6. user_roles

Extra roles beyond the implicit Voter. A user may hold several.

```sql
create table user_roles (
  profile_id  uuid not null references profiles(id) on delete cascade,
  role        app_role not null,
  granted_by  uuid references profiles(id),
  granted_at  timestamptz not null default now(),
  primary key (profile_id, role)
);
```

Helper functions used inside policies:

```sql
create or replace function is_admin()    returns boolean language sql stable security definer as $$
  select exists (select 1 from user_roles where profile_id = auth.uid() and role = 'ADMIN'); $$;
create or replace function is_reviewer() returns boolean language sql stable security definer as $$
  select exists (select 1 from user_roles where profile_id = auth.uid() and role = 'REVIEWER'); $$;
create or replace function is_officer()  returns boolean language sql stable security definer as $$
  select exists (select 1 from user_roles where profile_id = auth.uid() and role = 'ELECTION_OFFICER'); $$;
```

**RLS:** only Admins write; a user may read their own roles.

---

## 7. elections

```sql
create table elections (
  id                    uuid primary key default gen_random_uuid(),
  name                  text not null,
  state                 election_state not null default 'DRAFT',
  opens_at              timestamptz,
  closes_at             timestamptz,
  verification_deadline timestamptz,
  created_by            uuid not null references profiles(id),
  created_at            timestamptz not null default now(),
  check (closes_at is null or opens_at is null or closes_at > opens_at)
);
```

**RLS:** public reads `PUBLISHED` (and basic info of `OPEN`); Officers manage. State changes only via `transition_election()`.

---

## 8. categories & awards

```sql
create table categories (
  id            uuid primary key default gen_random_uuid(),
  election_id   uuid not null references elections(id) on delete cascade,
  name          text not null,                 -- 'Male', 'Female', free text
  display_order int not null default 0
);

create table awards (
  id          uuid primary key default gen_random_uuid(),
  category_id uuid not null references categories(id) on delete cascade,
  rank        int  not null,                   -- 1, 2, ...
  label       text not null,                   -- 'King', 'Prince', free text
  unique (category_id, rank)
);
```

**RLS:** readable with their election; writable by Officers while the election is `DRAFT`.

---

## 9. candidates

A **standalone content record**, not a user account. The Election Officer creates each card by hand; the person pictured need not be registered anywhere in the system. There is **no link to `profiles`**.

```sql
create table candidates (
  id              uuid primary key default gen_random_uuid(),
  category_id     uuid not null references categories(id) on delete cascade,
  display_name    text not null,
  tagline         text,                              -- free text, e.g. 'First-year, Civil Engineering'
  department_code text references departments(code),
  photo_path      text not null,                     -- required
  display_order   int not null default 0
);
```

Each candidate belongs to **exactly one** category (`category_id`). Because there is no `profile_id`, nothing links a voter's identity to any candidate — which is also why "self-voting" is not a case the system can or needs to reason about.

> The "teachers can't compete" rule is **no longer machine-enforced**; it is the officer's responsibility while curating the list. The audit log records who added each card, which is the compensating control.

**RLS:** readable with their election; writable by Officers while `DRAFT`.

---

## 10. ballot_issued  ← secrecy pair (A)

Proves a person voted. **No choice stored.**

```sql
create table ballot_issued (
  id          uuid primary key default gen_random_uuid(),
  election_id uuid not null references elections(id),
  category_id uuid not null references categories(id),
  voter_id    uuid not null references profiles(id),
  issued_at   timestamptz not null default now(),
  unique (election_id, category_id, voter_id)   -- one vote per category
);
```

**RLS:** a voter may check **their own** existence row (to render "you've voted"); no one reads others'. No direct INSERT — only `cast_vote()`.

---

## 11. votes  ← secrecy pair (B)

Carries the choice. **No voter reference. No foreign key to `ballot_issued`.**

```sql
create table votes (
  id           uuid primary key default gen_random_uuid(),
  election_id  uuid not null references elections(id),
  category_id  uuid not null references categories(id),
  candidate_id uuid not null references candidates(id),
  cast_on      date not null default current_date   -- COARSE on purpose
);
```

> `cast_on` is a **date, not a timestamp**. Full-precision times would let `votes` and `ballot_issued` be re-linked by ordering, breaking secrecy. Do not "upgrade" this column.

**RLS:** **no client SELECT at all** before publish. After publish, results are read through the aggregate view, never the raw table. No direct INSERT — only `cast_vote()`.

---

## 12. cast_vote()  — the atomic, secret write

```sql
create or replace function cast_vote(p_category_id uuid, p_candidate_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare v_election uuid;
begin
  select election_id into v_election from categories where id = p_category_id;

  -- 1. election must be OPEN and within window
  if not exists (
    select 1 from elections
    where id = v_election and state = 'OPEN'
      and now() >= coalesce(opens_at, now())
      and now() <  coalesce(closes_at, 'infinity')
  ) then raise exception 'election not open'; end if;

  -- 2. caller must be an approved voter
  if not exists (
    select 1 from profiles
    where id = auth.uid() and voter_status = 'APPROVED'
  ) then raise exception 'not eligible'; end if;

  -- 3. candidate must belong to this category
  if not exists (
    select 1 from candidates where id = p_candidate_id and category_id = p_category_id
  ) then raise exception 'invalid candidate'; end if;

  -- 4. one ballot per (election, category, voter) — insert both rows atomically
  insert into ballot_issued (election_id, category_id, voter_id)
  values (v_election, p_category_id, auth.uid());        -- unique index = idempotency guard

  insert into votes (election_id, category_id, candidate_id)
  values (v_election, p_category_id, p_candidate_id);
end;
$$;

revoke all on function cast_vote(uuid, uuid) from public;
grant execute on function cast_vote(uuid, uuid) to authenticated;
```

The `ballot_issued` unique index is what makes a retried/double-tapped request safe — the second insert fails and the whole transaction rolls back, so no orphan vote is ever written.

---

## 13. decide_review()  — verification decision

```sql
create or replace function decide_review(
  p_submission_id uuid,
  p_member_type   member_type,
  p_urn           text default null,      -- students
  p_username      text default null,      -- staff
  p_dept          text default null,      -- staff
  p_approve       boolean default true
) returns void
language plpgsql security definer set search_path = public
as $$
declare v_profile uuid;
begin
  if not is_reviewer() then raise exception 'forbidden'; end if;
  select profile_id into v_profile from verification_submissions where id = p_submission_id;

  if p_approve then
    insert into voter_identity
      (profile_id, member_type, urn_normalized, staff_username, department_code, reviewed_by)
    values
      (v_profile, p_member_type,
       case when p_member_type='STUDENT'
            then upper(replace(p_urn,'-','')) end,
       case when p_member_type='STAFF' then lower(p_username) end,
       case when p_member_type='STAFF' then p_dept end,
       auth.uid());
    update profiles set member_type = p_member_type, voter_status = 'APPROVED' where id = v_profile;
  else
    update profiles set voter_status = 'REJECTED' where id = v_profile;
  end if;

  -- delete the card image + close the submission
  update verification_submissions
    set status = case when p_approve then 'APPROVED' else 'REJECTED' end,
        id_card_path = null, decided_at = now(), decided_by = auth.uid()
  where id = p_submission_id;
  -- (the storage object is removed by the server action / purge job)

  insert into audit_log (actor_id, action, entity_type, entity_id, detail)
  values (auth.uid(),
          case when p_approve then 'VERIFY_APPROVE' else 'VERIFY_REJECT' end,
          'profile', v_profile, jsonb_build_object('member_type', p_member_type));
end;
$$;
```

A unique-violation on `urn_normalized` or `staff_username` here means a duplicate registration attempt — the transaction aborts and nothing is approved.

---

## 14. election_results  — post-publish aggregate

```sql
create view election_results as
select c.election_id, cat.id as category_id, cat.name as category_name,
       cand.id as candidate_id, cand.display_name,
       count(v.id) as vote_count,
       rank() over (partition by cat.id order by count(v.id) desc) as result_rank
from categories cat
join elections e   on e.id = cat.election_id and e.state = 'PUBLISHED'
join candidates cand on cand.category_id = cat.id
left join votes v  on v.candidate_id = cand.id
join candidates c  on c.id = cand.id
group by c.election_id, cat.id, cand.id;
```

The UI joins `result_rank` to `awards.label` to show "King / Queen / Prince / Princess". Exposed only for `PUBLISHED` elections; reveals counts, never voters.

---

## 15. audit_log  — append-only

```sql
create table audit_log (
  id          bigint generated always as identity primary key,
  actor_id    uuid references profiles(id),   -- null = system
  action      text not null,
  entity_type text,
  entity_id   uuid,
  detail      jsonb,
  created_at  timestamptz not null default now()
);
revoke update, delete on audit_log from public, authenticated;
```

**RLS:** Admins read; inserts happen inside the SECURITY DEFINER functions; no update/delete path exists for anyone.

---

## 16. tie_resolutions

```sql
create table tie_resolutions (
  id            uuid primary key default gen_random_uuid(),
  election_id   uuid not null references elections(id),
  category_id   uuid not null references categories(id),
  resolved_by   uuid not null references profiles(id),
  justification text not null,
  resolution    jsonb not null,      -- candidate_id -> final rank
  created_at    timestamptz not null default now()
);
```

Publication of an election with a detected tie is blocked until a matching row exists.

---

## 17. Constraint / invariant checklist

- [ ] RLS enabled on **every** table.
- [ ] `votes` has no `voter_id` and no FK to `ballot_issued`.
- [ ] `votes.cast_on` is a `date`, never a timestamp.
- [ ] `cast_vote()` and `decide_review()` are the only writers of their tables; direct grants revoked.
- [ ] Unique partial indexes on `urn_normalized` and `staff_username`.
- [ ] `audit_log` has no update/delete path.
- [ ] Service-role key never shipped to the client.
