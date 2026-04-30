-- Migration 013 — Hash de integridade COFFITO
-- Adiciona hash SHA-256 e metadados de autenticação nas 6 entidades clínicas.
-- O hash captura: conteúdo + autor + timestamp no momento do registro.

-- relatorios: já tem assinatura_digital e assinado_em
ALTER TABLE relatorios
  ADD COLUMN IF NOT EXISTS hash_integridade text;

-- orientacoes: adiciona autenticação completa
ALTER TABLE orientacoes
  ADD COLUMN IF NOT EXISTS hash_integridade text,
  ADD COLUMN IF NOT EXISTS assinado_em      timestamptz;

-- solicitacoes_alta: autenticação do ato clínico de alta
ALTER TABLE solicitacoes_alta
  ADD COLUMN IF NOT EXISTS hash_integridade text;

-- documentos: autenticação do upload clínico
ALTER TABLE documentos
  ADD COLUMN IF NOT EXISTS hash_integridade text,
  ADD COLUMN IF NOT EXISTS assinado_em      timestamptz;

-- pacientes_dados_clinicos: atualizado_por já existe; adiciona hash
ALTER TABLE pacientes_dados_clinicos
  ADD COLUMN IF NOT EXISTS hash_integridade text;
