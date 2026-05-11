-- Migration 032 — Separar contato de emergência em nome + telefone
ALTER TABLE responsaveis_detalhes
  ADD COLUMN IF NOT EXISTS contato_emergencia_telefone text;

-- contato_emergencia existente passa a ser o NOME
COMMENT ON COLUMN responsaveis_detalhes.contato_emergencia IS 'Nome do contato de emergência';
COMMENT ON COLUMN responsaveis_detalhes.contato_emergencia_telefone IS 'Telefone do contato de emergência';
