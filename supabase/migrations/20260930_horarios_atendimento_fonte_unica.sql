-- Fonte da verdade do horario fixo: paciente_terapeutas.horarios_atendimento (por profissional).
-- pacientes.horarios_atendimento passa a ser so um resumo (soma deduplicada de todas as
-- profissionais), mantido por trigger. Existe porque o portal da familia le pacientes e
-- nao tem acesso a paciente_terapeutas; nenhum codigo da aplicacao escreve mais nele.
--
-- Por que: as duas colunas guardavam a mesma informacao e divergiam. O cadastro gravava so no
-- paciente e criava o vinculo vazio, entao a agenda da profissional (que le o vinculo) nao
-- enxergava as sessoes: 50 pacientes estavam assim. Ja tinha causado dois bugs de atribuicao.

-- 1) Backup de tudo que sera tocado
create table if not exists public._backup_horarios_20260930 as
select 'pacientes'::text as origem, id as paciente_id, null::uuid as terapeuta_id, horarios_atendimento
from public.pacientes
union all
select 'paciente_terapeutas', paciente_id, terapeuta_id, horarios_atendimento
from public.paciente_terapeutas;

-- 2) Preenche o vinculo quando nao ha ambiguidade: paciente com UMA profissional e horario
--    so na coluna do paciente. Casos com varias profissionais e todos os vinculos vazios NAO
--    sao tocados: nao ha como saber quem atende qual horario (7 pacientes em 30/09/2026).
update public.paciente_terapeutas pt
set horarios_atendimento = p.horarios_atendimento
from public.pacientes p
where p.id = pt.paciente_id
  and jsonb_array_length(coalesce(pt.horarios_atendimento, '[]'::jsonb)) = 0
  and jsonb_array_length(coalesce(p.horarios_atendimento, '[]'::jsonb)) > 0
  and (select count(*) from public.paciente_terapeutas x where x.paciente_id = p.id) = 1;

-- 3) Recalculo do resumo
create or replace function public.recalcular_horarios_paciente(p_paciente uuid)
returns void
language sql
security definer
set search_path = public, pg_temp
as $$
  update public.pacientes p
  set horarios_atendimento = novo.h
  from (
    select coalesce(jsonb_agg(x.valor order by x.ord, x.hora), '[]'::jsonb) as h
    from (
      select distinct h.valor,
             array_position(array['segunda','terca','quarta','quinta','sexta','sabado'], h.valor->>'dia') as ord,
             h.valor->>'hora' as hora
      from public.paciente_terapeutas pt
      cross join lateral jsonb_array_elements(coalesce(pt.horarios_atendimento, '[]'::jsonb)) as h(valor)
      where pt.paciente_id = p_paciente
    ) x
  ) novo
  where p.id = p_paciente
    and p.horarios_atendimento is distinct from novo.h;
$$;

revoke all on function public.recalcular_horarios_paciente(uuid) from public, anon, authenticated;

create or replace function public.trg_sincronizar_horarios_paciente()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if tg_op in ('UPDATE', 'DELETE') then
    perform public.recalcular_horarios_paciente(old.paciente_id);
  end if;
  if tg_op in ('INSERT', 'UPDATE') then
    perform public.recalcular_horarios_paciente(new.paciente_id);
  end if;
  return null;
end;
$$;

revoke all on function public.trg_sincronizar_horarios_paciente() from public, anon, authenticated;

drop trigger if exists sincronizar_horarios_paciente on public.paciente_terapeutas;
create trigger sincronizar_horarios_paciente
  after insert or delete or update of horarios_atendimento, paciente_id
  on public.paciente_terapeutas
  for each row execute function public.trg_sincronizar_horarios_paciente();
