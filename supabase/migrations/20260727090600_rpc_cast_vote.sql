-- cast_vote() — the atomic, secret write.
--
-- This is the ONLY writer of `ballot_issued` and `votes` (invariant 3). It
-- deliberately writes no audit_log row: an actor + timestamp next to a choice
-- would undo the secrecy the two-table split buys us.

create or replace function cast_vote(p_category_id uuid, p_candidate_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_election uuid;
begin
  select election_id into v_election from categories where id = p_category_id;
  if v_election is null then
    raise exception 'unknown category' using errcode = 'EV003';
  end if;

  -- 1. the election must be OPEN *and* inside its window
  if not exists (
    select 1
    from elections
    where id = v_election
      and state = 'OPEN'
      and now() >= coalesce(opens_at, now())
      and now() < coalesce(closes_at, 'infinity'::timestamptz)
  ) then
    raise exception 'election is not open for voting' using errcode = 'EV001';
  end if;

  -- 2. the caller must be an approved voter
  if not exists (
    select 1 from profiles where id = auth.uid() and voter_status = 'APPROVED'
  ) then
    raise exception 'not an approved voter' using errcode = 'EV002';
  end if;

  -- 3. FR-8: approval that landed after this election's verification deadline
  --    does not confer eligibility *for this election*.
  if not exists (
    select 1
    from voter_identity vi
    join elections e on e.id = v_election
    where vi.profile_id = auth.uid()
      and (e.verification_deadline is null or vi.reviewed_at <= e.verification_deadline)
  ) then
    raise exception 'verified after this election''s verification deadline'
      using errcode = 'EV005';
  end if;

  -- 4. the candidate must belong to the category being voted in
  if not exists (
    select 1 from candidates where id = p_candidate_id and category_id = p_category_id
  ) then
    raise exception 'candidate is not in this category' using errcode = 'EV003';
  end if;

  -- 5. both rows, one transaction. The unique index on ballot_issued is the
  --    idempotency guard (FR-17): a double-tap fails here and rolls the whole
  --    transaction back, so no orphan vote can be written.
  begin
    insert into ballot_issued (election_id, category_id, voter_id)
    values (v_election, p_category_id, auth.uid());
  exception
    when unique_violation then
      raise exception 'you have already voted in this category' using errcode = 'EV004';
  end;

  insert into votes (election_id, category_id, candidate_id)
  values (v_election, p_category_id, p_candidate_id);
end;
$$;

revoke all on function cast_vote(uuid, uuid) from public, anon;
grant execute on function cast_vote(uuid, uuid) to authenticated;
