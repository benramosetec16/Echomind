-- Supabase Schema for EchoMind
-- Clean up existing tables and triggers if they exist to avoid conflict errors
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user() cascade;
drop trigger if exists set_profiles_updated_at on public.profiles;
drop function if exists public.handle_updated_at() cascade;

drop table if exists public.biometric_logs cascade;
drop table if exists public.aetheric_journal cascade;
drop table if exists public.emotional_checkins cascade;
drop table if exists public.profiles cascade;


-- 1. Profiles Table (extends Supabase Auth)
-- Stores user preferences and specific configurations from the Sanctuary page.
create table public.profiles (
  id uuid references auth.users on delete cascade not null primary key,
  full_name text,
  haptic_intensity integer default 75,
  sync_frequency text default 'instant',
  ghost_mode boolean default false,
  ephemeral_history boolean default true,
  aetheric_proxy boolean default true,
  local_archiving boolean default false,
  focus_latency numeric(4,2) default 0.14,
  sync_integrity numeric(4,1) default 99.8,
  aetheric_yield numeric(4,1) default 8.2,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.profiles enable row level security;

create policy "Users can view their own profile." 
  on profiles for select using (auth.uid() = id);

create policy "Users can update their own profile." 
  on profiles for update using (auth.uid() = id);

-- Trigger to automatically create a profile for a new user
create function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


-- 2. Emotional Check-ins Table (Reflect Page)
-- Stores the valence, sensory texture, and thoughts.
create table public.emotional_checkins (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  valence_value integer not null check (valence_value >= 0 and valence_value <= 100),
  texture text, -- 'focus', 'calm', 'anxiety', 'bloom'
  thoughts text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.emotional_checkins enable row level security;

create policy "Users can view their own check-ins." 
  on emotional_checkins for select using (auth.uid() = user_id);

create policy "Users can insert their own check-ins." 
  on emotional_checkins for insert with check (auth.uid() = user_id);

create policy "Users can delete their own check-ins." 
  on emotional_checkins for delete using (auth.uid() = user_id);


-- 3. Aetheric Journal Table (Pulse Page)
-- Stores individual journal entries from the Emotional History page.
create table public.aetheric_journal (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  title text not null,
  sentiment_tag text not null, -- 'Serenity', 'Turbulence', 'Equilibrium', etc.
  sentiment_dots integer not null check (sentiment_dots >= 1 and sentiment_dots <= 5),
  icon text not null default 'auto_awesome',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.aetheric_journal enable row level security;

create policy "Users can view their own journal entries." 
  on aetheric_journal for select using (auth.uid() = user_id);

create policy "Users can insert their own journal entries." 
  on aetheric_journal for insert with check (auth.uid() = user_id);

create policy "Users can update their own journal entries." 
  on aetheric_journal for update using (auth.uid() = user_id);

create policy "Users can delete their own journal entries." 
  on aetheric_journal for delete using (auth.uid() = user_id);


-- 4. Biometric Logs / Alerts Table (Harmony Page)
-- Stores the daily diagnostics, alerts, and system logs.
create table public.biometric_logs (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  title text not null,
  description text,
  type text not null check (type in ('info', 'normal', 'critical', 'warning')),
  bpm integer, -- Optional: used for stress peaks
  is_dismissed boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.biometric_logs enable row level security;

create policy "Users can view their own logs." 
  on biometric_logs for select using (auth.uid() = user_id);

create policy "Users can insert their own logs." 
  on biometric_logs for insert with check (auth.uid() = user_id);

create policy "Users can update their own logs." 
  on biometric_logs for update using (auth.uid() = user_id);


-- Function to update the updated_at timestamp on profiles
create function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger set_profiles_updated_at
  before update on public.profiles
  for each row execute procedure public.handle_updated_at();
