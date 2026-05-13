-- Migration 034 - Evolucoes, push subscriptions e historico enriquecido.

create table if not exists public.evolucoes (
  id uuid primary key default gen_random_uuid(),
  paciente_id uuid not null references public.pacientes(id) on delete cascade,
  terapeuta_id uuid references public.profiles(id),
  identificacao text,
  obs_clinicas text,
  testes text,
  resultado_discussao text,
  conclusao text,
  status public.relatorio_status not null default 'rascunho',
  assinatura_digital text,
  assinado_em timestamptz,
  pdf_url text,
  publicado_em timestamptz,
  criado_em timestamptz not null default now(),
  hash_integridade text
);

alter table public.evolucoes enable row level security;

create policy "evolucoes: leitura pai" on public.evolucoes
  for select using (
    status = 'publicado'::public.relatorio_status
    and exists (
      select 1 from public.paciente_responsaveis
      where paciente_id = evolucoes.paciente_id
        and responsavel_id = auth.uid()
    )
  );

create policy "evolucoes: leitura terapeuta" on public.evolucoes
  for select using (
    terapeuta_id = auth.uid()
    or exists (
      select 1 from public.paciente_terapeutas
      where paciente_id = evolucoes.paciente_id
        and terapeuta_id = auth.uid()
    )
  );

create policy "evolucoes: leitura admin" on public.evolucoes
  for select using (public.get_my_role() in ('admin', 'recepcao'));

create policy "evolucoes: insercao terapeuta" on public.evolucoes
  for insert with check (
    terapeuta_id = auth.uid()
    and public.get_my_role() = 'terapeuta'
    and exists (
      select 1 from public.paciente_terapeutas
      where paciente_id = evolucoes.paciente_id
        and terapeuta_id = auth.uid()
    )
  );

create policy "evolucoes: atualizacao terapeuta" on public.evolucoes
  for update using (
    terapeuta_id = auth.uid()
    or public.get_my_role() = 'admin'
  );

create policy "evolucoes: somente_leitura_pos_alta INSERT" on public.evolucoes
  as restrictive for insert
  with check (public.paciente_esta_ativo(paciente_id));

create policy "evolucoes: somente_leitura_pos_alta UPDATE" on public.evolucoes
  as restrictive for update
  using (public.paciente_esta_ativo(paciente_id));

create policy "evolucoes: somente_leitura_pos_alta DELETE" on public.evolucoes
  as restrictive for delete
  using (public.paciente_esta_ativo(paciente_id));

create index if not exists evolucoes_paciente_status_idx on public.evolucoes(paciente_id, status, criado_em desc);
create index if not exists evolucoes_terapeuta_idx on public.evolucoes(terapeuta_id, criado_em desc);

alter table public.orientacoes
  add column if not exists hash_integridade text,
  add column if not exists assinado_em timestamptz;

alter table public.notificacoes
  add column if not exists notification_type text not null default 'individual',
  add column if not exists target_user_id uuid references public.profiles(id) on delete cascade,
  add column if not exists target_role public.user_role,
  add column if not exists related_patient_id uuid references public.pacientes(id) on delete set null,
  add column if not exists related_entity_type text,
  add column if not exists related_entity_id uuid,
  add column if not exists sent_at timestamptz,
  add column if not exists send_error text;

update public.notificacoes
set target_user_id = destinatario_id
where target_user_id is null and destinatario_id is not null;

alter table public.notificacoes
  drop constraint if exists notificacoes_notification_type_check,
  add constraint notificacoes_notification_type_check
    check (notification_type in ('individual', 'global', 'role_based'));

alter table public.notificacoes
  drop constraint if exists notificacoes_related_entity_type_check,
  add constraint notificacoes_related_entity_type_check
    check (
      related_entity_type is null
      or related_entity_type in ('relatorio', 'evolucao', 'orientacao', 'comunicado', 'feriado', 'agenda', 'alta', 'documento', 'outro')
    );

create index if not exists notificacoes_tipo_alvo_idx on public.notificacoes(notification_type, target_role, criado_em desc);
create index if not exists notificacoes_target_user_idx on public.notificacoes(target_user_id, lida, criado_em desc);
create index if not exists notificacoes_related_patient_idx on public.notificacoes(related_patient_id, criado_em desc);
create index if not exists notificacoes_related_entity_idx on public.notificacoes(related_entity_type, related_entity_id);

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  ultimo_uso_em timestamptz
);

alter table public.push_subscriptions enable row level security;

create policy "push_subscriptions: leitura propria" on public.push_subscriptions
  for select using (user_id = auth.uid());

create policy "push_subscriptions: insercao propria" on public.push_subscriptions
  for insert with check (user_id = auth.uid());

create policy "push_subscriptions: atualizacao propria" on public.push_subscriptions
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "push_subscriptions: exclusao propria" on public.push_subscriptions
  for delete using (user_id = auth.uid());

create index if not exists push_subscriptions_user_idx on public.push_subscriptions(user_id, atualizado_em desc);

create or replace function public.touch_push_subscription_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.atualizado_em := now();
  return new;
end;
$$;

drop trigger if exists touch_push_subscription_updated_at on public.push_subscriptions;
create trigger touch_push_subscription_updated_at
  before update on public.push_subscriptions
  for each row execute function public.touch_push_subscription_updated_at();

drop trigger if exists audit_evolucoes on public.evolucoes;
create trigger audit_evolucoes
  after insert or update on public.evolucoes
  for each row execute function public.trigger_audit_log();

grant usage on schema public to authenticated, anon;
grant select, insert, update, delete on public.evolucoes to authenticated;
grant select, insert, update, delete on public.push_subscriptions to authenticated;
grant select, update on public.notificacoes to authenticated;

notify pgrst, 'reload schema';
