-- Migration 017 — Infraestrutura de criptografia de CPF em repouso
-- LGPD Art. 46 — medidas técnicas de proteção de dados sensíveis.
--
-- ESTRATÉGIA DE MIGRAÇÃO SEGURA (3 fases):
--
-- FASE 1 — Esta migration (executar agora):
--   Instala pgcrypto, cria funções de encrypt/decrypt,
--   adiciona coluna cpf_cifrado em paralelo à cpf existente.
--
-- FASE 2 — Após atualizar o código da aplicação:
--   Preencher cpf_cifrado com dados existentes:
--   UPDATE pacientes SET cpf_cifrado = encrypt_cpf(cpf) WHERE cpf IS NOT NULL;
--   Atualizar todas as escritas da app para usar cpf_cifrado.
--   Atualizar todas as leituras para usar decrypt_cpf(cpf_cifrado).
--
-- FASE 3 — Após validar Fase 2 em produção:
--   ALTER TABLE pacientes DROP COLUMN cpf;
--   ALTER TABLE pacientes RENAME COLUMN cpf_cifrado TO cpf;
--
-- A chave de criptografia deve ser configurada ANTES de executar esta migration:
--   No Supabase Dashboard → Settings → Database → Extensions → pgcrypto (enable)
--   No SQL Editor: ALTER DATABASE postgres SET app.cpf_key = 'chave-secreta-minimo-32-chars';
--   IMPORTANTE: guardar a chave fora do banco (LastPass, 1Password, etc.)
--   Perda da chave = perda dos CPFs cifrados.

-- 1. Extensão
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. Função de criptografia (AES/Blowfish via PGP simétrico)
CREATE OR REPLACE FUNCTION encrypt_cpf(cpf_plain text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  chave text;
BEGIN
  chave := current_setting('app.cpf_key', true);
  IF chave IS NULL OR chave = '' THEN
    RAISE EXCEPTION 'app.cpf_key não configurada. Execute: ALTER DATABASE postgres SET app.cpf_key = ''sua-chave'';';
  END IF;
  RETURN encode(pgp_sym_encrypt(cpf_plain, chave), 'base64');
END;
$$;

-- 3. Função de decriptografia
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
  chave := current_setting('app.cpf_key', true);
  IF chave IS NULL OR chave = '' THEN RETURN NULL; END IF;
  RETURN pgp_sym_decrypt(decode(cpf_enc, 'base64'), chave);
EXCEPTION WHEN OTHERS THEN
  RETURN NULL; -- retorna NULL se a chave estiver errada, sem quebrar a query
END;
$$;

-- 4. Coluna paralela (Fase 1 — não dropa cpf ainda)
ALTER TABLE pacientes
  ADD COLUMN IF NOT EXISTS cpf_cifrado text;

-- 5. Revogar acesso direto ao cpf_cifrado para roles não-privilegiadas
-- (service_role mantém acesso via SECURITY DEFINER nas funções)
REVOKE SELECT (cpf_cifrado) ON pacientes FROM anon;
REVOKE SELECT (cpf_cifrado) ON pacientes FROM authenticated;

-- Nota: para que authenticated possa ler o CPF via aplicação,
-- use a função decrypt_cpf() nas queries ao invés de selecionar a coluna diretamente.
-- Ex: SELECT decrypt_cpf(cpf_cifrado) AS cpf FROM pacientes WHERE id = $1;
