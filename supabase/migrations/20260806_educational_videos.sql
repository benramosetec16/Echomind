-- Migration: 20260806_educational_videos
-- Creates the educational_videos table and its RLS policies

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
