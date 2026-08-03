-- Migration: Institutional Architecture V2 for EchoMind
-- Compatible with existing database schema and legacy users

-- 1. Update roles check constraint on public.profiles to include 'gestor'
DO $$
BEGIN
    ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
    ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check 
      CHECK (role IN ('aluno', 'professor', 'orientador', 'gestor', 'administrador'));
EXCEPTION
    WHEN undefined_object THEN NULL;
END $$;

-- Add onboarding_completed column if not exists
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS onboarding_completed boolean DEFAULT false;

-- 2. Enhance Classrooms Table
ALTER TABLE public.classrooms 
  ADD COLUMN IF NOT EXISTS code text,
  ADD COLUMN IF NOT EXISTS professor_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS orientador_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Add unique constraint for (institution_id, code) on classrooms if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'classrooms_institution_code_key'
    ) THEN
        ALTER TABLE public.classrooms ADD CONSTRAINT classrooms_institution_code_key UNIQUE (institution_id, code);
    END IF;
END $$;

-- 3. Create Institutional Codes Table (Sistema de Códigos)
CREATE TABLE IF NOT EXISTS public.institutional_codes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  institution_id uuid REFERENCES public.institutions(id) ON DELETE CASCADE NOT NULL,
  code text NOT NULL,
  type text NOT NULL CHECK (type IN ('gestor', 'orientador', 'professor', 'aluno', 'sala')),
  status text NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo', 'utilizado', 'revogado')),
  created_by uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  classroom_id uuid REFERENCES public.classrooms(id) ON DELETE CASCADE,
  used_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  used_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  CONSTRAINT institutional_codes_institution_code_key UNIQUE (institution_id, code)
);

ALTER TABLE public.institutional_codes ENABLE ROW LEVEL SECURITY;

-- 4. Create Interventions Table (Orientador Interventions)
CREATE TABLE IF NOT EXISTS public.interventions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  institution_id uuid REFERENCES public.institutions(id) ON DELETE CASCADE NOT NULL,
  classroom_id uuid REFERENCES public.classrooms(id) ON DELETE SET NULL,
  orientador_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  student_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  description text NOT NULL,
  status text NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'em_andamento', 'concluida')),
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.interventions ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies

-- Institutional Codes Policies
DROP POLICY IF EXISTS "Institutional Managers can view and manage their codes." ON public.institutional_codes;
CREATE POLICY "Institutional Managers can view and manage their codes."
  ON public.institutional_codes FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.institution_id = institutional_codes.institution_id
      AND profiles.role IN ('administrador', 'gestor')
    )
  );

DROP POLICY IF EXISTS "Anyone authenticated can query active codes for registration." ON public.institutional_codes;
CREATE POLICY "Anyone authenticated can query active codes for registration."
  ON public.institutional_codes FOR SELECT
  USING (status = 'ativo' OR auth.uid() = used_by OR auth.uid() = created_by);

-- Interventions Policies
DROP POLICY IF EXISTS "Users can view relevant interventions." ON public.interventions;
CREATE POLICY "Users can view relevant interventions."
  ON public.interventions FOR SELECT
  USING (
    auth.uid() = student_id OR 
    auth.uid() = orientador_id OR
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.institution_id = interventions.institution_id
      AND profiles.role IN ('administrador', 'gestor')
    )
  );

DROP POLICY IF EXISTS "Orientadores can manage interventions." ON public.interventions;
CREATE POLICY "Orientadores can manage interventions."
  ON public.interventions FOR ALL
  USING (
    auth.uid() = orientador_id OR
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('administrador', 'gestor')
    )
  );

-- Profiles RLS Updates
DROP POLICY IF EXISTS "Admins and managers can view profiles in institution." ON public.profiles;
CREATE POLICY "Admins and managers can view profiles in institution."
  ON public.profiles FOR SELECT
  USING (
    auth.uid() = id OR
    (
      EXISTS (
        SELECT 1 FROM public.profiles viewer
        WHERE viewer.id = auth.uid() AND (
          viewer.role = 'administrador' OR
          (viewer.role = 'gestor' AND viewer.institution_id = profiles.institution_id) OR
          (viewer.role = 'orientador' AND viewer.institution_id = profiles.institution_id) OR
          (viewer.role = 'professor' AND viewer.institution_id = profiles.institution_id)
        )
      )
    )
  );
