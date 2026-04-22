-- ============================================================
-- Migration 003 — Alta de paciente, status e feriados
-- Execute no SQL Editor do Supabase
-- ============================================================

-- 1. Status do paciente
ALTER TABLE pacientes
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'ativo'
  CHECK (status IN ('ativo', 'inativo_alta', 'inativo_saida'));

-- 2. Usuário ativo/inativo (não bloqueia login, só filtra listagens)
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS ativo boolean NOT NULL DEFAULT true;

-- 3. Solicitações de alta
CREATE TABLE IF NOT EXISTS solicitacoes_alta (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  paciente_id         uuid NOT NULL REFERENCES pacientes(id) ON DELETE CASCADE,
  solicitado_por      uuid NOT NULL REFERENCES profiles(id),
  motivo              text NOT NULL,
  status              text NOT NULL DEFAULT 'pendente'
                        CHECK (status IN ('pendente', 'aprovada', 'recusada')),
  argumentacao_recusa text,
  decidido_por        uuid REFERENCES profiles(id),
  decidido_em         timestamptz,
  criado_em           timestamptz NOT NULL DEFAULT now()
);

-- 4. Feriados
CREATE TABLE IF NOT EXISTS feriados (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  data        date NOT NULL UNIQUE,
  descricao   text NOT NULL,
  criado_por  uuid NOT NULL REFERENCES profiles(id),
  criado_em   timestamptz NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE solicitacoes_alta ENABLE ROW LEVEL SECURITY;
ALTER TABLE feriados           ENABLE ROW LEVEL SECURITY;

-- Políticas: solicitacoes_alta
CREATE POLICY "alta: admin gerencia tudo" ON solicitacoes_alta
  FOR ALL USING (get_my_role() = 'admin');

CREATE POLICY "alta: terapeuta vê as suas" ON solicitacoes_alta
  FOR SELECT USING (solicitado_por = auth.uid());

CREATE POLICY "alta: terapeuta insere" ON solicitacoes_alta
  FOR INSERT WITH CHECK (
    solicitado_por = auth.uid() AND get_my_role() = 'terapeuta'
  );

-- Políticas: feriados
CREATE POLICY "feriados: todos leem" ON feriados
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "feriados: admin e recepcao gerenciam" ON feriados
  FOR ALL USING (get_my_role() IN ('admin', 'recepcao'));

-- Atualiza política de UPDATE de pacientes para incluir terapeuta vinculado
DROP POLICY IF EXISTS "pacientes: atualização admin" ON pacientes;
CREATE POLICY "pacientes: atualização" ON pacientes
  FOR UPDATE USING (
    get_my_role() IN ('admin', 'recepcao')
    OR (
      get_my_role() = 'terapeuta'
      AND EXISTS (
        SELECT 1 FROM paciente_terapeutas
        WHERE paciente_id = pacientes.id AND terapeuta_id = auth.uid()
      )
    )
  );
