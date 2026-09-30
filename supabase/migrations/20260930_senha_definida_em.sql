-- Controla se o usuario ja definiu a propria senha. NULL = ainda esta com a
-- senha inicial `alicerce` e precisa trocar antes de usar o sistema.
alter table public.profiles
  add column if not exists senha_definida_em timestamptz;

comment on column public.profiles.senha_definida_em is
  'Quando o usuario definiu a propria senha. NULL = ainda na senha inicial; o app forca a troca no proximo acesso.';
