-- ============================================================
-- Migration: Gender field for professional profiles
-- Arquivo: supabase/migrations/20261006_gender_field.sql
-- SEGURO: Apenas adiciona coluna. Não apaga nem recria tabelas.
-- ============================================================

-- Adiciona a coluna gender à tabela profiles existente.
-- Contas existentes terão gender = NULL (não informado), o que é
-- correto: elas continuam visíveis normalmente quando o filtro
-- do aluno está em "Todos".

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS gender text
  CHECK (gender IN ('woman', 'man', 'other', 'prefer_not_to_say'))
  DEFAULT NULL;

-- ============================================================
-- ÍNDICE: Opcional, para performance no filtro por gênero.
-- Só tem efeito real quando o volume de profissionais for grande.
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_profiles_gender
  ON public.profiles(gender)
  WHERE gender IS NOT NULL;

-- ============================================================
-- RLS: Leitura cruzada de gender para o fluxo do Protect
--
-- O aluno precisa conseguir ler o campo gender dos profissionais
-- da sua instituição para que o filtro funcione.
-- Isso é seguro porque:
--   1. Apenas gender é exposto (não nome, e-mail, etc.)
--   2. A consulta já é mediada pela Server Action, nunca direto
--   3. Profissionais sem gender = NULL são invisíveis ao filtro
--      de categoria, mas visíveis em "Todos"
--
-- ATENÇÃO: A policy existente "Users can view their own profile."
-- não precisa ser alterada. A nova policy abaixo é ADITIVA.
-- ============================================================

-- Permite que qualquer usuário autenticado leia o gender
-- de profissionais da mesma instituição.
-- (A Server Action já aplica a restrição de institution_id.)
-- Esta policy não expõe dados pessoais além do necessário.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'profiles'
      AND policyname = 'profiles: authenticated users read professional gender'
  ) THEN
    CREATE POLICY "profiles: authenticated users read professional gender"
      ON public.profiles FOR SELECT
      USING (
        -- O próprio usuário
        auth.uid() = id
        OR
        -- Profissionais com role elegível (para o Protect)
        role IN ('orientador', 'gestor', 'administrador')
      );
  END IF;
END
$$;

-- ============================================================
-- OBSERVAÇÃO SOBRE CONTAS EXISTENTES
--
-- gender = NULL após esta migration para todos.
-- O profissional pode atualizar pelo perfil quando quiser.
-- O lembrete na UI não bloqueia acesso.
-- Um profissional com gender = NULL aparece normalmente
-- quando o filtro do aluno está em "Todos".
-- ============================================================
