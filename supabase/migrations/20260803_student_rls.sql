-- ============================================================
-- Migração: RLS para tabelas de dados do Aluno
-- Corrige: emotional_checkins, aetheric_journal, biometric_logs
-- ============================================================

-- 1. EMOTIONAL_CHECKINS
ALTER TABLE public.emotional_checkins ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can insert own checkins" ON public.emotional_checkins;
CREATE POLICY "Users can insert own checkins"
  ON public.emotional_checkins FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can read own checkins" ON public.emotional_checkins;
CREATE POLICY "Users can read own checkins"
  ON public.emotional_checkins FOR SELECT
  USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM public.profiles viewer
      WHERE viewer.id = auth.uid()
      AND viewer.role IN ('administrador', 'gestor', 'orientador', 'professor')
    )
  );

-- 2. AETHERIC_JOURNAL
ALTER TABLE public.aetheric_journal ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can insert own journal" ON public.aetheric_journal;
CREATE POLICY "Users can insert own journal"
  ON public.aetheric_journal FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can read own journal" ON public.aetheric_journal;
CREATE POLICY "Users can read own journal"
  ON public.aetheric_journal FOR SELECT
  USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM public.profiles viewer
      WHERE viewer.id = auth.uid()
      AND viewer.role IN ('administrador', 'gestor', 'orientador', 'professor')
    )
  );

DROP POLICY IF EXISTS "Users can update own journal" ON public.aetheric_journal;
CREATE POLICY "Users can update own journal"
  ON public.aetheric_journal FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own journal" ON public.aetheric_journal;
CREATE POLICY "Users can delete own journal"
  ON public.aetheric_journal FOR DELETE
  USING (auth.uid() = user_id);

-- 3. BIOMETRIC_LOGS
ALTER TABLE public.biometric_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can insert own biometric logs" ON public.biometric_logs;
CREATE POLICY "Users can insert own biometric logs"
  ON public.biometric_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can read own biometric logs" ON public.biometric_logs;
CREATE POLICY "Users can read own biometric logs"
  ON public.biometric_logs FOR SELECT
  USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM public.profiles viewer
      WHERE viewer.id = auth.uid()
      AND viewer.role IN ('administrador', 'gestor', 'orientador', 'professor')
    )
  );
