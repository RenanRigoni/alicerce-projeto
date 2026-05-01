-- Migration 026 — Trigger handle_new_user inclui crefito do user_metadata
-- Sem isso, terapeutas criados via API falham na constraint profiles_terapeuta_crefito_check
-- porque o trigger inseria sem crefito (role=terapeuta + crefito=null viola a constraint).

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, nome, role, crefito)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nome', NEW.email),
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'pai'),
    NULLIF(trim(COALESCE(NEW.raw_user_meta_data->>'crefito', '')), '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
