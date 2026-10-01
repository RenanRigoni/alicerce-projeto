-- Corrige trigger_audit_log() (criada na 020_audit_triggers.sql). Em produção ela nunca gravou
-- uma linha sequer em audit_logs:
--
--   1. inseria `acao` como text numa coluna do enum audit_acao
--      (42804: column "acao" is of type audit_acao but expression is of type text);
--   2. inseria `NEW.id::text` numa coluna recurso_id que é uuid (mesmo 42804);
--   3. usava NEW.id, que não existe em pacientes_dados_clinicos (a chave é paciente_id);
--   4. usava NEW em qualquer operação, então um trigger de DELETE quebraria;
--   5. o EXCEPTION WHEN OTHERS THEN RETURN NEW engolia o erro em silêncio. Essa é a causa
--      raiz: erro de tipo é bug de programação, não condição de runtime, e ficou meses
--      invisível.
--
-- O que muda aqui:
--   - `acao` vira audit_acao e recurso_id vira uuid (1 e 2);
--   - o id do registro sai de to_jsonb(linha) ->> 'id', caindo para a chave primária da tabela
--     quando não há coluna id (3), sem função separada para nenhuma tabela;
--   - DELETE usa OLD (4), mas NENHUM trigger de DELETE é criado por esta migration;
--   - continua valendo "auditoria nunca bloqueia a operação principal", mas a falha agora
--     emite RAISE WARNING com tabela, operação, SQLSTATE e SQLERRM antes de seguir (5).
--     A mensagem não carrega dado do registro, só a causa do erro.
--
-- Não mexe nas políticas de audit_logs (não existir policy de UPDATE/DELETE é proposital) nem
-- nos triggers: CREATE OR REPLACE mantém os sete já ligados (documentos, encaminhamentos,
-- evolucoes, orientacoes, pacientes_dados_clinicos, relatorios, solicitacoes_alta).
--
-- Continua valendo a regra original: escrita feita com service_role (auth.uid() nulo) não é
-- auditada por este trigger.

CREATE OR REPLACE FUNCTION public.trigger_audit_log()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_uid   uuid;
  v_acao  public.audit_acao;
  v_linha jsonb;
  v_chave text;
  v_pk    text;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN  -- service_role bypassa auditoria do trigger
    IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
    RETURN NEW;
  END IF;

  v_acao := (CASE TG_OP
    WHEN 'INSERT' THEN 'enviou'
    WHEN 'UPDATE' THEN 'alterou'
    ELSE 'alterou'
  END)::public.audit_acao;

  IF TG_OP = 'DELETE' THEN
    v_linha := to_jsonb(OLD);
  ELSE
    v_linha := to_jsonb(NEW);
  END IF;

  -- id do registro: coluna "id"; sem ela, a chave primária da tabela (ex.: paciente_id)
  v_chave := v_linha ->> 'id';
  IF v_chave IS NULL THEN
    SELECT a.attname INTO v_pk
      FROM pg_index i
      JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY (i.indkey)
     WHERE i.indrelid = TG_RELID AND i.indisprimary
     ORDER BY a.attnum
     LIMIT 1;
    v_chave := v_linha ->> v_pk;
  END IF;

  IF v_chave IS NULL THEN
    RAISE WARNING 'trigger_audit_log: sem id reconhecivel em %.% (%)', TG_TABLE_SCHEMA, TG_TABLE_NAME, TG_OP;
  END IF;

  INSERT INTO public.audit_logs (usuario_id, acao, recurso_tipo, recurso_id)
  VALUES (v_uid, v_acao, TG_TABLE_NAME, v_chave::uuid)
  ON CONFLICT DO NOTHING;

  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- auditoria nunca bloqueia a operação principal, mas a falha não pode ficar invisível
  RAISE WARNING 'trigger_audit_log falhou em %.% (%): SQLSTATE % - %',
    TG_TABLE_SCHEMA, TG_TABLE_NAME, TG_OP, SQLSTATE, SQLERRM;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$function$;
