-- Verification RPCs. `verification_submissions`, `voter_identity` and the
-- verification-related columns of `profiles` have no direct write grants; these
-- two functions are their only writers (invariant 3).

-- --------------------------------------------------------- staff usernames --
-- lowercased full name, non-alphanumerics collapsed to '_', always suffixed
-- with a department code, trailing _2 / _3 on a same-name-same-department clash.
-- The physical staff card remains the real anti-duplication anchor; this is a
-- handle (AGENTS.md, identity rules).

create or replace function generate_staff_username(p_full_name text, p_dept text)
returns text
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_base      text;
  v_candidate text;
  v_n         int := 1;
begin
  v_base := regexp_replace(lower(trim(coalesce(p_full_name, ''))), '[^a-z0-9]+', '_', 'g');
  v_base := trim(both '_' from v_base);

  if v_base = '' then
    raise exception 'cannot derive a username from an empty name' using errcode = 'EV021';
  end if;

  v_base := v_base || '_' || regexp_replace(lower(coalesce(p_dept, '')), '[^a-z0-9]+', '', 'g');

  v_candidate := v_base;
  while exists (select 1 from voter_identity where staff_username = v_candidate) loop
    v_n := v_n + 1;
    v_candidate := v_base || '_' || v_n;
  end loop;

  return v_candidate;
end;
$$;

grant execute on function generate_staff_username(text, text) to authenticated;

-- ----------------------------------------------------- submit_verification --

create or replace function submit_verification(p_id_card_path text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status voter_status;
  v_id     uuid;
begin
  if auth.uid() is null then
    raise exception 'forbidden' using errcode = 'EV010';
  end if;

  -- FR-3: email confirmation gates entry to verification. It confers nothing
  -- else — `email_confirmed` and `voter_status` stay separate (invariant 9).
  if not exists (
    select 1 from auth.users where id = auth.uid() and email_confirmed_at is not null
  ) then
    raise exception 'confirm your email address first' using errcode = 'EV030';
  end if;

  -- The storage path must live under the caller's own prefix.
  if p_id_card_path is null or p_id_card_path !~ ('^' || auth.uid()::text || '/') then
    raise exception 'invalid id card path' using errcode = 'EV021';
  end if;

  select voter_status into v_status from profiles where id = auth.uid();

  if v_status not in ('UNVERIFIED', 'REJECTED') then
    raise exception 'no verification submission is expected in this state'
      using errcode = 'EV030';
  end if;

  insert into verification_submissions (profile_id, id_card_path)
  values (auth.uid(), p_id_card_path)
  returning id into v_id;

  update profiles set voter_status = 'PENDING' where id = auth.uid();

  return v_id;
end;
$$;

revoke all on function submit_verification(text) from public, anon;
grant execute on function submit_verification(text) to authenticated;

-- ---------------------------------------------------------- decide_review --
-- Returns the storage path of the ID-card image so the calling Server Action
-- can delete the object through the Storage API in the same request
-- (invariant 6). The row's pointer is nulled here regardless.

create or replace function decide_review(
  p_submission_id uuid,
  p_approve       boolean,
  p_member_type   member_type default null,
  p_urn           text default null,
  p_username      text default null,
  p_dept          text default null,
  p_reason        text default null
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile   uuid;
  v_status    voter_status;
  v_path      text;
  v_full_name text;
  v_urn       text;
  v_username  text;
begin
  if not is_reviewer() then
    raise exception 'forbidden' using errcode = 'EV010';
  end if;

  select s.profile_id, s.status, s.id_card_path, p.full_name
    into v_profile, v_status, v_path, v_full_name
  from verification_submissions s
  join profiles p on p.id = s.profile_id
  where s.id = p_submission_id
  for update of s;

  if v_profile is null then
    raise exception 'submission not found' using errcode = 'EV030';
  end if;

  if v_status <> 'PENDING' then
    raise exception 'submission has already been decided' using errcode = 'EV030';
  end if;

  if p_approve then
    if p_member_type is null then
      raise exception 'member type is required to approve' using errcode = 'EV021';
    end if;

    if p_member_type = 'STUDENT' then
      -- Normalise to uppercase, dash-stripped, then re-check the pattern here —
      -- the zod check on the form is UX only (invariant 10).
      v_urn := upper(regexp_replace(coalesce(p_urn, ''), '[^A-Za-z0-9]', '', 'g'));
      if v_urn !~ '^MANATA[0-9]{5}$' then
        raise exception 'registration number must look like MaNaTa-00000'
          using errcode = 'EV021';
      end if;
    else
      if p_dept is null or not exists (
        select 1 from departments where code = p_dept and active
      ) then
        raise exception 'a valid department is required for staff'
          using errcode = 'EV021';
      end if;
      v_username := coalesce(
        nullif(lower(trim(p_username)), ''),
        generate_staff_username(v_full_name, p_dept)
      );
    end if;

    begin
      insert into voter_identity (
        profile_id, member_type, urn_normalized, staff_username,
        department_code, reviewed_by
      )
      values (
        v_profile,
        p_member_type,
        v_urn,
        v_username,
        case when p_member_type = 'STAFF' then p_dept else null end,
        auth.uid()
      );
    exception
      when unique_violation then
        -- FR-6: this identity is already anchored to another account.
        raise exception 'this identity has already been registered'
          using errcode = 'EV020';
    end;

    update profiles
      set member_type = p_member_type, voter_status = 'APPROVED'
    where id = v_profile;
  else
    if nullif(trim(coalesce(p_reason, '')), '') is null then
      raise exception 'a reason is required when rejecting' using errcode = 'EV021';
    end if;

    update profiles set voter_status = 'REJECTED' where id = v_profile;
  end if;

  update verification_submissions
    set status           = case when p_approve then 'APPROVED' else 'REJECTED' end::voter_status,
        id_card_path     = null,
        rejection_reason = case when p_approve then null else trim(p_reason) end,
        decided_at       = now(),
        decided_by       = auth.uid()
  where id = p_submission_id;

  insert into audit_log (actor_id, action, entity_type, entity_id, detail)
  values (
    auth.uid(),
    case when p_approve then 'VERIFY_APPROVE' else 'VERIFY_REJECT' end,
    'profile',
    v_profile,
    jsonb_build_object(
      'submission_id', p_submission_id,
      'member_type', p_member_type,
      'reason', case when p_approve then null else trim(p_reason) end
    )
  );

  return v_path;
end;
$$;

revoke all on function decide_review(uuid, boolean, member_type, text, text, text, text)
  from public, anon;
grant execute on function decide_review(uuid, boolean, member_type, text, text, text, text)
  to authenticated;
