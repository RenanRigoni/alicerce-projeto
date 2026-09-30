-- decrypt_cpf não tem checagem de autorização e estava executável por anon.
-- Só get_paciente_cpf (que valida admin/recepcao/terapeuta vinculado) deve
-- permanecer exposta ao usuário autenticado.
--
-- O Postgres concede EXECUTE a PUBLIC por padrão, então revogar só de
-- anon/authenticated não basta: é preciso revogar de PUBLIC e reafirmar o grant
-- do service_role (usado por createAdminClient nas rotas de paciente).

revoke execute on function public.decrypt_cpf(text)       from public, anon, authenticated;
revoke execute on function public.encrypt_cpf(text)       from public, anon, authenticated;
revoke execute on function public.rotar_chave_cpf(text)   from public, anon, authenticated;
revoke execute on function public.handle_new_user()       from public, anon, authenticated;
revoke execute on function public.trigger_audit_log()     from public, anon, authenticated;
revoke execute on function public.profiles_bloquear_escalonamento() from public, anon, authenticated;
revoke execute on function public.get_paciente_cpf(uuid)  from public, anon;

grant execute on function public.decrypt_cpf(text)       to service_role;
grant execute on function public.encrypt_cpf(text)       to service_role;
grant execute on function public.rotar_chave_cpf(text)   to service_role;
grant execute on function public.get_paciente_cpf(uuid)  to authenticated, service_role;

-- search_path fixo em funções SECURITY DEFINER (advisor 0011).
-- encrypt_cpf/decrypt_cpf usam pgp_sym_* do pgcrypto, instalado no schema
-- "extensions": sem ele no path, decrypt_cpf cairia no EXCEPTION e devolveria
-- NULL em silêncio (CPF sumiria da tela).
alter function public.encrypt_cpf(text)                      set search_path = public, extensions, pg_temp;
alter function public.decrypt_cpf(text)                      set search_path = public, extensions, pg_temp;

alter function public.get_my_role()                          set search_path = public, pg_temp;
alter function public.get_paciente_cpf(uuid)                 set search_path = public, pg_temp;
alter function public.paciente_esta_ativo(uuid)              set search_path = public, pg_temp;
alter function public.handle_new_user()                      set search_path = public, pg_temp;
alter function public.trigger_audit_log()                    set search_path = public, pg_temp;
alter function public.nomes_terapeutas_do_paciente(uuid)     set search_path = public, pg_temp;
alter function public.touch_push_subscription_updated_at()   set search_path = public, pg_temp;
alter function public.gerar_codigo_interno()                 set search_path = public, pg_temp;

-- rotar_chave_cpf(text) não é alterada aqui: já tem search_path = public e
-- está fora do escopo desta correção (ver observação no relatório da fase).
