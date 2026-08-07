-- ============================================================
-- Migration: EchoMind Intelligence Module — RLS & Biometrics (FIXED)
-- Arquivo: supabase/migrations/20260807_intelligence_module.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS public.biometrics (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  heart_rate integer,
  sleep_hours numeric(4,1),
  energy_level integer CHECK (energy_level >= 0 AND energy_level <= 100),
  mood integer CHECK (mood >= 0 AND mood <= 100),
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.biometrics ADD COLUMN IF NOT EXISTS heart_rate integer;
ALTER TABLE public.biometrics ADD COLUMN IF NOT EXISTS sleep_hours numeric(4,1);
ALTER TABLE public.biometrics ADD COLUMN IF NOT EXISTS energy_level integer;
ALTER TABLE public.biometrics ADD COLUMN IF NOT EXISTS mood integer;

ALTER TABLE public.biometrics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own biometrics." ON public.biometrics;
CREATE POLICY "Users can manage their own biometrics."
  ON public.biometrics FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- 2. RLS — Orientadores
-- ============================================================

DROP POLICY IF EXISTS "Orientadores can view checkins of their students." ON public.emotional_checkins;
CREATE POLICY "Orientadores can view checkins of their students."
  ON public.emotional_checkins FOR SELECT
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.profiles student
      JOIN public.classrooms cls ON cls.id = student.classroom_id
      WHERE student.id = emotional_checkins.user_id
        AND cls.orientador_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles student
      WHERE student.id = emotional_checkins.user_id
        AND student.orientador_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Orientadores can view biometrics of their students." ON public.biometrics;
CREATE POLICY "Orientadores can view biometrics of their students."
  ON public.biometrics FOR SELECT
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.profiles student
      JOIN public.classrooms cls ON cls.id = student.classroom_id
      WHERE student.id = biometrics.user_id
        AND cls.orientador_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles student
      WHERE student.id = biometrics.user_id
        AND student.orientador_id = auth.uid()
    )
  );

-- ============================================================
-- 3. RLS — Gestores / Administradores
-- ============================================================

DROP POLICY IF EXISTS "Gestores can view checkins of their institution." ON public.emotional_checkins;
CREATE POLICY "Gestores can view checkins of their institution."
  ON public.emotional_checkins FOR SELECT
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.profiles viewer
      JOIN public.profiles student ON student.id = emotional_checkins.user_id
      WHERE viewer.id = auth.uid()
        AND viewer.role IN ('administrador', 'gestor')
        AND (viewer.role = 'administrador' OR viewer.institution_id = student.institution_id)
    )
  );

DROP POLICY IF EXISTS "Gestores can view biometrics of their institution." ON public.biometrics;
CREATE POLICY "Gestores can view biometrics of their institution."
  ON public.biometrics FOR SELECT
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.profiles viewer
      JOIN public.profiles student ON student.id = biometrics.user_id
      WHERE viewer.id = auth.uid()
        AND viewer.role IN ('administrador', 'gestor')
        AND (viewer.role = 'administrador' OR viewer.institution_id = student.institution_id)
    )
  );

-- ============================================================
-- 4. RLS — Professores
-- ============================================================

DROP POLICY IF EXISTS "Professores can view checkins of their students." ON public.emotional_checkins;
CREATE POLICY "Professores can view checkins of their students."
  ON public.emotional_checkins FOR SELECT
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.profiles student
      JOIN public.classrooms cls ON cls.id = student.classroom_id
      WHERE student.id = emotional_checkins.user_id
        AND cls.professor_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles student
      WHERE student.id = emotional_checkins.user_id
        AND student.professor_id = auth.uid()
    )
  );
