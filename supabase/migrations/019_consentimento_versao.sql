-- Migration 019 — Versionamento de política de privacidade no consentimento
-- LGPD Art. 8: consentimento deve ser específico e informado; versão aceita deve ser rastreável.

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS consentimento_policy_versao text;

COMMENT ON COLUMN profiles.consentimento_policy_versao IS
  'Identificador da versão da política aceita (ex: v1-2026-04-26). Permite rastrear qual política foi consentida por cada responsável.';
