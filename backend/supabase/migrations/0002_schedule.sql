-- Schedule the missed-checkin sweep with pg_cron + pg_net.
-- Prereqs (run once, with your real values):
--   alter database postgres set app.settings.cron_secret  = 'YOUR_CRON_SECRET';
--   alter database postgres set app.settings.functions_url = 'https://<ref>.functions.supabase.co';

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Remove a previous schedule of the same name (idempotent re-runs).
select cron.unschedule('missed-checkin-sweep')
where exists (select 1 from cron.job where jobname = 'missed-checkin-sweep');

-- Run hourly; the function itself respects each user's local NAG_HOUR.
select cron.schedule(
  'missed-checkin-sweep',
  '0 * * * *',
  $$
  select net.http_post(
    url     := current_setting('app.settings.functions_url') || '/missed-checkin-sweep',
    headers := jsonb_build_object(
                 'Content-Type', 'application/json',
                 'x-cron-secret', current_setting('app.settings.cron_secret')
               ),
    body    := '{}'::jsonb
  );
  $$
);
