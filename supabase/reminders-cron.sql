-- Sends due reminders every minute, even when the app is closed.
-- Run this AFTER the app is live on its production URL.
-- Replace the two placeholders below before running.

create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.unschedule('meal-timeline-reminders')
where exists (select 1 from cron.job where jobname = 'meal-timeline-reminders');

select cron.schedule(
  'meal-timeline-reminders',
  '* * * * *',
  $$
  select net.http_post(
    url := 'https://YOUR-APP.vercel.app/api/cron/send',
    headers := jsonb_build_object(
      'Authorization', 'Bearer YOUR_CRON_SECRET',
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
  $$
);
