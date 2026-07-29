-- Elections and the ballot structure: categories, awards, candidates.
--
-- Titles are configurable per election (AGENTS.md): an award is a (rank, label)
-- pair and the label is free text. Nothing here hard-codes "King" or "Queen".

create table elections (
  id                    uuid primary key default gen_random_uuid(),
  name                  text not null,
  state                 election_state not null default 'DRAFT',
  opens_at              timestamptz,
  closes_at             timestamptz,
  verification_deadline timestamptz,
  created_by            uuid not null references profiles (id),
  created_at            timestamptz not null default now(),

  constraint election_window check (
    closes_at is null or opens_at is null or closes_at > opens_at
  ),
  -- The deadline is the last moment a voter can be verified for this election,
  -- so it cannot fall after voting has already started.
  constraint verification_before_open check (
    verification_deadline is null or opens_at is null or verification_deadline <= opens_at
  )
);

create index elections_state_idx on elections (state);

create table categories (
  id            uuid primary key default gen_random_uuid(),
  election_id   uuid not null references elections (id) on delete cascade,
  name          text not null,                 -- 'Male', 'Female' — free text
  display_order int not null default 0
);

create index categories_election_idx on categories (election_id, display_order);

create table awards (
  id          uuid primary key default gen_random_uuid(),
  category_id uuid not null references categories (id) on delete cascade,
  rank        int not null,                    -- 1, 2, ...
  label       text not null,                   -- 'King', 'Prince' — free text
  unique (category_id, rank),
  constraint award_rank_positive check (rank >= 1)
);

-- A standalone content record, NOT a user account. There is deliberately no
-- profile_id here: without it there is no path from a voter to a candidate
-- (AGENTS.md, identity rules).
create table candidates (
  id              uuid primary key default gen_random_uuid(),
  category_id     uuid not null references categories (id) on delete cascade,
  display_name    text not null,
  tagline         text,
  department_code text references departments (code),
  photo_path      text not null,
  display_order   int not null default 0
);

create index candidates_category_idx on candidates (category_id, display_order);

-- ------------------------------------------------------------- RLS helpers --
-- SECURITY DEFINER lookups so policies on child tables don't have to re-enter
-- the parent table's own policies.

create or replace function election_state_of(p_election_id uuid)
returns election_state
language sql
stable
security definer
set search_path = public
as $$
  select state from elections where id = p_election_id;
$$;

create or replace function election_of_category(p_category_id uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select election_id from categories where id = p_category_id;
$$;

grant execute on function election_state_of(uuid), election_of_category(uuid)
  to anon, authenticated;

-- ---------------------------------------------------------------------- RLS --

alter table elections enable row level security;
alter table categories enable row level security;
alter table awards enable row level security;
alter table candidates enable row level security;

revoke all on elections, categories, awards, candidates from anon, authenticated;
grant select on elections, categories, awards, candidates to anon, authenticated;

-- `state` is deliberately excluded from the update grant: the lifecycle moves
-- only through transition_election() (invariant 10 / lifecycle rules).
grant insert, delete on elections to authenticated;
grant update (name, opens_at, closes_at, verification_deadline) on elections to authenticated;
grant insert, update, delete on categories, awards, candidates to authenticated;

-- elections ------------------------------------------------------------------

create policy elections_select_public on elections
  for select to anon, authenticated
  using (state in ('OPEN', 'CLOSED', 'PUBLISHED'));

create policy elections_select_staff on elections
  for select to authenticated
  using (is_officer() or is_admin());

create policy elections_insert_officer on elections
  for insert to authenticated
  with check (is_officer() and state = 'DRAFT' and created_by = auth.uid());

create policy elections_update_officer_draft on elections
  for update to authenticated
  using (is_officer() and state = 'DRAFT')
  with check (is_officer() and state = 'DRAFT');

create policy elections_delete_officer_draft on elections
  for delete to authenticated
  using (is_officer() and state = 'DRAFT');

-- categories / awards / candidates -------------------------------------------
-- Readable alongside their election; structurally editable only in DRAFT.

create policy categories_select on categories
  for select to anon, authenticated
  using (
    election_state_of(election_id) in ('OPEN', 'CLOSED', 'PUBLISHED')
    or is_officer()
    or is_admin()
  );

create policy categories_write_officer_draft on categories
  for all to authenticated
  using (is_officer() and election_state_of(election_id) = 'DRAFT')
  with check (is_officer() and election_state_of(election_id) = 'DRAFT');

create policy awards_select on awards
  for select to anon, authenticated
  using (
    election_state_of(election_of_category(category_id)) in ('OPEN', 'CLOSED', 'PUBLISHED')
    or is_officer()
    or is_admin()
  );

create policy awards_write_officer_draft on awards
  for all to authenticated
  using (is_officer() and election_state_of(election_of_category(category_id)) = 'DRAFT')
  with check (is_officer() and election_state_of(election_of_category(category_id)) = 'DRAFT');

create policy candidates_select on candidates
  for select to anon, authenticated
  using (
    election_state_of(election_of_category(category_id)) in ('OPEN', 'CLOSED', 'PUBLISHED')
    or is_officer()
    or is_admin()
  );

create policy candidates_write_officer_draft on candidates
  for all to authenticated
  using (is_officer() and election_state_of(election_of_category(category_id)) = 'DRAFT')
  with check (is_officer() and election_state_of(election_of_category(category_id)) = 'DRAFT');

-- Invariant 8: candidate / category / award changes are privileged mutations.
create trigger elections_audit
  after insert or update or delete on elections
  for each row execute function audit_row_change();

create trigger categories_audit
  after insert or update or delete on categories
  for each row execute function audit_row_change();

create trigger awards_audit
  after insert or update or delete on awards
  for each row execute function audit_row_change();

create trigger candidates_audit
  after insert or update or delete on candidates
  for each row execute function audit_row_change();
