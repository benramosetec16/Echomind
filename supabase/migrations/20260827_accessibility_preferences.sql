
-- Accessibility Preferences Table
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
