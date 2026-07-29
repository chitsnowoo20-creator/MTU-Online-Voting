-- Append-only audit log (invariant 8: every privileged mutation is logged).
--
-- Deliberate exception: `cast_vote()` writes NO audit row. An audit entry
-- carries an actor and a timestamp; pairing that with a vote would recreate the
-- voter -> choice link that invariants 1 and 2 exist to prevent. The compensating
-- record for voting is `ballot_issued` (who voted, never what).

create table audit_log (
  id          bigint generated always as identity primary key,
  actor_id    uuid references profiles (id),   -- null = system (cron)
  action      text not null,
  entity_type text,
  entity_id   uuid,
  detail      jsonb,
  created_at  timestamptz not null default now()
);

create index audit_log_created_at_idx on audit_log (created_at desc);
create index audit_log_actor_idx on audit_log (actor_id, created_at desc);
create index audit_log_action_idx on audit_log (action, created_at desc);

-- Append-only, enforced structurally rather than by convention.
create or replace function audit_log_is_immutable()
returns trigger
language plpgsql
as $$
begin
  raise exception 'audit_log is append-only' using errcode = 'EV010';
end;
$$;

create trigger audit_log_no_update
  before update or delete on audit_log
  for each row execute function audit_log_is_immutable();

-- Generic row-change auditor. Attached to tables whose writes go through RLS
-- rather than through an RPC (candidates, categories, awards, departments,
-- user_roles), so that "privileged write" and "audit row" cannot drift apart.
--
-- SECURITY DEFINER because `authenticated` has no INSERT grant on audit_log.
create or replace function audit_row_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row       jsonb := coalesce(to_jsonb(new), to_jsonb(old));
  v_entity_id uuid;
begin
  v_entity_id := coalesce(
    nullif(v_row ->> 'id', ''),
    nullif(v_row ->> 'profile_id', '')
  )::uuid;

  insert into audit_log (actor_id, action, entity_type, entity_id, detail)
  values (
    auth.uid(),
    upper(tg_table_name) || '_' || tg_op,
    tg_table_name,
    v_entity_id,
    case
      when tg_op = 'UPDATE' then jsonb_build_object('before', to_jsonb(old), 'after', to_jsonb(new))
      else v_row
    end
  );

  return coalesce(new, old);
end;
$$;

create trigger user_roles_audit
  after insert or update or delete on user_roles
  for each row execute function audit_row_change();

create trigger departments_audit
  after insert or update or delete on departments
  for each row execute function audit_row_change();

-- ---------------------------------------------------------------------- RLS --

alter table audit_log enable row level security;

revoke all on audit_log from anon, authenticated;
grant select on audit_log to authenticated;

create policy audit_log_select_admin on audit_log
  for select to authenticated
  using (is_admin());

-- No insert/update/delete policy exists, and none should: rows arrive only from
-- SECURITY DEFINER functions and triggers.
