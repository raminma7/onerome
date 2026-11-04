-- OneRome — scheduled jobs & realtime
-- Scheduled jobs run server-side even when every user has closed the browser.
-- All jobs are idempotent: running them twice never produces duplicate effects.

create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;

-- 72h inactivity timer & 48h reminder: every 5 minutes.
select cron.schedule(
  'onerome-connection-timeouts',
  '*/5 * * * *',
  $$select private.process_connection_timeouts();$$
);

-- GDPR retention: daily at 03:17.
select cron.schedule(
  'onerome-purge-expired-data',
  '17 3 * * *',
  $$select private.purge_expired_data();$$
);

-- Web Push fan-out through the `push-dispatch` Edge Function.
-- Requires two Vault secrets (see README): `project_url` and `push_dispatch_secret`.
-- When they are not configured the job is a no-op.
create or replace function private.invoke_push_dispatch()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_url text;
  v_secret text;
begin
  if not exists (select 1 from public.notifications where push_sent_at is null and created_at > now() - interval '15 minutes') then
    return;
  end if;
  select decrypted_secret into v_url from vault.decrypted_secrets where name = 'project_url';
  select decrypted_secret into v_secret from vault.decrypted_secrets where name = 'push_dispatch_secret';
  if v_url is null or v_secret is null then
    return;
  end if;
  perform net.http_post(
    url := v_url || '/functions/v1/push-dispatch',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-dispatch-secret', v_secret),
    body := '{}'::jsonb
  );
end;
$$;

revoke execute on function private.invoke_push_dispatch() from public, anon, authenticated;

select cron.schedule(
  'onerome-push-dispatch',
  '* * * * *',
  $$select private.invoke_push_dispatch();$$
);

-- Realtime: postgres_changes respects RLS, so users only receive rows they can read.
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.notifications;
alter publication supabase_realtime add table public.connections;
alter publication supabase_realtime add table public.connection_participants;
alter publication supabase_realtime add table public.date_plans;
