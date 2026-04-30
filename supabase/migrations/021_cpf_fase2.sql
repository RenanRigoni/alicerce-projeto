-- Migration 021 — CPF Fase 2: função de leitura segura + backfill
-- LGPD Art. 46: criptografia de dado sensível (CPF) em repouso.
--
-- PRÉ-REQUISITO: app.cpf_key deve estar configurada antes de executar.
--   No SQL Editor do Supabase:
--   ALTER DATABASE postgres SET app.cpf_key = 'chave-secreta-minimo-32-chars';
--
-- Esta migration:
--   1. Cria função SECURITY DEFINER para leitura autorizada de CPF decifrado
--   2. Backfill: cifra CPFs existentes (só executa se app.cpf_key estiver configurada)

-- 1. Função de leitura: decifra CPF para roles autorizadas
CREATE OR REPLACE FUNCTION get_paciente_cpf(p_patient_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  v_cpf_cifrado text;
BEGIN
  -- Autorização: admin, recepcao ou terapeuta vinculado ao paciente
  IF NOT (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'recepcao'))
    OR EXISTS (
      SELECT 1 FROM paciente_terapeutas
      WHERE paciente_id = p_patient_id AND terapeuta_id = auth.uid()
    )
  ) THEN
    RETURN NULL;
  END IF;

  SELECT cpf_cifrado INTO v_cpf_cifrado FROM pacientes WHERE id = p_patient_id;
  RETURN decrypt_cpf(v_cpf_cifrado);  -- retorna NULL se chave não configurada ou sem cpf_cifrado
END;
$$;

-- 2. Backfill condicional: só executa se app.cpf_key estiver configurada
DO $$
DECLARE
  v_chave text;
BEGIN
  v_chave := current_setting('app.cpf_key', true);
  IF v_chave IS NOT NULL AND v_chave != '' THEN
    UPDATE pacientes
    SET cpf_cifrado = encrypt_cpf(cpf)
    WHERE cpf IS NOT NULL
      AND cpf != ''
      AND cpf_cifrado IS NULL;
    RAISE NOTICE 'CPF backfill concluído.';
  ELSE
    RAISE NOTICE 'app.cpf_key não configurada — backfill ignorado. Configure a chave e re-execute.';
  END IF;
END;
$$;
