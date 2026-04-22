-- ============================================================
-- Migration 002 — Horários de atendimento por paciente
-- Execute no SQL Editor do Supabase
-- ============================================================

ALTER TABLE pacientes
  ADD COLUMN IF NOT EXISTS horarios_atendimento jsonb NOT NULL DEFAULT '[]'::jsonb;

-- Exemplo de estrutura armazenada:
-- [{"dia": "segunda", "hora": "13:10"}, {"dia": "quarta", "hora": "09:00"}]
