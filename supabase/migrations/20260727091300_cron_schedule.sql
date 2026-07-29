-- Schedule the jobs from 20260727091100_cron.sql.
--
-- That migration ran before pg_cron was enabled on the project, so its DO block
-- took the "skip with a notice" path and nothing was scheduled. The functions
-- themselves exist; this only registers them. Idempotent — safe to re-run.

do $$
begin
  if not exists (select 1 from pg_extension where extname = 'pg_cron') then
    raise notice 'pg_cron is still not installed; nothing scheduled';
    return;
  end if;

  perform cron.unschedule(jobname)
  from cron.job
  where jobname in ('auto-close-elections', 'purge-id-images');

  -- Every minute: an election past closes_at cannot stay open by oversight.
  perform cron.schedule(
    'auto-close-elections', '* * * * *', 'select public.auto_close_elections()'
  );

  -- Nightly: retention backstop for ID-card images (NFR-7).
  perform cron.schedule(
    'purge-id-images', '15 3 * * *', 'select public.purge_id_images()'
  );
exception
  when insufficient_privilege or undefined_table or undefined_function then
    raise notice 'could not schedule cron jobs: %', sqlerrm;
end;
$$;
