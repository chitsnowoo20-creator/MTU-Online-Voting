-- Results: the post-publish aggregate view and manual tie resolution.

create table tie_resolutions (
  id            uuid primary key default gen_random_uuid(),
  election_id   uuid not null references elections (id) on delete cascade,
  category_id   uuid not null references categories (id) on delete cascade,
  resolved_by   uuid not null references profiles (id),
  justification text not null,
  resolution    jsonb not null,       -- { candidate_id: final_rank }
  created_at    timestamptz not null default now(),
  unique (category_id),
  constraint justification_not_blank check (nullif(trim(justification), '') is not null)
);

-- ------------------------------------------------------------ tie detection --
-- rank() gives tied candidates the same rank, so an ambiguous award is exactly
-- "more than one candidate sharing a rank that falls inside the awarded ranks".

create or replace function has_unresolved_tie(p_election_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  with tallies as (
    select cat.id as category_id, cand.id as candidate_id, count(v.id) as vote_count
    from categories cat
    join candidates cand on cand.category_id = cat.id
    left join votes v on v.candidate_id = cand.id and v.category_id = cat.id
    where cat.election_id = p_election_id
    group by cat.id, cand.id
  ),
  ranked as (
    select
      category_id,
      rank() over (partition by category_id order by vote_count desc) as result_rank
    from tallies
  ),
  award_counts as (
    select cat.id as category_id, count(a.id) as award_count
    from categories cat
    left join awards a on a.category_id = cat.id
    where cat.election_id = p_election_id
    group by cat.id
  ),
  ambiguous as (
    select r.category_id
    from ranked r
    join award_counts ac on ac.category_id = r.category_id
    where r.result_rank <= ac.award_count
    group by r.category_id, r.result_rank
    having count(*) > 1
  )
  select exists (
    select 1
    from ambiguous a
    where not exists (
      select 1 from tie_resolutions t where t.category_id = a.category_id
    )
  );
$$;

-- Officers need this before publishing, but it must not leak counts — it
-- returns a boolean only.
grant execute on function has_unresolved_tie(uuid) to authenticated;

-- ------------------------------------------------------- election_results --
-- Invariant 7: nothing reads `votes` before publication. This view is the only
-- path to a tally and it filters on state = 'PUBLISHED' itself.
--
-- security_invoker is deliberately OFF: the view runs as its owner so it can
-- aggregate `votes` (which grants SELECT to nobody) while still exposing only
-- counts for published elections. Do not flip this to `on` — it would either
-- break results or require opening `votes` up, and the second one is a bug.

create view election_results with (security_invoker = off) as
select
  cat.election_id,
  cat.id                as category_id,
  cat.name              as category_name,
  cat.display_order     as category_order,
  cand.id               as candidate_id,
  cand.display_name,
  cand.tagline,
  cand.department_code,
  cand.photo_path,
  count(v.id)           as vote_count,
  rank() over (partition by cat.id order by count(v.id) desc) as result_rank
from categories cat
join elections e on e.id = cat.election_id and e.state = 'PUBLISHED'
join candidates cand on cand.category_id = cat.id
left join votes v on v.candidate_id = cand.id and v.category_id = cat.id
group by cat.election_id, cat.id, cand.id;

grant select on election_results to anon, authenticated;

-- ---------------------------------------------------------------------- RLS --

alter table tie_resolutions enable row level security;

revoke all on tie_resolutions from anon, authenticated;
grant select on tie_resolutions to anon, authenticated;
grant insert on tie_resolutions to authenticated;

-- Published justifications are public — that is the point of recording them.
create policy tie_resolutions_select_published on tie_resolutions
  for select to anon, authenticated
  using (election_state_of(election_id) = 'PUBLISHED');

create policy tie_resolutions_select_staff on tie_resolutions
  for select to authenticated
  using (is_officer() or is_admin());

create policy tie_resolutions_insert_officer on tie_resolutions
  for insert to authenticated
  with check (
    is_officer()
    and resolved_by = auth.uid()
    and election_state_of(election_id) = 'CLOSED'
  );

create trigger tie_resolutions_audit
  after insert or update or delete on tie_resolutions
  for each row execute function audit_row_change();
