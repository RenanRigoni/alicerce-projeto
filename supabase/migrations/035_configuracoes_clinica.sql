-- ─── Configurações da Clínica ────────────────────────────────────────────────
CREATE TABLE configuracoes_clinica (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  singleton             text UNIQUE DEFAULT 'default',
  -- Dados
  nome_fantasia         text,
  razao_social          text,
  tipo_pessoa           text DEFAULT 'PJ' CHECK (tipo_pessoa IN ('PF','PJ')),
  cpf_cnpj              text,
  email                 text,
  telefone              text,
  -- Endereço
  cep                   text,
  logradouro            text,
  numero                text,
  complemento           text,
  bairro                text,
  cidade                text,
  estado                text,
  -- Preferências
  intervalo_agenda      integer DEFAULT 50,
  primeiro_dia_semana   integer DEFAULT 1,
  bloquear_feriados     boolean DEFAULT false,
  updated_at            timestamptz DEFAULT now()
);

INSERT INTO configuracoes_clinica (singleton) VALUES ('default');

ALTER TABLE configuracoes_clinica ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_all_configuracoes" ON configuracoes_clinica
  FOR ALL TO authenticated
  USING   (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "staff_read_configuracoes" ON configuracoes_clinica
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('recepcao','terapeuta')));

-- ─── Horários de Funcionamento ────────────────────────────────────────────────
CREATE TABLE horarios_funcionamento (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dia_semana  integer NOT NULL CHECK (dia_semana BETWEEN 0 AND 6),
  hora_inicio time NOT NULL,
  hora_fim    time NOT NULL,
  created_at  timestamptz DEFAULT now(),
  UNIQUE (dia_semana)
);

-- Padrão: segunda a sexta, 8h–18h
INSERT INTO horarios_funcionamento (dia_semana, hora_inicio, hora_fim) VALUES
  (1,'08:00','18:00'),
  (2,'08:00','18:00'),
  (3,'08:00','18:00'),
  (4,'08:00','18:00'),
  (5,'08:00','18:00');

ALTER TABLE horarios_funcionamento ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_all_horarios" ON horarios_funcionamento
  FOR ALL TO authenticated
  USING   (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "staff_read_horarios" ON horarios_funcionamento
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('recepcao','terapeuta','pai')));
