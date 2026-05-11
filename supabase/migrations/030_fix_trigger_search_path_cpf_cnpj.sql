-- Migration 030 — Fix handle_new_user + cpf_cnpj em profiles
-- Causa do erro "Database error creating new user":
--   Supabase Auth executa o trigger com search_path sem public,
--   então user_role não é encontrado (SQLSTATE 42704).
-- Fix: SET search_path = public na função + qualificar tipo.

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, nome, role, crefito)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nome', NEW.email),
    COALESCE((NEW.raw_user_meta_data->>'role')::public.user_role, 'pai'::public.user_role),
    NULLIF(trim(COALESCE(NEW.raw_user_meta_data->>'crefito', '')), '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- CPF/CNPJ em profiles: opcional para terapeutas, obrigatório para responsáveis
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS cpf_cnpj text;

-- Índice para lookup de email via CPF no login
CREATE INDEX IF NOT EXISTS idx_profiles_cpf_cnpj
  ON profiles (cpf_cnpj)
  WHERE cpf_cnpj IS NOT NULL;
