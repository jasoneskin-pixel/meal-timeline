-- Meal Timeline database schema.
-- Run this once in Supabase: Dashboard > SQL Editor > New query > paste > Run.

create extension if not exists pgcrypto;

create table if not exists dishes (
  id uuid primary key default gen_random_uuid(),
  owner text not null default 'owner',
  name text not null,
  emoji text not null default '🍽️',
  color text not null default '#e4572e',
  steps jsonb not null default '[]'::jsonb,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists meals (
  id uuid primary key default gen_random_uuid(),
  owner text not null default 'owner',
  name text not null,
  serve_at timestamptz not null,
  deadline_mode text not null default 'all' check (deadline_mode in ('all', 'individual')),
  timezone text not null default 'America/New_York',
  reminder_lead_min integer not null default 5,
  reminders_on boolean not null default true,
  in_library boolean not null default false,
  is_quick boolean not null default false,
  notes text,
  dishes jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists push_subscriptions (
  endpoint text primary key,
  owner text not null default 'owner',
  subscription jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists scheduled_notifications (
  id uuid primary key default gen_random_uuid(),
  owner text not null default 'owner',
  meal_id uuid references meals(id) on delete cascade,
  fire_at timestamptz not null,
  title text not null,
  body text not null,
  url text,
  kind text,
  sent_at timestamptz
);
create index if not exists scheduled_notifications_due on scheduled_notifications (fire_at) where sent_at is null;

create table if not exists login_attempts (
  key text primary key,
  failures integer not null default 0,
  locked_until timestamptz,
  updated_at timestamptz not null default now()
);

-- Lock every table down. The app talks to the database only from the server
-- with the service role key, which bypasses these. The public key can read nothing.
alter table dishes enable row level security;
alter table meals enable row level security;
alter table push_subscriptions enable row level security;
alter table scheduled_notifications enable row level security;
alter table login_attempts enable row level security;
