-- Migration 008 — Contato de emergência no cadastro do responsável
ALTER TABLE responsaveis_detalhes
  ADD COLUMN IF NOT EXISTS contato_emergencia text;
