-- Migration: Add role column to profiles table
-- Run this in your Supabase SQL Editor

ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'aluno'
    CHECK (role IN ('aluno', 'professor', 'orientador', 'administrador'));

-- Update policy to allow admins to read all profiles (for institutional dashboard)
CREATE POLICY IF NOT EXISTS "Admins can view all profiles."
  ON profiles FOR SELECT
  USING (
    auth.uid() = id OR
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('administrador', 'professor', 'orientador')
  );
