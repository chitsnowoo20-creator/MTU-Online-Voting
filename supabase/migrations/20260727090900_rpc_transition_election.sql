-- transition_election() — the only path through the lifecycle.
--
--   DRAFT → CANDIDATES_LOCKED → OPEN → CLOSED → PUBLISHED
--
-- Forward-only and one step at a time. `elections.state` has no UPDATE grant,
-- so this function (and auto_close_elections()) are the only ways it moves.
--
-- TODO(maintainer): should CANDIDATES_LOCKED be reversible back to DRAFT? No
-- votes exist yet at that point, so it would be safe, but the documented
-- lifecycle is one-directional and I did not want to widen it unasked.

create or replace function transition_election(
  p_election_id uuid,
  p_to          election_state,
  p_note        text default null
)
returns election_state
language plpgsql
security definer
set search_path = public
as $$
declare
  v_from      election_state;
  v_opens_at  timestamptz;
  v_closes_at timestamptz;
  v_offender  text;
begin
  if not is_officer() then
    raise exception 'forbidden' using errcode = 'EV010';
  end if;

  select state, opens_at, closes_at
    into v_from, v_opens_at, v_closes_at
  from elections
  where id = p_election_id
  for update;

  if v_from is null then
    raise exception 'election not found' using errcode = 'EV011';
  end if;

  -- Guard the null case explicitly: `(a, null) not in (...)` evaluates to NULL,
  -- which would fall straight through the check below.
  if p_to is null then
    raise exception 'target state is required' using errcode = 'EV011';
  end if;

  if (v_from, p_to) not in (
    ('DRAFT'::election_state, 'CANDIDATES_LOCKED'::election_state),
    ('CANDIDATES_LOCKED', 'OPEN'),
    ('OPEN', 'CLOSED'),
    ('CLOSED', 'PUBLISHED')
  ) then
    raise exception 'cannot move an election from % to %', v_from, p_to
      using errcode = 'EV011';
  end if;

  if p_to = 'CANDIDATES_LOCKED' then
    if not exists (select 1 from categories where election_id = p_election_id) then
      raise exception 'add at least one category before locking candidates'
        using errcode = 'EV013';
    end if;

    -- Every category needs awards to hand out and enough candidates to fill them.
    select cat.name into v_offender
    from categories cat
    where cat.election_id = p_election_id
      and (
        (select count(*) from awards a where a.category_id = cat.id) = 0
        or (select count(*) from candidates c where c.category_id = cat.id) = 0
        or (select count(*) from candidates c where c.category_id = cat.id)
           < (select count(*) from awards a where a.category_id = cat.id)
      )
    limit 1;

    if v_offender is not null then
      raise exception
        'category "%" needs at least one award and at least as many candidates as awards',
        v_offender using errcode = 'EV013';
    end if;
  end if;

  if p_to = 'OPEN' then
    if v_opens_at is null or v_closes_at is null then
      raise exception 'set the opening and closing times before opening voting'
        using errcode = 'EV013';
    end if;
    if v_closes_at <= now() then
      raise exception 'the closing time has already passed' using errcode = 'EV013';
    end if;
  end if;

  if p_to = 'PUBLISHED' and has_unresolved_tie(p_election_id) then
    raise exception 'resolve the tied categories before publishing'
      using errcode = 'EV012';
  end if;

  update elections set state = p_to where id = p_election_id;

  insert into audit_log (actor_id, action, entity_type, entity_id, detail)
  values (
    auth.uid(),
    'ELECTION_TRANSITION',
    'election',
    p_election_id,
    jsonb_build_object('from', v_from, 'to', p_to, 'note', nullif(trim(coalesce(p_note, '')), ''))
  );

  return p_to;
end;
$$;

revoke all on function transition_election(uuid, election_state, text) from public, anon;
grant execute on function transition_election(uuid, election_state, text) to authenticated;
