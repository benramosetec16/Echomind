-- ============================================================
-- Migration: Fix RLS and constraints for public.interventions
-- File: supabase/migrations/20260810_interventions_rls_fix.sql
-- ============================================================

-- Ensure institution_id can be null if not associated yet
ALTER TABLE public.interventions ALTER COLUMN institution_id DROP NOT NULL;

-- Enable RLS
ALTER TABLE public.interventions ENABLE ROW LEVEL SECURITY;

-- Drop old policies to avoid ambiguity or missing WITH CHECK clauses
DROP POLICY IF EXISTS "Users can view relevant interventions." ON public.interventions;
DROP POLICY IF EXISTS "Orientadores can manage interventions." ON public.interventions;
DROP POLICY IF EXISTS "Orientadores can insert interventions" ON public.interventions;
DROP POLICY IF EXISTS "Orientadores can select interventions" ON public.interventions;
DROP POLICY IF EXISTS "Orientadores can update interventions" ON public.interventions;
DROP POLICY IF EXISTS "Orientadores can delete interventions" ON public.interventions;

-- 1. SELECT Policy
CREATE POLICY "Users can select relevant interventions"
  ON public.interventions FOR SELECT
  USING (
    auth.uid() = student_id OR
    auth.uid() = orientador_id OR
    EXISTS (
      SELECT 1 FROM public.profiles viewer
      WHERE viewer.id = auth.uid()
        AND viewer.role IN ('administrador', 'gestor', 'orientador')
    )
  );

-- 2. INSERT Policy
CREATE POLICY "Orientadores and Gestores can insert interventions"
  ON public.interventions FOR INSERT
  WITH CHECK (
    auth.uid() = orientador_id OR
    EXISTS (
      SELECT 1 FROM public.profiles creator
      WHERE creator.id = auth.uid()
        AND creator.role IN ('administrador', 'gestor', 'orientador')
    )
  );

-- 3. UPDATE Policy
CREATE POLICY "Orientadores and Gestores can update interventions"
  ON public.interventions FOR UPDATE
  USING (
    auth.uid() = orientador_id OR
    EXISTS (
      SELECT 1 FROM public.profiles updater
      WHERE updater.id = auth.uid()
        AND updater.role IN ('administrador', 'gestor')
    )
  )
  WITH CHECK (
    auth.uid() = orientador_id OR
    EXISTS (
      SELECT 1 FROM public.profiles updater
      WHERE updater.id = auth.uid()
        AND updater.role IN ('administrador', 'gestor')
    )
  );

-- 4. DELETE Policy
CREATE POLICY "Orientadores and Gestores can delete interventions"
  ON public.interventions FOR DELETE
  USING (
    auth.uid() = orientador_id OR
    EXISTS (
      SELECT 1 FROM public.profiles deleter
      WHERE deleter.id = auth.uid()
        AND deleter.role IN ('administrador', 'gestor')
    )
  );
