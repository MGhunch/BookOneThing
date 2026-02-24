-- Enable pg_cron (run once — safe to re-run)
create extension if not exists pg_cron;

-- Schedule send-reminders edge function daily at 8am UTC
select cron.schedule(
  'send-daily-reminders',
  '0 8 * * *',
  $$
  select net.http_post(
    url    := current_setting('app.supabase_url') || '/functions/v1/send-reminders',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.supabase_service_role_key'),
      'Content-Type', 'application/json'
    ),
    body   := '{}'::jsonb
  );
  $$
);
