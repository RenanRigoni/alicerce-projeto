-- Migration 036 - UF do conselho profissional

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS conselho_uf text;

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_conselho_uf_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_conselho_uf_check
  CHECK (
    conselho_uf IS NULL
    OR conselho_uf IN (
      'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO',
      'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI',
      'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
    )
  );

COMMENT ON COLUMN public.profiles.conselho_uf IS
  'UF do conselho profissional, opcional para identificacao em documentos futuros.';
