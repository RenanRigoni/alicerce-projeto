-- audit_acao não tinha valor de exclusão, então trigger_audit_log mapeava DELETE para 'alterou'.
-- Hoje é código morto (nenhum trigger de DELETE existe), mas trilha que registra exclusão como
-- alteração parece confiável e mente. Esta migration adiciona 'excluiu' e a função passa a
-- usá-lo quando TG_OP = 'DELETE'.
--
-- NÃO cria nenhum trigger de DELETE: só deixa a função correta para quando alguém criar.

ALTER TYPE public.audit_acao ADD VALUE IF NOT EXISTS 'excluiu';

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
    ELSE 'excluiu'  -- DELETE
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
