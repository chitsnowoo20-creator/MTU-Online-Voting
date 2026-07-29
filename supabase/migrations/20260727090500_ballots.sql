-- The secrecy pair. These two tables share no foreign key, and neither carries
-- the other's identifier. That is the whole guarantee — not a query convention.

-- Side A: proves a person voted. Carries no choice.
create table ballot_issued (
  id          uuid primary key default gen_random_uuid(),
  election_id uuid not null references elections (id),
  category_id uuid not null references categories (id),
  voter_id    uuid not null references profiles (id),
  issued_at   timestamptz not null default now(),
  unique (election_id, category_id, voter_id)     -- one ballot per category
);

create index ballot_issued_voter_idx on ballot_issued (voter_id, election_id);

-- Side B: carries the choice. No voter reference, no FK to ballot_issued.
create table votes (
  id           uuid primary key default gen_random_uuid(),
  election_id  uuid not null references elections (id),
  category_id  uuid not null references categories (id),
  candidate_id uuid not null references candidates (id),
  -- COARSE ON PURPOSE (invariant 2). A timestamp here would let votes be
  -- re-ordered against ballot_issued.issued_at and re-linked to voters.
  -- Do not "upgrade" this column, and do not add created_at alongside it.
  cast_on      date not null default current_date
);

create index votes_tally_idx on votes (category_id, candidate_id);

-- ---------------------------------------------------------------------- RLS --

alter table ballot_issued enable row level security;
alter table votes enable row level security;

revoke all on ballot_issued, votes from anon, authenticated;

-- A voter may confirm their own participation — that is all anyone can read.
grant select on ballot_issued to authenticated;

create policy ballot_issued_select_own on ballot_issued
  for select to authenticated
  using (voter_id = auth.uid());

-- votes: RLS enabled, zero policies, zero grants. Nothing selects from this
-- table (invariant 7). Results are read through the election_results view,
-- which aggregates and only exposes PUBLISHED elections.
-- Both tables are written exclusively by cast_vote() (invariant 3).
