-- Migration 033 - Profissionais com multiplas especialidades clinicas

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS tipo_profissional text,
  ADD COLUMN IF NOT EXISTS conselho_tipo text,
  ADD COLUMN IF NOT EXISTS conselho_numero text;

UPDATE public.profiles
SET
  tipo_profissional = COALESCE(tipo_profissional, 'terapeuta_ocupacional'),
  conselho_tipo = COALESCE(conselho_tipo, 'CREFITO'),
  conselho_numero = COALESCE(NULLIF(trim(conselho_numero), ''), NULLIF(trim(crefito), '')),
  crefito = COALESCE(NULLIF(trim(crefito), ''), NULLIF(trim(conselho_numero), ''))
WHERE role = 'terapeuta';

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_terapeuta_crefito_check,
  DROP CONSTRAINT IF EXISTS profiles_profissional_conselho_check,
  DROP CONSTRAINT IF EXISTS profiles_tipo_profissional_check,
  DROP CONSTRAINT IF EXISTS profiles_conselho_tipo_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_tipo_profissional_check
    CHECK (
      tipo_profissional IS NULL OR tipo_profissional IN (
        'terapeuta_ocupacional',
        'fisioterapeuta',
        'fonoaudiologa',
        'psicologa',
        'neuropsicologa',
        'neuropsicopedagoga',
        'nutricionista'
      )
    ) NOT VALID,
  ADD CONSTRAINT profiles_conselho_tipo_check
    CHECK (
      conselho_tipo IS NULL OR conselho_tipo IN ('CREFITO', 'CRFa', 'CRP', 'CBO', 'CRN')
    ) NOT VALID,
  ADD CONSTRAINT profiles_profissional_conselho_check
    CHECK (
      role != 'terapeuta'
      OR COALESCE(NULLIF(trim(conselho_numero), ''), NULLIF(trim(crefito), '')) IS NOT NULL
    ) NOT VALID;

CREATE INDEX IF NOT EXISTS idx_profiles_tipo_profissional
  ON public.profiles (tipo_profissional)
  WHERE role = 'terapeuta';

COMMENT ON COLUMN public.profiles.tipo_profissional IS
  'Especialidade clinica canonica do profissional.';
COMMENT ON COLUMN public.profiles.conselho_tipo IS
  'Sigla do conselho ou identificador profissional: CREFITO, CRFa, CRP, CBO ou CRN.';
COMMENT ON COLUMN public.profiles.conselho_numero IS
  'Numero de registro no conselho profissional. A coluna crefito permanece como legado.';

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    nome,
    role,
    crefito,
    cpf_cnpj,
    tipo_profissional,
    conselho_tipo,
    conselho_numero
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nome', NEW.email),
    COALESCE((NEW.raw_user_meta_data->>'role')::public.user_role, 'pai'::public.user_role),
    NULLIF(trim(COALESCE(NEW.raw_user_meta_data->>'crefito', NEW.raw_user_meta_data->>'conselho_numero', '')), ''),
    NULLIF(trim(COALESCE(NEW.raw_user_meta_data->>'cpf_cnpj', '')), ''),
    NULLIF(trim(COALESCE(NEW.raw_user_meta_data->>'tipo_profissional', '')), ''),
    NULLIF(trim(COALESCE(NEW.raw_user_meta_data->>'conselho_tipo', '')), ''),
    NULLIF(trim(COALESCE(NEW.raw_user_meta_data->>'conselho_numero', NEW.raw_user_meta_data->>'crefito', '')), '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
