-- ============================================================
-- Migration: EchoMind — Status de Sessão em Mensagens
-- Arquivo: supabase/migrations/20260814_session_status.sql
-- ============================================================

-- 1. Adicionar coluna session_status na tabela messages
--    Aplica-se apenas a registros type = 'session_request'
--    NULL para mensagens de texto normais (type = 'text')
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS session_status text
    DEFAULT NULL
    CHECK (session_status IS NULL OR session_status IN ('pendente', 'concluida'));

-- 2. Adicionar coluna concluded_at para registrar quando foi concluída
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS concluded_at timestamptz DEFAULT NULL;

-- 3. Adicionar coluna concluded_by para registrar quem concluiu
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS concluded_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL DEFAULT NULL;

-- 4. Para todos os registros existentes do tipo session_request,
--    definir session_status = 'pendente' (retroativamente)
UPDATE public.messages
  SET session_status = 'pendente'
  WHERE type = 'session_request'
    AND session_status IS NULL;

-- 5. Política RLS: Orientadores podem atualizar o session_status de
--    solicitações de sessão onde são os destinatários (receiver_id)
DROP POLICY IF EXISTS "Receivers can update session status." ON public.messages;
CREATE POLICY "Receivers can update session status."
  ON public.messages FOR UPDATE
  USING (
    auth.uid() = receiver_id
    AND type = 'session_request'
  )
  WITH CHECK (
    auth.uid() = receiver_id
    AND type = 'session_request'
  );
