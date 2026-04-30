-- Migration 020 — Triggers de auditoria automática para tabelas clínicas
-- LGPD Art. 37: rastreabilidade de operações sobre dados pessoais.
-- COFFITO Res. 424/2013: histórico completo de registros clínicos.

-- Função genérica para registrar auditoria via trigger
CREATE OR REPLACE FUNCTION trigger_audit_log()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_uid  uuid;
  v_acao text;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN RETURN NEW; END IF;  -- service_role bypassa auditoria do trigger

  v_acao := CASE TG_OP
    WHEN 'INSERT' THEN 'enviou'
    WHEN 'UPDATE' THEN 'alterou'
    ELSE 'alterou'
  END;

  INSERT INTO audit_logs (usuario_id, acao, recurso_tipo, recurso_id)
  VALUES (v_uid, v_acao, TG_TABLE_NAME, NEW.id::text)
  ON CONFLICT DO NOTHING;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;  -- auditoria nunca bloqueia operação principal
END;
$$;

-- Trigger: orientações
DROP TRIGGER IF EXISTS audit_orientacoes ON orientacoes;
CREATE TRIGGER audit_orientacoes
  AFTER INSERT OR UPDATE ON orientacoes
  FOR EACH ROW EXECUTE FUNCTION trigger_audit_log();

-- Trigger: documentos
DROP TRIGGER IF EXISTS audit_documentos ON documentos;
CREATE TRIGGER audit_documentos
  AFTER INSERT OR UPDATE ON documentos
  FOR EACH ROW EXECUTE FUNCTION trigger_audit_log();

-- Trigger: dados clínicos
DROP TRIGGER IF EXISTS audit_dados_clinicos ON pacientes_dados_clinicos;
CREATE TRIGGER audit_dados_clinicos
  AFTER INSERT OR UPDATE ON pacientes_dados_clinicos
  FOR EACH ROW EXECUTE FUNCTION trigger_audit_log();

-- Trigger: alta
DROP TRIGGER IF EXISTS audit_solicitacoes_alta ON solicitacoes_alta;
CREATE TRIGGER audit_solicitacoes_alta
  AFTER INSERT OR UPDATE ON solicitacoes_alta
  FOR EACH ROW EXECUTE FUNCTION trigger_audit_log();

-- Trigger: relatórios (INSERT + UPDATE de status)
DROP TRIGGER IF EXISTS audit_relatorios ON relatorios;
CREATE TRIGGER audit_relatorios
  AFTER INSERT OR UPDATE ON relatorios
  FOR EACH ROW EXECUTE FUNCTION trigger_audit_log();
