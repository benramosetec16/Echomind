-- ============================================================
-- Migração: Correção de RLS e Fluxo de Onboarding Institucional
-- ============================================================

-- 1. CORRIGIR RLS da tabela institutions
-- Administradores devem poder criar, editar e remover instituições

DROP POLICY IF EXISTS "Admins can manage institutions" ON public.institutions;
CREATE POLICY "Admins can manage institutions"
  ON public.institutions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'administrador'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'administrador'
    )
  );

-- Gestores podem ver a própria instituição
DROP POLICY IF EXISTS "Gestors can view own institution" ON public.institutions;
CREATE POLICY "Gestors can view own institution"
  ON public.institutions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.institution_id = institutions.id
    )
  );

-- Autenticados podem ler instituição pelo código (para onboarding)
DROP POLICY IF EXISTS "Auth users can read institution by code" ON public.institutions;
CREATE POLICY "Auth users can read institution by code"
  ON public.institutions FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- 2. CORRIGIR RLS da tabela profiles
-- Administradores precisam poder atualizar qualquer perfil (para vincular gestores)

DROP POLICY IF EXISTS "Admins can update any profile" ON public.profiles;
CREATE POLICY "Admins can update any profile"
  ON public.profiles FOR UPDATE
  USING (
    auth.uid() = id OR
    EXISTS (
      SELECT 1 FROM public.profiles AS admin_check
      WHERE admin_check.id = auth.uid()
      AND admin_check.role = 'administrador'
    )
  );

-- Usuário pode atualizar o próprio perfil (onboarding institucional)
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- 3. CORRIGIR RLS da tabela institutional_codes
-- Administradores podem gerar e gerenciar todos os códigos

DROP POLICY IF EXISTS "Admins can manage all codes" ON public.institutional_codes;
CREATE POLICY "Admins can manage all codes"
  ON public.institutional_codes FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'administrador'
    )
  );

-- Qualquer autenticado pode ler código ativo para validação no onboarding
DROP POLICY IF EXISTS "Authenticated can read active codes for onboarding" ON public.institutional_codes;
CREATE POLICY "Authenticated can read active codes for onboarding"
  ON public.institutional_codes FOR SELECT
  USING (
    status = 'ativo' AND auth.uid() IS NOT NULL
  );

-- Usuário pode atualizar o código quando usado (vincular ao próprio perfil)
DROP POLICY IF EXISTS "Users can mark code as used" ON public.institutional_codes;
CREATE POLICY "Users can mark code as used"
  ON public.institutional_codes FOR UPDATE
  USING (status = 'ativo' AND auth.uid() IS NOT NULL)
  WITH CHECK (true);
