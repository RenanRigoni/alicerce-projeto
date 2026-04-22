-- ============================================================
-- Alicerce Espaço Terapêutico — Migration 001
-- Execute no SQL Editor do Supabase
-- ============================================================


-- ============================================================
-- 1. TIPOS ENUM
-- ============================================================

CREATE TYPE user_role AS ENUM ('admin', 'terapeuta', 'recepcao', 'pai');
CREATE TYPE relatorio_status AS ENUM ('rascunho', 'publicado');
CREATE TYPE documento_tipo AS ENUM ('foto', 'pdf', 'video', 'outro');
CREATE TYPE audit_acao AS ENUM ('visualizou', 'enviou', 'alterou', 'assinou', 'baixou');
CREATE TYPE comentario_ref_tipo AS ENUM ('relatorio', 'documento');


-- ============================================================
-- 2. TABELA: profiles
-- Estende auth.users com role e dados do perfil
-- ============================================================

CREATE TABLE profiles (
  id          uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome        text NOT NULL,
  role        user_role NOT NULL DEFAULT 'pai',
  foto_url    text,
  criado_em   timestamptz NOT NULL DEFAULT now()
);

-- Trigger: cria profile automaticamente ao criar usuário no Auth
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, nome, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nome', NEW.email),
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'pai')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();


-- ============================================================
-- 3. TABELA: pacientes
-- ============================================================

CREATE TABLE pacientes (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome                   text NOT NULL,
  foto_url               text,
  data_nascimento        date,
  diagnostico            text,
  plano_terapeutico      text,
  frequencia_atendimento text,
  criado_em              timestamptz NOT NULL DEFAULT now()
);


-- ============================================================
-- 4. TABELAS DE VÍNCULO (junction)
-- ============================================================

CREATE TABLE paciente_responsaveis (
  paciente_id    uuid NOT NULL REFERENCES pacientes(id) ON DELETE CASCADE,
  responsavel_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  PRIMARY KEY (paciente_id, responsavel_id)
);

CREATE TABLE paciente_terapeutas (
  paciente_id  uuid NOT NULL REFERENCES pacientes(id) ON DELETE CASCADE,
  terapeuta_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  PRIMARY KEY (paciente_id, terapeuta_id)
);


-- ============================================================
-- 5. TABELA: relatorios
-- ============================================================

CREATE TABLE relatorios (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  paciente_id          uuid NOT NULL REFERENCES pacientes(id) ON DELETE CASCADE,
  terapeuta_id         uuid NOT NULL REFERENCES profiles(id),
  identificacao        text,
  obs_clinicas         text,
  testes               text,
  resultado_discussao  text,
  conclusao            text,
  status               relatorio_status NOT NULL DEFAULT 'rascunho',
  assinatura_digital   text,
  assinado_em          timestamptz,
  pdf_url              text,
  publicado_em         timestamptz,
  criado_em            timestamptz NOT NULL DEFAULT now()
);


-- ============================================================
-- 6. TABELA: documentos
-- ============================================================

CREATE TABLE documentos (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  paciente_id  uuid NOT NULL REFERENCES pacientes(id) ON DELETE CASCADE,
  enviado_por  uuid NOT NULL REFERENCES profiles(id),
  tipo         documento_tipo NOT NULL DEFAULT 'outro',
  descricao    text,
  arquivo_url  text NOT NULL,
  visivel_pais boolean NOT NULL DEFAULT true,
  criado_em    timestamptz NOT NULL DEFAULT now()
);


-- ============================================================
-- 7. TABELA: orientacoes
-- ============================================================

CREATE TABLE orientacoes (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  paciente_id  uuid NOT NULL REFERENCES pacientes(id) ON DELETE CASCADE,
  terapeuta_id uuid NOT NULL REFERENCES profiles(id),
  titulo       text NOT NULL,
  conteudo     text NOT NULL,
  criado_em    timestamptz NOT NULL DEFAULT now()
);


-- ============================================================
-- 8. TABELA: comunicados
-- ============================================================

CREATE TABLE comunicados (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  criado_por  uuid NOT NULL REFERENCES profiles(id),
  titulo      text NOT NULL,
  conteudo    text NOT NULL,
  criado_em   timestamptz NOT NULL DEFAULT now()
);


-- ============================================================
-- 9. TABELA: comentarios
-- ============================================================

CREATE TABLE comentarios (
  id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ref_tipo  comentario_ref_tipo NOT NULL,
  ref_id    uuid NOT NULL,
  autor_id  uuid NOT NULL REFERENCES profiles(id),
  conteudo  text NOT NULL,
  criado_em timestamptz NOT NULL DEFAULT now()
);


-- ============================================================
-- 10. TABELA: audit_logs
-- ============================================================

CREATE TABLE audit_logs (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id    uuid NOT NULL REFERENCES profiles(id),
  acao          audit_acao NOT NULL,
  recurso_tipo  text NOT NULL,
  recurso_id    uuid,
  criado_em     timestamptz NOT NULL DEFAULT now()
);


-- ============================================================
-- 11. HABILITAR RLS EM TODAS AS TABELAS
-- ============================================================

ALTER TABLE profiles             ENABLE ROW LEVEL SECURITY;
ALTER TABLE pacientes            ENABLE ROW LEVEL SECURITY;
ALTER TABLE paciente_responsaveis ENABLE ROW LEVEL SECURITY;
ALTER TABLE paciente_terapeutas  ENABLE ROW LEVEL SECURITY;
ALTER TABLE relatorios           ENABLE ROW LEVEL SECURITY;
ALTER TABLE documentos           ENABLE ROW LEVEL SECURITY;
ALTER TABLE orientacoes          ENABLE ROW LEVEL SECURITY;
ALTER TABLE comunicados          ENABLE ROW LEVEL SECURITY;
ALTER TABLE comentarios          ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs           ENABLE ROW LEVEL SECURITY;


-- ============================================================
-- 12. HELPER: função para obter o role do usuário logado
-- ============================================================

CREATE OR REPLACE FUNCTION get_my_role()
RETURNS user_role AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;


-- ============================================================
-- 13. POLÍTICAS RLS: profiles
-- ============================================================

-- Usuário vê apenas o próprio perfil; admin/recepcao veem todos
CREATE POLICY "profiles: leitura própria" ON profiles
  FOR SELECT USING (
    id = auth.uid()
    OR get_my_role() IN ('admin', 'recepcao')
  );

-- Usuário atualiza apenas o próprio perfil
CREATE POLICY "profiles: atualização própria" ON profiles
  FOR UPDATE USING (id = auth.uid());

-- Apenas admin/recepcao inserem perfis manualmente (trigger cuida do resto)
CREATE POLICY "profiles: inserção admin" ON profiles
  FOR INSERT WITH CHECK (get_my_role() IN ('admin', 'recepcao'));


-- ============================================================
-- 14. POLÍTICAS RLS: pacientes
-- ============================================================

-- Pai vê apenas seus pacientes vinculados
-- Terapeuta vê apenas seus pacientes vinculados
-- Admin/recepcao veem todos
CREATE POLICY "pacientes: leitura" ON pacientes
  FOR SELECT USING (
    get_my_role() IN ('admin', 'recepcao')
    OR EXISTS (
      SELECT 1 FROM paciente_responsaveis
      WHERE paciente_id = pacientes.id AND responsavel_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM paciente_terapeutas
      WHERE paciente_id = pacientes.id AND terapeuta_id = auth.uid()
    )
  );

CREATE POLICY "pacientes: inserção admin" ON pacientes
  FOR INSERT WITH CHECK (get_my_role() IN ('admin', 'recepcao'));

CREATE POLICY "pacientes: atualização admin" ON pacientes
  FOR UPDATE USING (get_my_role() IN ('admin', 'recepcao'));

CREATE POLICY "pacientes: exclusão admin" ON pacientes
  FOR DELETE USING (get_my_role() = 'admin');


-- ============================================================
-- 15. POLÍTICAS RLS: tabelas de vínculo
-- ============================================================

CREATE POLICY "paciente_responsaveis: leitura" ON paciente_responsaveis
  FOR SELECT USING (
    get_my_role() IN ('admin', 'recepcao')
    OR responsavel_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM paciente_terapeutas
      WHERE paciente_id = paciente_responsaveis.paciente_id AND terapeuta_id = auth.uid()
    )
  );

CREATE POLICY "paciente_responsaveis: gestão admin" ON paciente_responsaveis
  FOR ALL USING (get_my_role() IN ('admin', 'recepcao'));

CREATE POLICY "paciente_terapeutas: leitura" ON paciente_terapeutas
  FOR SELECT USING (
    get_my_role() IN ('admin', 'recepcao')
    OR terapeuta_id = auth.uid()
  );

CREATE POLICY "paciente_terapeutas: gestão admin" ON paciente_terapeutas
  FOR ALL USING (get_my_role() IN ('admin', 'recepcao'));


-- ============================================================
-- 16. POLÍTICAS RLS: relatorios
-- ============================================================

-- Pai vê apenas relatórios PUBLICADOS dos seus pacientes
CREATE POLICY "relatorios: leitura pai" ON relatorios
  FOR SELECT USING (
    status = 'publicado'
    AND EXISTS (
      SELECT 1 FROM paciente_responsaveis
      WHERE paciente_id = relatorios.paciente_id AND responsavel_id = auth.uid()
    )
  );

-- Terapeuta vê todos (rascunho + publicado) dos seus pacientes
CREATE POLICY "relatorios: leitura terapeuta" ON relatorios
  FOR SELECT USING (
    terapeuta_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM paciente_terapeutas
      WHERE paciente_id = relatorios.paciente_id AND terapeuta_id = auth.uid()
    )
  );

-- Admin vê tudo
CREATE POLICY "relatorios: leitura admin" ON relatorios
  FOR SELECT USING (get_my_role() IN ('admin', 'recepcao'));

-- Terapeuta cria relatórios dos seus pacientes
CREATE POLICY "relatorios: inserção terapeuta" ON relatorios
  FOR INSERT WITH CHECK (
    terapeuta_id = auth.uid()
    AND get_my_role() = 'terapeuta'
  );

-- Terapeuta atualiza seus próprios relatórios
CREATE POLICY "relatorios: atualização terapeuta" ON relatorios
  FOR UPDATE USING (
    terapeuta_id = auth.uid()
    OR get_my_role() = 'admin'
  );


-- ============================================================
-- 17. POLÍTICAS RLS: documentos
-- ============================================================

-- Pai vê documentos visíveis dos seus pacientes
CREATE POLICY "documentos: leitura pai" ON documentos
  FOR SELECT USING (
    visivel_pais = true
    AND EXISTS (
      SELECT 1 FROM paciente_responsaveis
      WHERE paciente_id = documentos.paciente_id AND responsavel_id = auth.uid()
    )
  );

-- Terapeuta vê todos os documentos dos seus pacientes
CREATE POLICY "documentos: leitura terapeuta" ON documentos
  FOR SELECT USING (
    get_my_role() IN ('terapeuta', 'admin', 'recepcao')
    AND (
      get_my_role() IN ('admin', 'recepcao')
      OR EXISTS (
        SELECT 1 FROM paciente_terapeutas
        WHERE paciente_id = documentos.paciente_id AND terapeuta_id = auth.uid()
      )
    )
  );

-- Qualquer usuário vinculado ao paciente pode enviar documento
CREATE POLICY "documentos: inserção" ON documentos
  FOR INSERT WITH CHECK (
    enviado_por = auth.uid()
    AND (
      get_my_role() IN ('admin', 'recepcao', 'terapeuta')
      OR EXISTS (
        SELECT 1 FROM paciente_responsaveis
        WHERE paciente_id = documentos.paciente_id AND responsavel_id = auth.uid()
      )
    )
  );


-- ============================================================
-- 18. POLÍTICAS RLS: orientacoes
-- ============================================================

CREATE POLICY "orientacoes: leitura" ON orientacoes
  FOR SELECT USING (
    get_my_role() IN ('admin', 'recepcao', 'terapeuta')
    OR EXISTS (
      SELECT 1 FROM paciente_responsaveis
      WHERE paciente_id = orientacoes.paciente_id AND responsavel_id = auth.uid()
    )
  );

CREATE POLICY "orientacoes: inserção terapeuta" ON orientacoes
  FOR INSERT WITH CHECK (
    terapeuta_id = auth.uid()
    AND get_my_role() = 'terapeuta'
  );

CREATE POLICY "orientacoes: gestão admin" ON orientacoes
  FOR ALL USING (get_my_role() IN ('admin', 'recepcao'));


-- ============================================================
-- 19. POLÍTICAS RLS: comunicados
-- ============================================================

-- Todos os usuários autenticados veem comunicados
CREATE POLICY "comunicados: leitura" ON comunicados
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "comunicados: inserção admin" ON comunicados
  FOR INSERT WITH CHECK (get_my_role() IN ('admin', 'recepcao'));

CREATE POLICY "comunicados: atualização admin" ON comunicados
  FOR UPDATE USING (get_my_role() IN ('admin', 'recepcao'));


-- ============================================================
-- 20. POLÍTICAS RLS: comentarios
-- ============================================================

-- Qualquer usuário autenticado pode ler comentários (RLS do relatorio/documento filtra o acesso)
CREATE POLICY "comentarios: leitura" ON comentarios
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "comentarios: inserção" ON comentarios
  FOR INSERT WITH CHECK (autor_id = auth.uid());


-- ============================================================
-- 21. POLÍTICAS RLS: audit_logs
-- ============================================================

-- Apenas admin lê o log de auditoria
CREATE POLICY "audit_logs: leitura admin" ON audit_logs
  FOR SELECT USING (get_my_role() = 'admin');

-- Qualquer usuário autenticado pode inserir (o sistema insere automaticamente)
CREATE POLICY "audit_logs: inserção" ON audit_logs
  FOR INSERT WITH CHECK (usuario_id = auth.uid());
