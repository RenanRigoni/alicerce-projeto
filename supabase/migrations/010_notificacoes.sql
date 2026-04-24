-- Tabela de notificações do sistema
create table if not exists notificacoes (
  id uuid primary key default gen_random_uuid(),
  destinatario_id uuid not null references profiles(id) on delete cascade,
  tipo text not null,
  titulo text not null,
  mensagem text,
  lida boolean not null default false,
  link text,
  criado_em timestamptz not null default now()
);

create index if not exists notificacoes_destinatario_idx on notificacoes(destinatario_id, lida, criado_em desc);

alter table notificacoes enable row level security;

create policy "usuarios veem proprias notificacoes"
  on notificacoes for select
  using (destinatario_id = auth.uid());

create policy "usuarios marcam proprias notificacoes como lidas"
  on notificacoes for update
  using (destinatario_id = auth.uid())
  with check (destinatario_id = auth.uid());
