-- Tabela para gerenciar OTPs gerados para recuperação de senha
CREATE TABLE IF NOT EXISTS public.password_reset_otps (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  email text NOT NULL,
  otp_code text NOT NULL,
  expires_at timestamp with time zone NOT NULL,
  used boolean DEFAULT false NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS
ALTER TABLE public.password_reset_otps ENABLE ROW LEVEL SECURITY;

-- As políticas são extremamente restritivas: 
-- Apenas chamadas do backend (Server Actions com Service Role) poderão inserir/ler OTPs.
-- O frontend e usuários autenticados NÃO têm permissão de acessar esta tabela diretamente.
DROP POLICY IF EXISTS "Deny all access from client" ON public.password_reset_otps;
CREATE POLICY "Deny all access from client"
  ON public.password_reset_otps
  FOR ALL
  USING (false);

-- Index para facilitar a busca rápida
CREATE INDEX IF NOT EXISTS idx_password_reset_otps_email ON public.password_reset_otps (email);

-- Função de utilidade restrita para o admin recuperar o ID do usuário pelo e-mail
CREATE OR REPLACE FUNCTION public.get_user_id_by_email(user_email text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  found_id uuid;
BEGIN
  SELECT id INTO found_id FROM auth.users WHERE email = user_email LIMIT 1;
  RETURN found_id;
END;
$$;

