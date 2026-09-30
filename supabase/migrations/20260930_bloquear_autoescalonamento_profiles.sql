-- Impede que um usuário altere o próprio role/permissoes/ativo.
-- A policy "profiles: atualização própria" é USING (id = auth.uid()) sem WITH CHECK
-- e sem restrição de coluna, e authenticated tem GRANT de UPDATE na tabela.
-- Sem este trigger, qualquer usuário logado se promove a admin.

create or replace function public.profiles_bloquear_escalonamento()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_jwt_role text;
  v_caller_role text;
begin
  -- auth.role() lê request.jwt.claim.role e, se vazio, request.jwt.claims->>'role'.
  -- Nulo = conexão direta ao banco sem JWT (manutenção/migrations); service_role =
  -- rotas que usam createAdminClient. Ambos passam sem restrição.
  -- Não usar current_user aqui: em SECURITY DEFINER ele é sempre o dono da função.
  v_jwt_role := auth.role();
  if v_jwt_role is null or v_jwt_role = 'service_role' then
    return new;
  end if;

  select role::text into v_caller_role from public.profiles where id = auth.uid();
  if v_caller_role = 'admin' then
    return new;
  end if;

  if new.role is distinct from old.role then
    raise exception 'Alteracao de perfil de acesso permitida apenas para administradores';
  end if;
  if new.permissoes is distinct from old.permissoes then
    raise exception 'Alteracao de permissoes permitida apenas para administradores';
  end if;
  if new.ativo is distinct from old.ativo then
    raise exception 'Alteracao de status de acesso permitida apenas para administradores';
  end if;

  return new;
end;
$$;

drop trigger if exists profiles_bloquear_escalonamento on public.profiles;
create trigger profiles_bloquear_escalonamento
  before update on public.profiles
  for each row execute function public.profiles_bloquear_escalonamento();
