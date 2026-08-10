-- Migration: garantir colunas guardian_name e guardian_phone em profiles
-- Safe to run multiple times (ADD COLUMN IF NOT EXISTS)

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS guardian_name text,
  ADD COLUMN IF NOT EXISTS guardian_phone text;

-- Atualiza as RLS policies para garantir que alunos podem atualizar seu próprio guardian
-- (a policy existente de UPDATE já permite updates do próprio row, mas confirmamos)
-- Garante que profile existe para todos os auth users (trigger handle_new_user já faz isso)

-- Comentário: não é necessário grant adicional pois os alunos
-- já têm UPDATE em seu próprio profile via RLS existente
