-- Retificação de evolução por ACRÉSCIMO, nunca por alteração.
--
-- A norma brasileira de prontuário eletrônico (certificação CFM/SBIS) exige que o sistema
-- impeça modificar o que foi escrito e salvo após o atendimento: informações podem ser
-- ACRESCENTADAS, não alteradas. Evolução publicada já era travada para edição (a rota devolve
-- 409) e não tem policy de DELETE — ninguém apaga evolução. O que faltava era o caminho legítimo
-- para corrigir: uma evolução nova que aponta para a que ela retifica. As duas ficam no
-- prontuário, cada uma com sua autora, data, assinatura e hash.
--
-- Nenhuma coluna marca a original como "retificada": isso se deduz de existir uma linha
-- apontando para ela. Uma informação, um lugar.
--
-- Cadeia é permitida (retificar uma retificação): correção de correção acontece e cada elo
-- continua preservado. Várias retificações da mesma evolução também.
--
-- Sem ON DELETE CASCADE de propósito: o NO ACTION padrão vira uma segunda tranca — o banco
-- recusa apagar uma evolução que tem retificação apontando para ela.

alter table public.evolucoes add column retifica_id uuid references public.evolucoes(id);

comment on column public.evolucoes.retifica_id is
  'Evolução que esta retifica. A original nunca é alterada nem apagada: as duas ficam no prontuário.';

alter table public.evolucoes
  add constraint evolucoes_retifica_nao_propria check (retifica_id is null or retifica_id <> id);

-- A CHECK não alcança outra linha, então o mesmo-paciente vira trigger. Sem isso daria para
-- pendurar a retificação de uma criança na evolução de outra.
create or replace function public.validar_retificacao_evolucao()
 returns trigger
 language plpgsql
 security definer
 set search_path to 'public', 'pg_temp'
as $fn$
declare
  v_pac uuid;
begin
  if NEW.retifica_id is null then
    return NEW;
  end if;

  select paciente_id into v_pac from public.evolucoes where id = NEW.retifica_id;

  if v_pac is null then
    raise exception 'Evolucao a retificar nao existe' using errcode = '23503';
  end if;
  if v_pac <> NEW.paciente_id then
    raise exception 'Retificacao tem de ser do mesmo paciente da evolucao original' using errcode = '23514';
  end if;

  return NEW;
end;
$fn$;

create trigger validar_retificacao
  before insert or update on public.evolucoes
  for each row execute function public.validar_retificacao_evolucao();
