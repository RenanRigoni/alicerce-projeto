-- ============================================================
-- Migration 004 — Cadastro completo de pacientes e responsáveis
-- Inclui: renomear status, novos campos, dados clínicos separados,
--         agendamentos, notificações, responsáveis detalhados
-- Execute no SQL Editor do Supabase
-- ============================================================


-- ============================================================
-- 1. RENOMEAR STATUS DO PACIENTE
-- inativo_alta → alta   |   inativo_saida → desativado
-- ============================================================

-- Atualiza dados existentes antes de alterar a constraint
UPDATE pacientes SET status = 'alta'       WHERE status = 'inativo_alta';
UPDATE pacientes SET status = 'desativado' WHERE status = 'inativo_saida';

-- Remove constraint antiga e adiciona a nova
ALTER TABLE pacientes
  DROP CONSTRAINT IF EXISTS pacientes_status_check;

ALTER TABLE pacientes
  ADD CONSTRAINT pacientes_status_check
  CHECK (status IN ('ativo', 'alta', 'desativado'));


-- ============================================================
-- 2. NOVOS CAMPOS EM pacientes
-- ============================================================

ALTER TABLE pacientes
  ADD COLUMN IF NOT EXISTS codigo_interno       text UNIQUE,
  ADD COLUMN IF NOT EXISTS sexo                 text CHECK (sexo IN ('masculino', 'feminino', 'outro')),
  ADD COLUMN IF NOT EXISTS cpf                  text,
  ADD COLUMN IF NOT EXISTS motivo_desativacao   text,
  ADD COLUMN IF NOT EXISTS turno_preferencia    text CHECK (turno_preferencia IN ('manha', 'tarde', 'qualquer')),
  ADD COLUMN IF NOT EXISTS convenio_ou_particular text CHECK (convenio_ou_particular IN ('convenio', 'particular')),
  ADD COLUMN IF NOT EXISTS data_inicio          timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS atualizado_em        timestamptz;


-- Sequence e função para gerar código interno automaticamente
CREATE SEQUENCE IF NOT EXISTS paciente_codigo_seq START 1;

CREATE OR REPLACE FUNCTION gerar_codigo_interno()
RETURNS trigger AS $$
BEGIN
  IF NEW.codigo_interno IS NULL THEN
    NEW.codigo_interno := lpad(nextval('paciente_codigo_seq')::text, 3, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS before_insert_paciente_codigo ON pacientes;
CREATE TRIGGER before_insert_paciente_codigo
  BEFORE INSERT ON pacientes
  FOR EACH ROW EXECUTE FUNCTION gerar_codigo_interno();

-- Gera código para pacientes existentes que ainda não têm
UPDATE pacientes
SET codigo_interno = lpad(nextval('paciente_codigo_seq')::text, 3, '0')
WHERE codigo_interno IS NULL;


-- ============================================================
-- 3. CAMPO tipo EM paciente_responsaveis
-- ============================================================

ALTER TABLE paciente_responsaveis
  ADD COLUMN IF NOT EXISTS tipo text NOT NULL DEFAULT 'principal'
  CHECK (tipo IN ('principal', 'secundario'));


-- ============================================================
-- 4. TABELA: responsaveis_detalhes
-- Dados de contato dos usuários com role=pai
-- ============================================================

CREATE TABLE IF NOT EXISTS responsaveis_detalhes (
  id         uuid PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  endereco   text,
  cidade     text,
  cep        text,
  telefone_principal text
);

ALTER TABLE responsaveis_detalhes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "responsaveis_detalhes: leitura admin e próprio"
  ON responsaveis_detalhes FOR SELECT
  USING (
    id = auth.uid()
    OR get_my_role() IN ('admin', 'recepcao', 'terapeuta')
  );

CREATE POLICY "responsaveis_detalhes: inserção admin"
  ON responsaveis_detalhes FOR INSERT
  WITH CHECK (get_my_role() IN ('admin', 'recepcao'));

CREATE POLICY "responsaveis_detalhes: atualização"
  ON responsaveis_detalhes FOR UPDATE
  USING (
    id = auth.uid()
    OR get_my_role() IN ('admin', 'recepcao')
  );


-- ============================================================
-- 5. TABELA: pacientes_dados_clinicos
-- Preenchida exclusivamente pela terapeuta vinculada
-- ============================================================

CREATE TABLE IF NOT EXISTS pacientes_dados_clinicos (
  paciente_id                   uuid PRIMARY KEY REFERENCES pacientes(id) ON DELETE CASCADE,
  hipotese_diagnostica          text,
  diagnostico                   text,
  objetivos_terapeuticos        text,
  plano_terapeutico             text,
  demandas_prioritarias         text,
  data_avaliacao_inicial        date,
  obs_clinicas_gerais           text,
  estrategias_utilizadas        text,
  orientacoes_para_casa         text,
  evolucao_resumida             text,
  metas_curto_prazo             text,
  metas_medio_prazo             text,
  sensibilidades_restricoes     text,
  nivel_suporte                 text,
  obs_comportamento_regulacao   text,
  informacoes_escolares         text,
  pontos_atencao_equipe         text,
  atualizado_em                 timestamptz,
  atualizado_por                uuid REFERENCES profiles(id)
);

ALTER TABLE pacientes_dados_clinicos ENABLE ROW LEVEL SECURITY;

-- Admin e recepcao só leem (nunca escrevem)
CREATE POLICY "dados_clinicos: leitura admin"
  ON pacientes_dados_clinicos FOR SELECT
  USING (get_my_role() IN ('admin', 'recepcao'));

-- Terapeuta lê dados clínicos dos seus pacientes
CREATE POLICY "dados_clinicos: leitura terapeuta"
  ON pacientes_dados_clinicos FOR SELECT
  USING (
    get_my_role() = 'terapeuta'
    AND EXISTS (
      SELECT 1 FROM paciente_terapeutas
      WHERE paciente_id = pacientes_dados_clinicos.paciente_id
        AND terapeuta_id = auth.uid()
    )
  );

-- Terapeuta insere apenas dos seus pacientes
CREATE POLICY "dados_clinicos: inserção terapeuta"
  ON pacientes_dados_clinicos FOR INSERT
  WITH CHECK (
    get_my_role() = 'terapeuta'
    AND EXISTS (
      SELECT 1 FROM paciente_terapeutas
      WHERE paciente_id = pacientes_dados_clinicos.paciente_id
        AND terapeuta_id = auth.uid()
    )
  );

-- Terapeuta atualiza apenas dos seus pacientes
CREATE POLICY "dados_clinicos: atualização terapeuta"
  ON pacientes_dados_clinicos FOR UPDATE
  USING (
    get_my_role() = 'terapeuta'
    AND EXISTS (
      SELECT 1 FROM paciente_terapeutas
      WHERE paciente_id = pacientes_dados_clinicos.paciente_id
        AND terapeuta_id = auth.uid()
    )
  );


-- ============================================================
-- 6. TABELA: agendamentos
-- Criados por recepcao ou admin; vistos por terapeuta e responsável
-- ============================================================

CREATE TABLE IF NOT EXISTS agendamentos (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  paciente_id         uuid REFERENCES pacientes(id) ON DELETE SET NULL,
  terapeuta_id        uuid NOT NULL REFERENCES profiles(id),
  criado_por          uuid NOT NULL REFERENCES profiles(id),
  tipo                text NOT NULL DEFAULT 'sessao'
                        CHECK (tipo IN ('sessao', 'devolutiva', 'reuniao', 'outro')),
  titulo              text NOT NULL,
  motivo              text,
  data_hora           timestamptz NOT NULL,
  duracao_minutos     int NOT NULL DEFAULT 50,
  visivel_responsavel boolean NOT NULL DEFAULT true,
  criado_em           timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE agendamentos ENABLE ROW LEVEL SECURITY;

-- Admin e recepcao gerenciam tudo
CREATE POLICY "agendamentos: gestão admin"
  ON agendamentos FOR ALL
  USING (get_my_role() IN ('admin', 'recepcao'));

-- Terapeuta lê seus próprios agendamentos
CREATE POLICY "agendamentos: leitura terapeuta"
  ON agendamentos FOR SELECT
  USING (
    get_my_role() = 'terapeuta'
    AND terapeuta_id = auth.uid()
  );

-- Responsável lê agendamentos visíveis dos seus filhos
CREATE POLICY "agendamentos: leitura responsável"
  ON agendamentos FOR SELECT
  USING (
    get_my_role() = 'pai'
    AND visivel_responsavel = true
    AND EXISTS (
      SELECT 1 FROM paciente_responsaveis
      WHERE paciente_id = agendamentos.paciente_id
        AND responsavel_id = auth.uid()
    )
  );


-- ============================================================
-- 7. TABELA: notificacoes
-- ============================================================

CREATE TABLE IF NOT EXISTS notificacoes (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  destinatario_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  tipo            text NOT NULL
                    CHECK (tipo IN ('solicitacao_alta', 'alta_aceita', 'alta_recusada')),
  ref_id          uuid,
  lida            boolean NOT NULL DEFAULT false,
  criado_em       timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE notificacoes ENABLE ROW LEVEL SECURITY;

-- Cada usuário vê apenas as suas notificações
CREATE POLICY "notificacoes: leitura própria"
  ON notificacoes FOR SELECT
  USING (destinatario_id = auth.uid());

-- Sistema insere (via service role); usuário pode marcar como lida
CREATE POLICY "notificacoes: atualização própria"
  ON notificacoes FOR UPDATE
  USING (destinatario_id = auth.uid());


-- ============================================================
-- 8. ATUALIZAR audit_acao ENUM com novos valores
-- O PostgreSQL não permite ADD VALUE dentro de transação,
-- mas permite fora. Execute cada ALTER TYPE separadamente se necessário.
-- ============================================================

ALTER TYPE audit_acao ADD VALUE IF NOT EXISTS 'desativou';
ALTER TYPE audit_acao ADD VALUE IF NOT EXISTS 'reativou';
ALTER TYPE audit_acao ADD VALUE IF NOT EXISTS 'solicitou_alta';
ALTER TYPE audit_acao ADD VALUE IF NOT EXISTS 'aprovou_alta';
ALTER TYPE audit_acao ADD VALUE IF NOT EXISTS 'recusou_alta';


-- ============================================================
-- 9. ATUALIZAR política de status para permitir recepcao
--    desativar/reativar pacientes (além do admin)
-- ============================================================

-- A lógica de autorização de status já é tratada na API Route;
-- a política RLS de UPDATE em pacientes já inclui admin e recepcao
-- desde a migration 003. Nenhuma alteração de RLS necessária aqui.
