ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS cbo_codigo text;

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_cbo_codigo_format_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_cbo_codigo_format_check
  CHECK (
    cbo_codigo IS NULL
    OR cbo_codigo ~ '^[0-9]{4}-[0-9]{2}$'
  );

COMMENT ON COLUMN public.profiles.cbo_codigo IS
  'Codigo CBO opcional do profissional, usado para convenio e NFS-e futura.';
