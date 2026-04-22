-- ============================================================
-- 005: Campo ativo em profiles + FK SET NULL para deleção
-- ============================================================

-- 1. Adiciona coluna ativo à tabela profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS ativo boolean NOT NULL DEFAULT true;

-- 2. Torna as FKs de profiles nullable + ON DELETE SET NULL
--    para preservar registros históricos ao deletar um usuário

-- relatorios.terapeuta_id
ALTER TABLE relatorios
  ALTER COLUMN terapeuta_id DROP NOT NULL;
ALTER TABLE relatorios
  DROP CONSTRAINT IF EXISTS relatorios_terapeuta_id_fkey;
ALTER TABLE relatorios
  ADD CONSTRAINT relatorios_terapeuta_id_fkey
  FOREIGN KEY (terapeuta_id) REFERENCES profiles(id) ON DELETE SET NULL;

-- documentos.enviado_por
ALTER TABLE documentos
  ALTER COLUMN enviado_por DROP NOT NULL;
ALTER TABLE documentos
  DROP CONSTRAINT IF EXISTS documentos_enviado_por_fkey;
ALTER TABLE documentos
  ADD CONSTRAINT documentos_enviado_por_fkey
  FOREIGN KEY (enviado_por) REFERENCES profiles(id) ON DELETE SET NULL;

-- orientacoes.terapeuta_id
ALTER TABLE orientacoes
  ALTER COLUMN terapeuta_id DROP NOT NULL;
ALTER TABLE orientacoes
  DROP CONSTRAINT IF EXISTS orientacoes_terapeuta_id_fkey;
ALTER TABLE orientacoes
  ADD CONSTRAINT orientacoes_terapeuta_id_fkey
  FOREIGN KEY (terapeuta_id) REFERENCES profiles(id) ON DELETE SET NULL;

-- comunicados.criado_por
ALTER TABLE comunicados
  ALTER COLUMN criado_por DROP NOT NULL;
ALTER TABLE comunicados
  DROP CONSTRAINT IF EXISTS comunicados_criado_por_fkey;
ALTER TABLE comunicados
  ADD CONSTRAINT comunicados_criado_por_fkey
  FOREIGN KEY (criado_por) REFERENCES profiles(id) ON DELETE SET NULL;

-- comentarios.autor_id
ALTER TABLE comentarios
  ALTER COLUMN autor_id DROP NOT NULL;
ALTER TABLE comentarios
  DROP CONSTRAINT IF EXISTS comentarios_autor_id_fkey;
ALTER TABLE comentarios
  ADD CONSTRAINT comentarios_autor_id_fkey
  FOREIGN KEY (autor_id) REFERENCES profiles(id) ON DELETE SET NULL;

-- audit_logs.usuario_id
ALTER TABLE audit_logs
  ALTER COLUMN usuario_id DROP NOT NULL;
ALTER TABLE audit_logs
  DROP CONSTRAINT IF EXISTS audit_logs_usuario_id_fkey;
ALTER TABLE audit_logs
  ADD CONSTRAINT audit_logs_usuario_id_fkey
  FOREIGN KEY (usuario_id) REFERENCES profiles(id) ON DELETE SET NULL;
