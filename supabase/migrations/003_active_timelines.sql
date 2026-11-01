-- Tracks when a timeline was started and finished, for the Active tab.
-- Run once in Supabase: SQL Editor > New query > paste > Run.
alter table meals add column if not exists started_at timestamptz;
alter table meals add column if not exists finished_at timestamptz;
notify pgrst, 'reload schema';
