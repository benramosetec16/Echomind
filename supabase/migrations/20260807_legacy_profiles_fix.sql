-- ============================================================
-- Migration: EchoMind Intelligence Module — Resgate Legado (Profiles)
-- Arquivo: supabase/migrations/20260807_legacy_profiles_fix.sql
-- ============================================================

-- 1. Remover a política antiga que restringia a visualização apenas pelo institution_id
DROP POLICY IF EXISTS "Admins and managers can view profiles in institution." ON public.profiles;
DROP POLICY IF EXISTS "Users can view related profiles" ON public.profiles;

-- 2. Criar uma política unificada, abrangente e tolerante a falhas (para usuários legados sem institution_id)
CREATE POLICY "Users can view related profiles"
  ON public.profiles FOR SELECT
  USING (
    -- Regra 1: O próprio usuário pode ler seu perfil
    auth.uid() = id 
    OR
    -- Regra 2: Administradores leem todos
    EXISTS (
      SELECT 1 FROM public.profiles viewer
      WHERE viewer.id = auth.uid() AND viewer.role = 'administrador'
    ) 
    OR
    -- Regra 3: Gestores leem a sua própria instituição
    EXISTS (
      SELECT 1 FROM public.profiles viewer
      WHERE viewer.id = auth.uid() AND viewer.role = 'gestor' AND viewer.institution_id = profiles.institution_id
    )
    OR
    -- Regra 4: Fallback antigo (Orientador/Professor veem alunos da sua instituição)
    EXISTS (
      SELECT 1 FROM public.profiles viewer
      WHERE viewer.id = auth.uid() AND viewer.role IN ('orientador', 'professor') 
      AND viewer.institution_id = profiles.institution_id
    )
    OR
    -- Regra 5 [CORREÇÃO LEGADO]: Orientadores leem seus alunos vinculados diretamente, mesmo se institution_id for nulo
    profiles.orientador_id = auth.uid() 
    OR
    -- Regra 6 [CORREÇÃO LEGADO]: Orientadores leem alunos na sua sala
    EXISTS (
      SELECT 1 FROM public.classrooms cls 
      WHERE cls.id = profiles.classroom_id AND cls.orientador_id = auth.uid()
    )
    OR
    -- Regra 7 [CORREÇÃO LEGADO]: Professores leem alunos na sua sala
    EXISTS (
      SELECT 1 FROM public.classrooms cls 
      WHERE cls.id = profiles.classroom_id AND cls.professor_id = auth.uid()
    )
  );
