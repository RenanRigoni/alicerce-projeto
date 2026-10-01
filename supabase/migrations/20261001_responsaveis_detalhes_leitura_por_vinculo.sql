-- responsaveis_detalhes: terapeuta passa a ler só as famílias das pacientes dela.
--
-- A policy antiga de SELECT era:
--   (id = auth.uid() OR get_my_role() = ANY (ARRAY['admin','recepcao','terapeuta']))
-- ou seja, qualquer terapeuta lia telefone, endereço, CEP e contato de emergência das 101
-- famílias, inclusive de pacientes que não são dela. `profiles` de role='pai' já restringia
-- às famílias vinculadas (policy "profiles: terapeuta lê responsáveis dos seus pacientes"),
-- então as duas tabelas discordavam sobre a mesma pessoa. Minimização, LGPD art. 6º III.
--
-- Pela tela a diferença não aparecia: todas as leituras chegam em responsaveis_detalhes
-- aninhadas em profiles (`profiles(..., responsaveis_detalhes(...))`), e a RLS de profiles já
-- cortava a família não vinculada junto com o ramo inteiro. O que a policy larga permitia era
-- a consulta DIRETA à tabela com o token da terapeuta.
--
-- Medido antes de aplicar, em transação desfeita, com auth.uid() de cada uma das 8 terapeutas:
-- a contagem de responsaveis_detalhes visíveis passa de 101 para exatamente a mesma contagem
-- de profiles de role='pai' que ela já via — 18/18, 0/0, 17/17, 21/21, 29/29, 0/0, 28/28,
-- 38/38. Nenhuma tela perde dado porque nenhuma tela chega aqui por fora do perfil.
--
-- A escrita NÃO muda: continua só o próprio dono ou admin/recepção. A rota da terapeuta
-- (app/api/terapeuta/responsavel/[id]/route.ts) grava com o cliente de serviço depois de
-- conferir profissional + gerenciar_responsaveis + vínculo com uma paciente dela.
--
-- Duas policies PERMISSIVE separadas, OR'das pelo Postgres, no mesmo formato que `profiles`
-- já usa: a primeira para o dono e para admin/recepção, a segunda para a terapeuta com
-- vínculo. Numa tabela com RLS, sem nenhuma PERMISSIVE que case, não há permissão.

drop policy if exists "responsaveis_detalhes: leitura admin e próprio" on public.responsaveis_detalhes;

create policy "responsaveis_detalhes: leitura própria e admin"
  on public.responsaveis_detalhes
  for select
  using (
    id = auth.uid()
    or get_my_role() = any (array['admin'::user_role, 'recepcao'::user_role])
  );

create policy "responsaveis_detalhes: terapeuta lê dos seus pacientes"
  on public.responsaveis_detalhes
  for select
  using (
    exists (
      select 1
        from public.paciente_responsaveis pr
        join public.paciente_terapeutas pt on pt.paciente_id = pr.paciente_id
       where pr.responsavel_id = responsaveis_detalhes.id
         and pt.terapeuta_id = auth.uid()
    )
  );
