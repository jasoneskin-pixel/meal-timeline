-- Adds one-off dish cooks ("Cook this dish" without making a meal).
-- Run once in Supabase: SQL Editor > New query > paste > Run.
alter table meals add column if not exists is_quick boolean not null default false;
