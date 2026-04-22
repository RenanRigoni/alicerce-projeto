-- Terapeuta pode ler profiles de responsáveis vinculados aos seus pacientes
-- (sem isso, PostgREST join retorna null e responsáveis somem do perfil do paciente)
CREATE POLICY "profiles: terapeuta lê responsáveis dos seus pacientes" ON profiles
  FOR SELECT USING (
    role = 'pai'
    AND EXISTS (
      SELECT 1 FROM paciente_responsaveis pr
      JOIN paciente_terapeutas pt ON pt.paciente_id = pr.paciente_id
      WHERE pr.responsavel_id = profiles.id
        AND pt.terapeuta_id = auth.uid()
    )
  );

-- Admin/recepcao podem atualizar perfis de outros usuários (edição cadastral)
CREATE POLICY "profiles: atualização admin" ON profiles
  FOR UPDATE USING (
    get_my_role() IN ('admin', 'recepcao')
  );
