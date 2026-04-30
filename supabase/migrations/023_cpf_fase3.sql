-- =============================================================
-- Migration 023 — CPF Fase 3
-- Pré-requisito: migration 022 aplicada, cpf_cifrado populado
-- para todos os pacientes que tinham cpf plaintext.
--
-- APLICAR SOMENTE após:
--   1. Deploy do código que remove toda referência à coluna `cpf`
--   2. Confirmar que cpf_cifrado está populado para todos os registros
--      que tinham cpf (SELECT id FROM pacientes WHERE cpf IS NOT NULL AND cpf_cifrado IS NULL)
--
-- =============================================================

-- 1. Drop da coluna plaintext
ALTER TABLE pacientes DROP COLUMN IF EXISTS cpf;

-- 2. Função de rotação da chave CPF (admin-only via API)
--    Decripta todos os CPFs com a chave atual, re-encripta com nova chave,
--    e atualiza _app_config — tudo dentro de uma transação implícita.
CREATE OR REPLACE FUNCTION rotar_chave_cpf(nova_chave text)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rec           RECORD;
  chave_atual   text;
  cpf_plain     text;
  count_ok      integer := 0;
BEGIN
  IF get_my_role() != 'admin' THEN
    RAISE EXCEPTION 'Apenas administradores podem rotar a chave CPF';
  END IF;

  IF length(nova_chave) < 32 THEN
    RAISE EXCEPTION 'Nova chave deve ter pelo menos 32 caracteres';
  END IF;

  SELECT value INTO chave_atual FROM _app_config WHERE key = 'cpf_key';
  IF chave_atual IS NULL THEN
    RAISE EXCEPTION 'Chave CPF atual não encontrada em _app_config';
  END IF;

  IF chave_atual = nova_chave THEN
    RAISE EXCEPTION 'Nova chave é idêntica à atual';
  END IF;

  FOR rec IN SELECT id, cpf_cifrado FROM pacientes WHERE cpf_cifrado IS NOT NULL LOOP
    BEGIN
      cpf_plain := convert_from(
        pgp_sym_decrypt(rec.cpf_cifrado, chave_atual),
        'UTF8'
      );
      UPDATE pacientes
        SET cpf_cifrado = pgp_sym_encrypt(cpf_plain, nova_chave, 'compress-algo=1, sess-key=1')
        WHERE id = rec.id;
      count_ok := count_ok + 1;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Falha ao re-encriptar CPF do paciente %: %', rec.id, SQLERRM;
    END;
  END LOOP;

  UPDATE _app_config SET value = nova_chave WHERE key = 'cpf_key';

  RETURN count_ok;
END;
$$;

REVOKE ALL ON FUNCTION rotar_chave_cpf(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION rotar_chave_cpf(text) FROM anon;
REVOKE ALL ON FUNCTION rotar_chave_cpf(text) FROM authenticated;
