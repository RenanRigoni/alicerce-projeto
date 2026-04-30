-- Migration 022 — Armazenamento de chave CPF em tabela interna
-- Motivo: Supabase não permite ALTER DATABASE para usuários sem superuser.
-- Solução: tabela _app_config protegida — só service_role acessa.

-- Tabela de configurações internas
CREATE TABLE IF NOT EXISTS _app_config (
  key   text PRIMARY KEY,
  value text NOT NULL
);

-- Apenas service_role (postgres) acessa — authenticated e anon bloqueados
REVOKE ALL ON TABLE _app_config FROM anon;
REVOKE ALL ON TABLE _app_config FROM authenticated;

-- Rebuild encrypt_cpf — lê chave da _app_config
CREATE OR REPLACE FUNCTION encrypt_cpf(cpf_plain text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  chave text;
BEGIN
  SELECT value INTO chave FROM _app_config WHERE key = 'cpf_key';
  IF chave IS NULL OR trim(chave) = '' THEN
    RAISE EXCEPTION 'cpf_key não configurada. Execute: INSERT INTO _app_config(key,value) VALUES(''cpf_key'',''sua-chave-minimo-32-chars'') ON CONFLICT(key) DO UPDATE SET value=EXCLUDED.value;';
  END IF;
  RETURN encode(pgp_sym_encrypt(cpf_plain, chave), 'base64');
END;
$$;

-- Rebuild decrypt_cpf — lê chave da _app_config
CREATE OR REPLACE FUNCTION decrypt_cpf(cpf_enc text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  chave text;
BEGIN
  IF cpf_enc IS NULL THEN RETURN NULL; END IF;
  SELECT value INTO chave FROM _app_config WHERE key = 'cpf_key';
  IF chave IS NULL OR trim(chave) = '' THEN RETURN NULL; END IF;
  RETURN pgp_sym_decrypt(decode(cpf_enc, 'base64'), chave);
EXCEPTION WHEN OTHERS THEN
  RETURN NULL;
END;
$$;

-- Backfill atualizado (reexecutar após configurar a chave)
DO $$
DECLARE
  v_chave text;
BEGIN
  SELECT value INTO v_chave FROM _app_config WHERE key = 'cpf_key';
  IF v_chave IS NOT NULL AND trim(v_chave) != '' THEN
    UPDATE pacientes
    SET cpf_cifrado = encrypt_cpf(cpf)
    WHERE cpf IS NOT NULL AND cpf != '' AND cpf_cifrado IS NULL;
    RAISE NOTICE 'CPF backfill concluído.';
  ELSE
    RAISE NOTICE 'cpf_key não configurada — backfill ignorado. Configure e re-execute.';
  END IF;
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- CONFIGURAR A CHAVE (executar no SQL Editor após aplicar esta migration):
--
-- INSERT INTO _app_config (key, value)
-- VALUES ('cpf_key', 'sua-chave-secreta-minimo-32-caracteres')
-- ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
--
-- IMPORTANTE: salvar a chave fora do banco (LastPass, 1Password, etc.)
-- Perda da chave = perda dos CPFs cifrados.
-- ─────────────────────────────────────────────────────────────────────────────
