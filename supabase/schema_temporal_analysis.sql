-- Tabela de Análises Temporais (Pulse Page)
-- Armazena análises consolidadas geradas pela IA a partir dos check-ins

create table if not exists public.temporal_analyses (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  period text not null check (period in ('7D', '30D', 'custom')),
  total_checkins integer not null default 0,
  avg_valence numeric(5,2),
  dominant_texture text,
  dominant_sentiment text,
  ai_summary text not null,
  ai_recommendations text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.temporal_analyses enable row level security;

create policy "Users can view their own temporal analyses."
  on temporal_analyses for select using (auth.uid() = user_id);

create policy "Users can insert their own temporal analyses."
  on temporal_analyses for insert with check (auth.uid() = user_id);

create policy "Users can delete their own temporal analyses."
  on temporal_analyses for delete using (auth.uid() = user_id);
