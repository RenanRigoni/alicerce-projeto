-- Migration 012: Campo de consentimento LGPD na tabela profiles
-- Responsáveis (pai) precisam aceitar os termos antes de usar o portal.

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS consentimento_aceito_em timestamptz;
