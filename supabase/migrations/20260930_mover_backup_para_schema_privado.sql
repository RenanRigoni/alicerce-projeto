-- _backup_confirmacoes_terapeuta_20260929 estava em public com RLS desligado
-- e SELECT liberado para anon: 82 linhas de PHI legíveis pela internet.
-- É o snapshot pré-correção de b241c02 (81 das 82 linhas divergem no
-- terapeuta_id da tabela viva), então tem valor de rollback e é preservado.
--
-- _backup_horarios_20260930 (snapshot de horarios_atendimento antes da fonte
-- única de horário, 84ed23a) tinha exatamente a mesma exposição e vai junto.

create schema if not exists backups;

revoke all on schema backups from anon, authenticated;

revoke all on public._backup_confirmacoes_terapeuta_20260929 from anon, authenticated;
alter table public._backup_confirmacoes_terapeuta_20260929 set schema backups;
alter table backups._backup_confirmacoes_terapeuta_20260929 enable row level security;

revoke all on public._backup_horarios_20260930 from anon, authenticated;
alter table public._backup_horarios_20260930 set schema backups;
alter table backups._backup_horarios_20260930 enable row level security;

comment on table backups._backup_confirmacoes_terapeuta_20260929 is
  'Snapshot de sessao_confirmacoes.terapeuta_id anterior a b241c02 (29/09/2026). Fora de public para nao ser exposto pelo PostgREST. Pode ser removido apos validacao do fix de atribuicao de horario.';

comment on table backups._backup_horarios_20260930 is
  'Snapshot de horarios_atendimento anterior a 84ed23a (30/09/2026). Fora de public para nao ser exposto pelo PostgREST. Pode ser removido apos validacao da fonte unica de horario.';
