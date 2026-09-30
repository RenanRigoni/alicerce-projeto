-- Encaminhamentos (médico e CRM)
-- Tabela própria, fora de pacientes_dados_clinicos: lá só a terapeuta vinculada escreve,
-- e o papel do encaminhamento chega na recepção. Vários por paciente (histórico).
-- Forma das políticas e da auditoria espelha 016_prontuario_somente_leitura.sql e
-- 020_audit_triggers.sql.

create table if not exists public.encaminhamentos (
  id                  uuid primary key default gen_random_uuid(),
  paciente_id         uuid not null references public.pacientes(id) on delete cascade,
  medico_nome         text not null check (length(btrim(medico_nome)) > 0),
  medico_crm          text,
  medico_crm_uf       char(2) check (medico_crm_uf is null or medico_crm_uf ~ '^[A-Z]{2}$'),
  especialidade       text,
  data_encaminhamento date,
  motivo              text,
  observacoes         text,
  registrado_por      uuid references public.profiles(id) on delete set null,
  criado_em           timestamptz not null default now(),
  atualizado_em       timestamptz,
  atualizado_por      uuid references public.profiles(id) on delete set null
);

create index if not exists encaminhamentos_paciente_idx
  on public.encaminhamentos (paciente_id, data_encaminhamento desc nulls last);

-- Sugestão de médicos já digitados, sem precisar de tabela de médicos
create index if not exists encaminhamentos_medico_idx
  on public.encaminhamentos (lower(medico_nome));

alter table public.encaminhamentos enable row level security;
revoke all on public.encaminhamentos from anon;

-- ── Leitura: admin, recepção e a terapeuta vinculada ao paciente. Nunca `pai`. ──
create policy "encaminhamentos: leitura equipe"
  on public.encaminhamentos for select
  using (
    public.get_my_role() in ('admin', 'recepcao')
    or (
      public.get_my_role() = 'terapeuta'
      and exists (
        select 1 from public.paciente_terapeutas pt
        where pt.paciente_id = encaminhamentos.paciente_id
          and pt.terapeuta_id = auth.uid()
      )
    )
  );

-- ── Escrita: só admin e recepção. registrado_por não pode ser forjado. ─────────
create policy "encaminhamentos: insere admin recepcao"
  on public.encaminhamentos for insert
  with check (
    public.get_my_role() in ('admin', 'recepcao')
    and registrado_por = auth.uid()
  );

create policy "encaminhamentos: atualiza admin recepcao"
  on public.encaminhamentos for update
  using (public.get_my_role() in ('admin', 'recepcao'));

create policy "encaminhamentos: apaga admin recepcao"
  on public.encaminhamentos for delete
  using (public.get_my_role() in ('admin', 'recepcao'));

-- ── Prontuário encerrado é de guarda (COFFITO 424/2013): mesma trava da 016 ────
create policy "encaminhamentos: somente_leitura_pos_alta INSERT" on public.encaminhamentos
  as restrictive for insert
  with check (paciente_esta_ativo(paciente_id));

create policy "encaminhamentos: somente_leitura_pos_alta UPDATE" on public.encaminhamentos
  as restrictive for update
  using (paciente_esta_ativo(paciente_id));

create policy "encaminhamentos: somente_leitura_pos_alta DELETE" on public.encaminhamentos
  as restrictive for delete
  using (paciente_esta_ativo(paciente_id));

-- ── Carimbo de atualização no banco: o cliente não escolhe quem nem quando, e ──
-- ── o registro não muda de paciente nem de autor. ─────────────────────────────
create or replace function public.encaminhamentos_carimbar_atualizacao()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.paciente_id     := old.paciente_id;
  new.registrado_por  := old.registrado_por;
  new.criado_em       := old.criado_em;
  new.atualizado_em   := now();
  new.atualizado_por  := auth.uid();
  return new;
end;
$$;

drop trigger if exists encaminhamentos_carimbar on public.encaminhamentos;
create trigger encaminhamentos_carimbar
  before update on public.encaminhamentos
  for each row execute function public.encaminhamentos_carimbar_atualizacao();

-- ── Auditoria (LGPD Art. 37): mesma função genérica da 020 ─────────────────────
drop trigger if exists audit_encaminhamentos on public.encaminhamentos;
create trigger audit_encaminhamentos
  after insert or update on public.encaminhamentos
  for each row execute function trigger_audit_log();
