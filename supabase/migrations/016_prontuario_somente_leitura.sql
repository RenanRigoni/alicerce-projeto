-- Migration 016 — Proteção de dados clínicos pós-alta/desativação
-- COFFITO Res. 424/2013: prontuário encerrado é de guarda, não de edição.
-- Políticas RESTRICTIVE bloqueiam INSERT/UPDATE/DELETE em todas as entidades
-- clínicas quando o paciente não está com status 'ativo'.
-- Policies permissivas existentes continuam valendo para SELECT.

-- Helper: verifica se o paciente está ativo
CREATE OR REPLACE FUNCTION paciente_esta_ativo(p_paciente_id uuid)
RETURNS boolean
LANGUAGE sql SECURITY DEFINER STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM pacientes
    WHERE id = p_paciente_id AND status = 'ativo'
  );
$$;

-- ── relatorios ───────────────────────────────────────────────────────────────
CREATE POLICY "relatorios: somente_leitura_pos_alta INSERT" ON relatorios
  AS RESTRICTIVE FOR INSERT
  WITH CHECK (paciente_esta_ativo(paciente_id));

CREATE POLICY "relatorios: somente_leitura_pos_alta UPDATE" ON relatorios
  AS RESTRICTIVE FOR UPDATE
  USING (paciente_esta_ativo(paciente_id));

CREATE POLICY "relatorios: somente_leitura_pos_alta DELETE" ON relatorios
  AS RESTRICTIVE FOR DELETE
  USING (paciente_esta_ativo(paciente_id));

-- ── documentos ───────────────────────────────────────────────────────────────
CREATE POLICY "documentos: somente_leitura_pos_alta INSERT" ON documentos
  AS RESTRICTIVE FOR INSERT
  WITH CHECK (paciente_esta_ativo(paciente_id));

CREATE POLICY "documentos: somente_leitura_pos_alta UPDATE" ON documentos
  AS RESTRICTIVE FOR UPDATE
  USING (paciente_esta_ativo(paciente_id));

CREATE POLICY "documentos: somente_leitura_pos_alta DELETE" ON documentos
  AS RESTRICTIVE FOR DELETE
  USING (paciente_esta_ativo(paciente_id));

-- ── pacientes_dados_clinicos ─────────────────────────────────────────────────
CREATE POLICY "dados_clinicos: somente_leitura_pos_alta INSERT" ON pacientes_dados_clinicos
  AS RESTRICTIVE FOR INSERT
  WITH CHECK (paciente_esta_ativo(paciente_id));

CREATE POLICY "dados_clinicos: somente_leitura_pos_alta UPDATE" ON pacientes_dados_clinicos
  AS RESTRICTIVE FOR UPDATE
  USING (paciente_esta_ativo(paciente_id));

CREATE POLICY "dados_clinicos: somente_leitura_pos_alta DELETE" ON pacientes_dados_clinicos
  AS RESTRICTIVE FOR DELETE
  USING (paciente_esta_ativo(paciente_id));

-- ── orientacoes ──────────────────────────────────────────────────────────────
CREATE POLICY "orientacoes: somente_leitura_pos_alta INSERT" ON orientacoes
  AS RESTRICTIVE FOR INSERT
  WITH CHECK (paciente_esta_ativo(paciente_id));

CREATE POLICY "orientacoes: somente_leitura_pos_alta UPDATE" ON orientacoes
  AS RESTRICTIVE FOR UPDATE
  USING (paciente_esta_ativo(paciente_id));

CREATE POLICY "orientacoes: somente_leitura_pos_alta DELETE" ON orientacoes
  AS RESTRICTIVE FOR DELETE
  USING (paciente_esta_ativo(paciente_id));

-- ── solicitacoes_alta ─────────────────────────────────────────────────────────
-- Alta já encerrada não deve ser reaberta
CREATE POLICY "alta: somente_leitura_pos_confirmacao UPDATE" ON solicitacoes_alta
  AS RESTRICTIVE FOR UPDATE
  USING (status NOT IN ('registrada', 'confirmada'));

CREATE POLICY "alta: somente_leitura_pos_confirmacao DELETE" ON solicitacoes_alta
  AS RESTRICTIVE FOR DELETE
  USING (FALSE); -- nenhuma alta pode ser deletada
