-- Migration 015 — Sistema de permissões granulares por usuário
-- Cada usuário pode ter permissões explícitas que sobrescrevem os padrões do role.
-- Formato: JSONB com chaves = nomes de permissão, valores = boolean.
-- Chaves ausentes = usar padrão do role (definido em código, não no banco).

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS permissoes jsonb NOT NULL DEFAULT '{}'::jsonb;

-- Índice para buscas futuras (ex: "todos os usuários com permissão X")
CREATE INDEX IF NOT EXISTS idx_profiles_permissoes ON profiles USING gin (permissoes);
