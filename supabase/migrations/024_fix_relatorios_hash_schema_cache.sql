-- Migration 024 — Repara hash de integridade em relatorios e recarrega o cache do PostgREST.
-- Corrige o erro: Could not find the 'hash_integridade' column of 'relatorios' in the schema cache.

ALTER TABLE public.relatorios
  ADD COLUMN IF NOT EXISTS hash_integridade text;

COMMENT ON COLUMN public.relatorios.hash_integridade IS
  'Hash SHA-256 de integridade do relatorio publicado.';

NOTIFY pgrst, 'reload schema';
