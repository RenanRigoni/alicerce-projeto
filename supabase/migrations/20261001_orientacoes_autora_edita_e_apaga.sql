-- Orientação é dica que a profissional passa ao responsável pelo portal. Não é registro de
-- atendimento (isso é `evolucoes`) nem documento emitido (isso é `relatorios`): não está sob a
-- guarda obrigatória de prontuário. Decisão do Renan, dono da clínica: a autora pode editar e
-- apagar as dela.
--
-- Faltavam as duas policies PERMISSIVE para terapeuta. Admin e recepção já podiam, pela policy
-- "orientacoes: gestão admin" (ALL) — só quem escreve não podia consertar o que escreveu. O
-- UPDATE afetava 0 linhas SEM erro e a rota respondia "salvo"; o DELETE a rota recusava.
--
-- A RESTRICTIVE `somente_leitura_pos_alta` continua valendo nas duas: depois da alta o
-- prontuário fica só leitura, como no resto do sistema.
--
-- `using (terapeuta_id = auth.uid())` sem WITH CHECK explícito: no UPDATE o Postgres aplica a
-- mesma expressão à linha nova, então a autora também não consegue transferir a orientação
-- para outra terapeuta.
--
-- Medido em transação desfeita antes de aplicar, com auth.uid() real: autora edita 1 linha,
-- autora apaga 1 linha, outra terapeuta edita 0 e apaga 0 (título intacto depois da tentativa).

create policy "orientacoes: atualização terapeuta"
  on public.orientacoes for update using (terapeuta_id = auth.uid());

create policy "orientacoes: exclusão terapeuta"
  on public.orientacoes for delete using (terapeuta_id = auth.uid());

-- Apagar orientação passou a ser possível, então a exclusão precisa deixar rastro: quem apagou
-- e quando. `trigger_audit_log()` já trata DELETE corretamente (grava `excluiu`, usa OLD e o id
-- da linha) desde a migration 20260930_audit_acao_excluiu.sql, e `audit_logs.recurso_id` não
-- tem FK, então o registro sobrevive à linha apagada. Só recriar o trigger incluindo DELETE.
drop trigger if exists audit_orientacoes on public.orientacoes;
create trigger audit_orientacoes
  after insert or update or delete on public.orientacoes
  for each row execute function public.trigger_audit_log();
