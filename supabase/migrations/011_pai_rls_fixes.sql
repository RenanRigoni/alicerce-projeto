-- Pai (responsável) pode ver os terapeutas vinculados aos seus pacientes
CREATE POLICY "paciente_terapeutas: leitura pai"
  ON paciente_terapeutas FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM paciente_responsaveis
      WHERE paciente_id = paciente_terapeutas.paciente_id
        AND responsavel_id = auth.uid()
    )
  );

-- Pai pode ver dados clínicos dos seus pacientes
CREATE POLICY "dados_clinicos: leitura pai"
  ON pacientes_dados_clinicos FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM paciente_responsaveis
      WHERE paciente_id = pacientes_dados_clinicos.paciente_id
        AND responsavel_id = auth.uid()
    )
  );

-- Pai pode ler profiles de terapeutas vinculados aos seus pacientes
-- (necessário para JOIN profiles(nome) em paciente_terapeutas)
CREATE POLICY "profiles: pai lê terapeutas dos seus pacientes" ON profiles
  FOR SELECT USING (
    role = 'terapeuta'
    AND EXISTS (
      SELECT 1 FROM paciente_terapeutas pt
      JOIN paciente_responsaveis pr ON pr.paciente_id = pt.paciente_id
      WHERE pt.terapeuta_id = profiles.id
        AND pr.responsavel_id = auth.uid()
    )
  );
