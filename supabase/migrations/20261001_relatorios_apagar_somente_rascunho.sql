-- Relatório em rascunho pode ser apagado pela autora. Relatório PUBLICADO não.
--
-- Decisão do Renan com base nas normas: a cópia do documento emitido tem de ficar arquivada. Um
-- relatório publicado saiu da clínica — a família leva para a escola, para o plano, para o INSS
-- — e a guarda responde a profissional junto com a instituição (COFFITO 414/2012 para fisio e
-- TO, CFP 006/2019 + 001/2009 para psicologia, mínimo 5 anos; prontuário digital, mínimo 20
-- anos pela Lei 13.787/2018). Apagar a cópia da clínica deixaria o documento sem respaldo se
-- alguém o questionasse depois.
--
-- Rascunho nunca foi emitido nem entregue: não é documento, é trabalho em andamento, e nenhuma
-- norma o protege. A tela já só deixa editar rascunho; apagar segue a mesma linha.
--
-- O `status <> 'publicado'` fica na policy, não só na rota: é a tranca de verdade. Se `status`
-- fosse nulo, `null <> 'publicado'` é nulo e a policy não concede — errar para o lado de não
-- apagar é o lado certo.
--
-- A RESTRICTIVE `somente_leitura_pos_alta` continua valendo: depois da alta, nada se apaga.
--
-- Medido em transação desfeita antes de aplicar: autora apaga rascunho (1 linha), autora tenta
-- apagar publicado (0 linhas). Em produção os 6 relatórios existentes estão todos publicados,
-- então nenhum deles passa a poder ser apagado.

create policy "relatorios: exclusão terapeuta"
  on public.relatorios for delete
  using (terapeuta_id = auth.uid() and status <> 'publicado'::relatorio_status);

-- Apagar rascunho passou a ser possível, então a exclusão deixa rastro de quem apagou e quando.
-- `trigger_audit_log()` já trata DELETE (grava `excluiu`) e `audit_logs.recurso_id` não tem FK,
-- então o registro sobrevive à linha apagada.
drop trigger if exists audit_relatorios on public.relatorios;
create trigger audit_relatorios
  after insert or update or delete on public.relatorios
  for each row execute function public.trigger_audit_log();
