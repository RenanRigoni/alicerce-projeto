-- Migration 031 — Campos de endereço completo e emergência em responsaveis_detalhes
ALTER TABLE responsaveis_detalhes
  ADD COLUMN IF NOT EXISTS numero             text,
  ADD COLUMN IF NOT EXISTS complemento        text,
  ADD COLUMN IF NOT EXISTS contato_emergencia text;
