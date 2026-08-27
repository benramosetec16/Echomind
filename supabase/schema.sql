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
drop table if exists public.classrooms cascade;
drop table if exists public.institutions cascade;


-- 0.1 Institutions Table
create table public.institutions (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.institutions enable row level security;
create policy "Anyone can view institutions." 
  on institutions for select using (true);

-- 0.2 Classrooms Table (Turmas)
create table public.classrooms (
  id uuid default gen_random_uuid() primary key,
  institution_id uuid references public.institutions(id) on delete cascade not null,
  name text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.classrooms enable row level security;
create policy "Anyone can view classrooms." 
  on classrooms for select using (true);

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
  role text default 'aluno',
  
  -- Institutional fields (nullable for backward compatibility with old accounts)
  institution_id uuid references public.institutions(id) on delete set null,
  classroom_id uuid references public.classrooms(id) on delete set null,
  professor_id uuid references public.profiles(id) on delete set null,
  orientador_id uuid references public.profiles(id) on delete set null,
  
  -- Guardian fields
  guardian_name text,
  guardian_phone text,

  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.profiles enable row level security;

-- 1.5 Messages Table (Etapa 7)
create table public.messages (
  id uuid default gen_random_uuid() primary key,
  sender_id uuid references public.profiles(id) on delete cascade not null,
  receiver_id uuid references public.profiles(id) on delete cascade not null,
  content text not null,
  type text default 'text' check (type in ('text', 'session_request')),
  is_read boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.messages enable row level security;
create policy "Users can view their own messages." 
  on messages for select using (auth.uid() = sender_id or auth.uid() = receiver_id);
create policy "Users can insert their own messages." 
  on messages for insert with check (auth.uid() = sender_id);

create policy "Users can view their own profile." 
  on profiles for select using (auth.uid() = id);

create policy "Users can update their own profile." 
  on profiles for update using (auth.uid() = id);

-- Trigger to automatically create a profile for a new user
create function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (
    id, full_name, role, guardian_name, guardian_phone, institution_id, classroom_id
  )
  values (
    new.id,
    new.raw_user_meta_data->>'full_name',
    coalesce(new.raw_user_meta_data->>'role', 'aluno'),
    new.raw_user_meta_data->>'guardian_name',
    new.raw_user_meta_data->>'guardian_phone',
    nullif(new.raw_user_meta_data->>'institution_id', '')::uuid,
    nullif(new.raw_user_meta_data->>'classroom_id', '')::uuid
  );
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

-- 5. Educational Videos Table
create table public.educational_videos (
  id uuid default gen_random_uuid() primary key,
  disciplina text not null,
  assunto text not null,
  subtopicos text[],
  palavras_chave text[],
  titulo text not null,
  canal text,
  video_id text not null,
  duracao integer, -- em segundos
  nivel text check (nivel in ('Fundamental', 'Médio', 'Superior', 'Livre')),
  idioma text default 'pt-BR',
  descricao text,
  prioridade integer default 0,
  ativo boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.educational_videos enable row level security;

create policy "Anyone can view active educational videos" 
  on public.educational_videos for select using (ativo = true);

create policy "Admins can manage educational videos"
  on public.educational_videos for all 
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.role = 'admin'
    )
  );

-- 6. Accessibility Preferences Table
create table public.accessibility_preferences (
  user_id uuid references public.profiles(id) on delete cascade not null primary key,
  font_size text default 'medium' check (font_size in ('small', 'medium', 'large', 'x-large')),
  high_contrast boolean default false,
  reduced_motion boolean default false,
  simplified_interface boolean default false,
  study_explanation_style text default 'standard' check (study_explanation_style in ('standard', 'detailed', 'step_by_step', 'simplified')),
  response_style text default 'standard' check (response_style in ('standard', 'objective', 'detailed')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.accessibility_preferences enable row level security;

create policy "Users can view their own accessibility preferences." 
  on accessibility_preferences for select using (auth.uid() = user_id);

create policy "Users can insert their own accessibility preferences." 
  on accessibility_preferences for insert with check (auth.uid() = user_id);

create policy "Users can update their own accessibility preferences." 
  on accessibility_preferences for update using (auth.uid() = user_id);

create trigger set_accessibility_preferences_updated_at
  before update on public.accessibility_preferences
  for each row execute procedure public.handle_updated_at();

