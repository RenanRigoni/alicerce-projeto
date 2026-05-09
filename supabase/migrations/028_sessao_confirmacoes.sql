-- ============================================================
-- Migration 028 — sessao_confirmacoes
-- Materializa tokens de confirmação para sessões recorrentes virtuais.
-- Responsáveis confirmam/cancelam via link no WhatsApp.
-- 24h antes sem resposta → expirada (= confirmada para cobrança).
-- ============================================================

CREATE TABLE IF NOT EXISTS sessao_confirmacoes (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  paciente_id   uuid NOT NULL REFERENCES pacientes(id) ON DELETE CASCADE,
  terapeuta_id  uuid NOT NULL REFERENCES profiles(id),
  data_hora     timestamptz NOT NULL,
  token         uuid DEFAULT gen_random_uuid() NOT NULL UNIQUE,
  status        text NOT NULL DEFAULT 'pendente'
                  CHECK (status IN ('pendente', 'confirmada', 'cancelada', 'expirada')),
  expira_em     timestamptz NOT NULL,
  criado_em     timestamptz DEFAULT now() NOT NULL,
  respondido_em timestamptz,
  UNIQUE (paciente_id, data_hora)
);

ALTER TABLE sessao_confirmacoes ENABLE ROW LEVEL SECURITY;

-- Terapeuta vê apenas suas próprias; admin/recepcao veem todas
CREATE POLICY "sessao_confirmacoes: leitura staff"
  ON sessao_confirmacoes FOR SELECT
  USING (
    get_my_role() IN ('admin', 'recepcao')
    OR (get_my_role() = 'terapeuta' AND terapeuta_id = auth.uid())
  );

CREATE POLICY "sessao_confirmacoes: inserção staff"
  ON sessao_confirmacoes FOR INSERT
  WITH CHECK (
    get_my_role() IN ('admin', 'recepcao', 'terapeuta')
  );

CREATE POLICY "sessao_confirmacoes: atualização staff"
  ON sessao_confirmacoes FOR UPDATE
  USING (
    get_my_role() IN ('admin', 'recepcao')
    OR (get_my_role() = 'terapeuta' AND terapeuta_id = auth.uid())
  );

-- Índice para lookup por token (usado nas páginas públicas via admin client)
CREATE INDEX IF NOT EXISTS idx_sessao_confirmacoes_token ON sessao_confirmacoes(token);
CREATE INDEX IF NOT EXISTS idx_sessao_confirmacoes_status ON sessao_confirmacoes(status, expira_em);
