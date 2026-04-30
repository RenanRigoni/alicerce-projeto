-- Migration 018 — CREFITO obrigatório para terapeutas
-- CREFITO Res. 426/2015: identificação profissional obrigatória em documentos clínicos.

-- Constraint NOT VALID: aplica-se a novos registros/atualizações, não valida dados existentes.
-- Para validar existentes: UPDATE profiles SET crefito = '<numero>' WHERE role = 'terapeuta' AND (crefito IS NULL OR crefito = '');
-- Depois: ALTER TABLE profiles VALIDATE CONSTRAINT profiles_terapeuta_crefito_check;
ALTER TABLE profiles
  ADD CONSTRAINT profiles_terapeuta_crefito_check
  CHECK (role != 'terapeuta' OR (crefito IS NOT NULL AND trim(crefito) != ''))
  NOT VALID;
