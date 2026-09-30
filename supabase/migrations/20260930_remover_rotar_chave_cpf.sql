-- rotar_chave_cpf estava quebrada em tres pontos (search_path sem extensions,
-- pgp_sym_decrypt sem decode de base64, pgp_sym_encrypt sem encode) e todas as
-- falhas eram engolidas por EXCEPTION WHEN OTHERS RAISE WARNING. O UPDATE final
-- da chave em _app_config rodava sem condicao, entao uma chamada trocava a chave
-- sem re-encriptar nada e tornava os 25 CPFs cifrados indecifraveis para sempre,
-- respondendo success: true.
--
-- Rotacao de chave nao e necessidade do produto hoje. Removida por decisao do
-- dono (Opcao A). Se um dia for preciso, reescrever com os passos simetricos
-- (decode/encode) e sem EXCEPTION interno, para que qualquer falha aborte a
-- transacao antes de gravar a chave nova.

drop function if exists public.rotar_chave_cpf(text);
