-- Habit Tracker — initial schema
-- Run with: supabase db push   (or apply via the Supabase SQL editor)

-- ---------------------------------------------------------------------------
-- profiles: 1:1 with auth.users, holds app-level user data
-- ---------------------------------------------------------------------------
create table public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  timezone     text not null default 'UTC',  -- IANA tz; drives "missed by end of day"
  created_at   timestamptz not null default now()
);

-- Auto-create a profile row when a user signs up.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, split_part(new.email, '@', 1));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- devices: push tokens, one row per (user, device)
-- ---------------------------------------------------------------------------
create table public.devices (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  platform   text not null check (platform in ('ios', 'android', 'huawei')),
  ecosystem  text not null check (ecosystem in ('apns', 'fcm', 'hms')),
  push_token text not null,
  updated_at timestamptz not null default now(),
  unique (user_id, push_token)
);

-- ---------------------------------------------------------------------------
-- habits
-- ---------------------------------------------------------------------------
create table public.habits (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name       text not null,
  archived   boolean not null default false,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- checkins: one completion per (user, habit, local day)
-- ---------------------------------------------------------------------------
create table public.checkins (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  habit_id     uuid not null references public.habits (id) on delete cascade,
  date         date not null,
  completed_at timestamptz not null default now(),
  unique (user_id, habit_id, date)
);

-- ---------------------------------------------------------------------------
-- partnerships: a 1:1 accountability pairing
-- ---------------------------------------------------------------------------
create table public.partnerships (
  id         uuid primary key default gen_random_uuid(),
  user_a     uuid not null references auth.users (id) on delete cascade,
  user_b     uuid not null references auth.users (id) on delete cascade,
  status     text not null default 'pending' check (status in ('pending', 'active', 'ended')),
  created_at timestamptz not null default now(),
  check (user_a <> user_b)
);

-- A user can only have one non-ended partnership at a time.
create unique index partnerships_active_a on public.partnerships (user_a) where status <> 'ended';
create unique index partnerships_active_b on public.partnerships (user_b) where status <> 'ended';

-- ---------------------------------------------------------------------------
-- match_queue: users waiting to be paired
-- ---------------------------------------------------------------------------
create table public.match_queue (
  user_id   uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  joined_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- notifications_log: dedupe so we never nag twice for the same day
-- ---------------------------------------------------------------------------
create table public.notifications_log (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  kind       text not null,            -- e.g. 'missed_checkin'
  ref_date   date not null,
  sent_at    timestamptz not null default now(),
  unique (user_id, kind, ref_date)
);

-- ===========================================================================
-- Row Level Security
-- ===========================================================================
alter table public.profiles        enable row level security;
alter table public.devices         enable row level security;
alter table public.habits          enable row level security;
alter table public.checkins        enable row level security;
alter table public.partnerships    enable row level security;
alter table public.match_queue     enable row level security;
alter table public.notifications_log enable row level security;

-- Helper: is the given user my active partner?
create function public.is_my_partner(other uuid)
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select exists (
    select 1 from public.partnerships p
    where p.status = 'active'
      and (
        (p.user_a = auth.uid() and p.user_b = other) or
        (p.user_b = auth.uid() and p.user_a = other)
      )
  );
$$;

-- profiles: read self + active partner; write self
create policy profiles_select on public.profiles
  for select using (id = auth.uid() or public.is_my_partner(id));
create policy profiles_update on public.profiles
  for update using (id = auth.uid());

-- devices: fully private to the owner
create policy devices_all on public.devices
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- habits: private to the owner
create policy habits_all on public.habits
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- checkins: owner read/write; partner read-only (accountability)
create policy checkins_select on public.checkins
  for select using (user_id = auth.uid() or public.is_my_partner(user_id));
create policy checkins_write on public.checkins
  for insert with check (user_id = auth.uid());
create policy checkins_update on public.checkins
  for update using (user_id = auth.uid());
create policy checkins_delete on public.checkins
  for delete using (user_id = auth.uid());

-- partnerships: visible to either member; either member can update status
create policy partnerships_select on public.partnerships
  for select using (user_a = auth.uid() or user_b = auth.uid());
create policy partnerships_update on public.partnerships
  for update using (user_a = auth.uid() or user_b = auth.uid());

-- match_queue: private to the owner
create policy match_queue_all on public.match_queue
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- notifications_log: owner read-only (writes happen via service role in functions)
create policy notif_select on public.notifications_log
  for select using (user_id = auth.uid());

-- Useful indexes
create index checkins_user_date_idx on public.checkins (user_id, date);
create index habits_user_idx on public.habits (user_id) where archived = false;
