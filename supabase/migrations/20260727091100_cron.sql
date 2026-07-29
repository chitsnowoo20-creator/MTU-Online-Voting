-- Scheduled jobs.
--
--   auto_close_elections()  a forgotten manual close cannot leave voting open
--   purge_id_images()       retention backstop for ID-card images (NFR-7)

create or replace function auto_close_elections()
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row   record;
  v_count int := 0;
begin
  for v_row in
    update elections
      set state = 'CLOSED'
    where state = 'OPEN' and closes_at is not null and closes_at <= now()
    returning id
  loop
    -- actor_id null = the system did this, not a person.
    insert into audit_log (actor_id, action, entity_type, entity_id, detail)
    values (
      null,
      'ELECTION_TRANSITION',
      'election',
      v_row.id,
      jsonb_build_object('from', 'OPEN', 'to', 'CLOSED', 'note', 'auto-closed at closes_at')
    );
    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

revoke all on function auto_close_elections() from public, anon, authenticated;

-- Deletes the storage rows for any ID-card object that is not backing a
-- currently-PENDING submission, plus anything past the retention window.
--
-- NOTE(maintainer): this removes the object *metadata row*. Supabase Storage
-- keeps the underlying file in the object store, so the authoritative deletion
-- is the Storage API call the Reviewer's Server Action makes with the path
-- decide_review() returns. This job is the backstop for the case where that
-- call failed or the image was never decided.
-- TODO(maintainer): if we want the file itself removed on this path too, this
-- needs pg_net calling the Storage API (or a small scheduled Edge Function).
create or replace function purge_id_images(p_retain interval default interval '7 days')
returns int
language plpgsql
security definer
set search_path = public, storage
as $$
declare
  v_count int;
begin
  with deleted as (
    delete from storage.objects o
    where o.bucket_id = 'id-cards'
      and (
        o.created_at < now() - p_retain
        or not exists (
          select 1
          from verification_submissions s
          where s.status = 'PENDING' and s.id_card_path = o.name
        )
      )
    returning 1
  )
  select count(*) into v_count from deleted;

  if v_count > 0 then
    insert into audit_log (actor_id, action, entity_type, entity_id, detail)
    values (null, 'PURGE_ID_IMAGES', 'storage', null,
            jsonb_build_object('objects_removed', v_count));
  end if;

  return v_count;
end;
$$;

revoke all on function purge_id_images(interval) from public, anon, authenticated;

-- ------------------------------------------------------------------ pg_cron --
-- pg_cron may need enabling from the Supabase dashboard (Database → Extensions)
-- before this block can schedule anything. It is wrapped so a project without
-- the extension still applies the rest of the migration.

do $$
begin
  if not exists (select 1 from pg_extension where extname = 'pg_cron') then
    raise notice 'pg_cron is not installed; skipping job scheduling';
    return;
  end if;

  perform cron.unschedule(jobname)
  from cron.job
  where jobname in ('auto-close-elections', 'purge-id-images');

  perform cron.schedule(
    'auto-close-elections', '* * * * *', 'select public.auto_close_elections()'
  );
  perform cron.schedule(
    'purge-id-images', '15 3 * * *', 'select public.purge_id_images()'
  );
exception
  when insufficient_privilege or undefined_table or undefined_function then
    raise notice 'could not schedule cron jobs: %', sqlerrm;
end;
$$;
