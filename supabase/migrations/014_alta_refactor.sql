-- Migration 014 — Refatoração do fluxo de alta
-- Terapeuta registra alta diretamente (sem aprovação admin).
-- Responsável pode solicitar alta; terapeuta confirma.
-- Admin passa a ser somente leitura.

-- 1. Novas colunas
ALTER TABLE solicitacoes_alta
  ADD COLUMN IF NOT EXISTS tipo              text NOT NULL DEFAULT 'terapeuta',
  ADD COLUMN IF NOT EXISTS documento_url     text,
  ADD COLUMN IF NOT EXISTS confirmado_por    uuid REFERENCES profiles(id),
  ADD COLUMN IF NOT EXISTS confirmado_em     timestamptz,
  ADD COLUMN IF NOT EXISTS hash_integridade  text;

-- 2. Atualizar CHECK de status (mantém valores antigos para registros existentes)
ALTER TABLE solicitacoes_alta
  DROP CONSTRAINT IF EXISTS solicitacoes_alta_status_check;

ALTER TABLE solicitacoes_alta
  ADD CONSTRAINT solicitacoes_alta_status_check
  CHECK (status IN (
    'pendente', 'aprovada', 'recusada',          -- legado
    'registrada',                                  -- terapeuta registrou diretamente
    'pendente_confirmacao',                        -- responsável solicitou, aguarda terapeuta
    'confirmada'                                   -- terapeuta confirmou solicitação do responsável
  ));

-- 3. CHECK de tipo
ALTER TABLE solicitacoes_alta
  DROP CONSTRAINT IF EXISTS solicitacoes_alta_tipo_check;

ALTER TABLE solicitacoes_alta
  ADD CONSTRAINT solicitacoes_alta_tipo_check
  CHECK (tipo IN ('terapeuta', 'responsavel'));

-- 4. Remover políticas antigas
DROP POLICY IF EXISTS "alta: admin gerencia tudo"  ON solicitacoes_alta;
DROP POLICY IF EXISTS "alta: terapeuta vê as suas" ON solicitacoes_alta;
DROP POLICY IF EXISTS "alta: terapeuta insere"     ON solicitacoes_alta;

-- 5. Admin: apenas leitura
CREATE POLICY "alta: admin lê tudo" ON solicitacoes_alta
  FOR SELECT USING (get_my_role() = 'admin');

-- 6. Terapeuta: vê altas dos pacientes vinculados
CREATE POLICY "alta: terapeuta seleciona" ON solicitacoes_alta
  FOR SELECT USING (
    get_my_role() = 'terapeuta'
    AND EXISTS (
      SELECT 1 FROM paciente_terapeutas
      WHERE paciente_id = solicitacoes_alta.paciente_id
        AND terapeuta_id = auth.uid()
    )
  );

-- 7. Terapeuta: registra alta diretamente (tipo = 'terapeuta')
CREATE POLICY "alta: terapeuta registra" ON solicitacoes_alta
  FOR INSERT WITH CHECK (
    get_my_role() = 'terapeuta'
    AND tipo = 'terapeuta'
    AND solicitado_por = auth.uid()
    AND EXISTS (
      SELECT 1 FROM paciente_terapeutas
      WHERE paciente_id = solicitacoes_alta.paciente_id
        AND terapeuta_id = auth.uid()
    )
  );

-- 8. Terapeuta: confirma solicitação do responsável
CREATE POLICY "alta: terapeuta confirma" ON solicitacoes_alta
  FOR UPDATE USING (
    get_my_role() = 'terapeuta'
    AND EXISTS (
      SELECT 1 FROM paciente_terapeutas
      WHERE paciente_id = solicitacoes_alta.paciente_id
        AND terapeuta_id = auth.uid()
    )
  );

-- 9. Responsável: vê altas do seu paciente
CREATE POLICY "alta: pai seleciona" ON solicitacoes_alta
  FOR SELECT USING (
    get_my_role() = 'pai'
    AND EXISTS (
      SELECT 1 FROM paciente_responsaveis
      WHERE paciente_id = solicitacoes_alta.paciente_id
        AND responsavel_id = auth.uid()
    )
  );

-- 10. Responsável: solicita alta (tipo = 'responsavel')
CREATE POLICY "alta: pai solicita" ON solicitacoes_alta
  FOR INSERT WITH CHECK (
    get_my_role() = 'pai'
    AND tipo = 'responsavel'
    AND solicitado_por = auth.uid()
    AND EXISTS (
      SELECT 1 FROM paciente_responsaveis
      WHERE paciente_id = solicitacoes_alta.paciente_id
        AND responsavel_id = auth.uid()
    )
  );
