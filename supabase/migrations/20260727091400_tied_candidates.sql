-- tied_candidates() — the minimum disclosure needed to resolve a tie.
--
-- FR-20 requires an officer to break ties by hand, which is impossible without
-- knowing *who* tied. This returns exactly that and nothing more:
--
--   * no vote counts, ever — the tallies are computed inside and discarded;
--   * only candidates sharing a rank that carries an award, so a tie for last
--     place stays invisible;
--   * only while the election is CLOSED, and only to an officer.
--
-- That keeps invariant 7 intact in substance: no tally is readable before
-- publication. What leaks is "these two are level", which is the irreducible
-- fact the officer is being asked to arbitrate.

create or replace function tied_candidates(p_election_id uuid)
returns table (
  category_id   uuid,
  category_name text,
  result_rank   int,
  candidate_id  uuid,
  display_name  text
)
language sql
stable
security definer
set search_path = public
as $$
  with allowed as (
    select 1
    from elections e
    where e.id = p_election_id
      and e.state = 'CLOSED'
      and is_officer()
  ),
  tallies as (
    select
      cat.id   as category_id,
      cat.name as category_name,
      cand.id  as candidate_id,
      cand.display_name,
      count(v.id) as vote_count
    from categories cat
    join candidates cand on cand.category_id = cat.id
    left join votes v on v.candidate_id = cand.id and v.category_id = cat.id
    where cat.election_id = p_election_id
      and exists (select 1 from allowed)
    group by cat.id, cat.name, cand.id, cand.display_name
  ),
  ranked as (
    select
      t.*,
      rank() over (partition by t.category_id order by t.vote_count desc) as result_rank
    from tallies t
  ),
  award_counts as (
    select cat.id as category_id, count(a.id) as award_count
    from categories cat
    left join awards a on a.category_id = cat.id
    where cat.election_id = p_election_id
    group by cat.id
  ),
  ambiguous as (
    select r.category_id, r.result_rank
    from ranked r
    join award_counts ac on ac.category_id = r.category_id
    where r.result_rank <= ac.award_count
    group by r.category_id, r.result_rank
    having count(*) > 1
  )
  select
    r.category_id,
    r.category_name,
    r.result_rank::int,
    r.candidate_id,
    r.display_name
  from ranked r
  join ambiguous a
    on a.category_id = r.category_id
   and a.result_rank = r.result_rank
  order by r.category_name, r.result_rank, r.display_name;
$$;

revoke all on function tied_candidates(uuid) from public, anon;
grant execute on function tied_candidates(uuid) to authenticated;
