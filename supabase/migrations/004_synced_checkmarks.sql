-- Cook-mode checkmarks sync across devices, and checked steps stop sending reminders.
-- Run once in Supabase: SQL Editor > New query > paste > Run.
alter table meals add column if not exists done_keys jsonb not null default '[]'::jsonb;
alter table scheduled_notifications add column if not exists step_key text;
notify pgrst, 'reload schema';
