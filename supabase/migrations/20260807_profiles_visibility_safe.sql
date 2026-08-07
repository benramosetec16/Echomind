-- ============================================================
-- Migration: EchoMind — Visibilidade de Perfis (SEM RECURSÃO)
-- Arquivo: supabase/migrations/20260807_profiles_visibility_safe.sql
-- ============================================================

-- PASSO 1: Criar funções auxiliares com SECURITY DEFINER
-- Isso faz com que a função rode com permissões de superusuário,
-- sem acionar as regras RLS da tabela profiles (eliminando a recursão).

CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.get_my_institution_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT institution_id FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$$;

-- PASSO 2: Remover políticas conflitantes
DROP POLICY IF EXISTS "Users can view their own profile." ON public.profiles;
DROP POLICY IF EXISTS "Users can view related profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins and managers can view profiles in institution." ON public.profiles;

-- PASSO 3: Criar nova política unificada sem recursão
CREATE POLICY "Users can view related profiles"
  ON public.profiles FOR SELECT
  USING (
    -- Regra 1: ver o próprio perfil
    auth.uid() = id

    OR

    -- Regra 2: Administrador vê todos
    public.get_my_role() = 'administrador'

    OR

    -- Regra 3: Gestor vê sua instituição
    (
      public.get_my_role() = 'gestor'
      AND public.get_my_institution_id() = profiles.institution_id
    )

    OR

    -- Regra 4: Orientador / Professor veem alunos da mesma instituição
    (
      public.get_my_role() IN ('orientador', 'professor')
      AND public.get_my_institution_id() = profiles.institution_id
    )

    OR

    -- Regra 5 [LEGADO]: Orientadores veem alunos com orientador_id direto
    profiles.orientador_id = auth.uid()

    OR

    -- Regra 6 [LEGADO]: Orientadores veem alunos da sua sala
    EXISTS (
      SELECT 1 FROM public.classrooms cls
      WHERE cls.id = profiles.classroom_id
        AND cls.orientador_id = auth.uid()
    )

    OR

    -- Regra 7 [LEGADO]: Professores veem alunos da sua sala
    EXISTS (
      SELECT 1 FROM public.classrooms cls
      WHERE cls.id = profiles.classroom_id
        AND cls.professor_id = auth.uid()
    )
  );
