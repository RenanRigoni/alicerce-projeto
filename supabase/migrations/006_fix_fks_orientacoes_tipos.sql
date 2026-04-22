-- ============================================================
-- 006: Fix FKs bloqueando delete de usuários + Tipos em orientações
-- ============================================================


-- ============================================================
-- 1. FIX: agendamentos — ON DELETE SET NULL
-- ============================================================

ALTER TABLE agendamentos
  ALTER COLUMN terapeuta_id DROP NOT NULL;

ALTER TABLE agendamentos
  DROP CONSTRAINT IF EXISTS agendamentos_terapeuta_id_fkey;

ALTER TABLE agendamentos
  ADD CONSTRAINT agendamentos_terapeuta_id_fkey
  FOREIGN KEY (terapeuta_id) REFERENCES profiles(id) ON DELETE SET NULL;

ALTER TABLE agendamentos
  ALTER COLUMN criado_por DROP NOT NULL;

ALTER TABLE agendamentos
  DROP CONSTRAINT IF EXISTS agendamentos_criado_por_fkey;

ALTER TABLE agendamentos
  ADD CONSTRAINT agendamentos_criado_por_fkey
  FOREIGN KEY (criado_por) REFERENCES profiles(id) ON DELETE SET NULL;


-- ============================================================
-- 2. FIX: feriados — ON DELETE SET NULL
-- ============================================================

ALTER TABLE feriados
  ALTER COLUMN criado_por DROP NOT NULL;

ALTER TABLE feriados
  DROP CONSTRAINT IF EXISTS feriados_criado_por_fkey;

ALTER TABLE feriados
  ADD CONSTRAINT feriados_criado_por_fkey
  FOREIGN KEY (criado_por) REFERENCES profiles(id) ON DELETE SET NULL;


-- ============================================================
-- 3. FIX: solicitacoes_alta — ON DELETE SET NULL
-- ============================================================

ALTER TABLE solicitacoes_alta
  ALTER COLUMN solicitado_por DROP NOT NULL;

ALTER TABLE solicitacoes_alta
  DROP CONSTRAINT IF EXISTS solicitacoes_alta_solicitado_por_fkey;

ALTER TABLE solicitacoes_alta
  ADD CONSTRAINT solicitacoes_alta_solicitado_por_fkey
  FOREIGN KEY (solicitado_por) REFERENCES profiles(id) ON DELETE SET NULL;

ALTER TABLE solicitacoes_alta
  DROP CONSTRAINT IF EXISTS solicitacoes_alta_decidido_por_fkey;

ALTER TABLE solicitacoes_alta
  ADD CONSTRAINT solicitacoes_alta_decidido_por_fkey
  FOREIGN KEY (decidido_por) REFERENCES profiles(id) ON DELETE SET NULL;


-- ============================================================
-- 4. FEATURE: novos campos em orientacoes (tipo + url_midia)
-- ============================================================

ALTER TABLE orientacoes
  ADD COLUMN IF NOT EXISTS tipo text NOT NULL DEFAULT 'texto'
    CHECK (tipo IN ('texto', 'video', 'pdf', 'imagem', 'guia')),
  ADD COLUMN IF NOT EXISTS url_midia text;
