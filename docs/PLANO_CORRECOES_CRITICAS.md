# Plano de correção — achados CRÍTICOS

Origem: auditoria de segurança de 30/09/2026. Projeto em produção com dados de paciente (PHI/LGPD).
Planejado com Opus 5 para execução por Sonnet.

## Regras de execução

1. **Não refatorar nada fora do escopo listado.** Cada fase tem arquivos e linhas explícitos.
2. **Operações de banco: usar exclusivamente o MCP do Supabase** (`apply_migration` para DDL, `execute_sql` só para leitura/verificação). Nunca pedir para o usuário rodar SQL no editor.
3. **Criar arquivo de migration no repositório** em `supabase/migrations/` com o mesmo SQL aplicado, para o histórico não divergir. Convenção atual de nome: `AAAAMMDD_descricao.sql` (a última é `20260929_agendamentos_bloquear_duplicata.sql`). Usar prefixo `20260930_`.
4. Após cada fase: rodar `npx tsc --noEmit` e executar a verificação da própria fase antes de seguir.
5. Ao terminar tudo: commit + push (o `AGENTS.md` do projeto pede commit/push automático).
6. **Não há ambiente de staging** — as mudanças valem direto em produção. Não disparar notificação de teste.

## Fora de escopo — NÃO MEXER

- **Recepção com poderes de admin.** Foi decisão explícita do dono do produto: a recepção usa a plataforma de forma completa e pode gerar link de senha de qualquer conta, inclusive do admin (`app/api/admin/reenviar-acesso/route.ts`). **Não adicionar trava nessa rota.**
- Qualquer achado classificado ALTO/MÉDIO/BAIXO na auditoria. Serão tratados depois.

---

## Fase 1 — Bloquear autoescalonamento de privilégio

**Problema.** A policy `profiles: atualização própria` é `FOR UPDATE USING (id = auth.uid())` sem `WITH CHECK` e sem restrição de coluna. O role `authenticated` tem GRANT de UPDATE em `public.profiles` e não existe nenhum trigger na tabela. Como `get_my_role()` lê `profiles.role` e é a base de quase toda policy do schema, qualquer usuário logado — inclusive os 105 responsáveis — pode rodar no console do navegador:

```js
await supabase.from('profiles').update({ role: 'admin' }).eq('id', meuId)
```

e passar a ler e escrever o prontuário de todos os pacientes. Variantes: `permissoes: {}` limpa `bloquear_acesso_portal`; `ativo: true` reativa conta desativada.

**Regra desejada** (definida pelo dono do produto): só o admin altera `role`, `permissoes` e `ativo`. O caminho legítimo continua sendo o toggle da tela de permissões, que já é admin-only em `app/api/admin/usuarios/[id]/permissoes/route.ts:26`.

**Solução.** Trigger `BEFORE UPDATE` em `public.profiles`. Trigger, e não policy, porque a policy não consegue restringir coluna e porque o trigger também cobre quem usa o service role por engano.

**Cuidado crítico:** o trigger dispara para o service role também. Estas rotas escrevem em `profiles` com `createAdminClient()` e **precisam continuar funcionando**:

- `app/api/admin/criar-usuario/route.ts:168` — update de dados do perfil recém-criado
- `app/api/usuario/[id]/route.ts:137` — edição cadastral por admin/recepção
- `app/api/usuario/[id]/ativo/route.ts:43` — muda `ativo`

E esta escreve com o client **do usuário** (o admin), então o trigger precisa liberar admin:

- `app/api/admin/usuarios/[id]/permissoes/route.ts:71` — update de `permissoes`

Migration `supabase/migrations/20260930_bloquear_autoescalonamento_profiles.sql`:

```sql
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
  -- Chamadas com service role (rotas que usam createAdminClient) e manutenção
  -- direta no banco passam sem restrição.
  v_jwt_role := coalesce(nullif(current_setting('request.jwt.claim.role', true), ''), current_user);
  if v_jwt_role in ('service_role', 'postgres', 'supabase_admin') then
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
```

**Antes de aplicar**, confirmar como o Supabase expõe o role do JWT neste projeto, porque o nome do setting varia entre versões:

```sql
select
  current_setting('request.jwt.claim.role', true) as claim_role,
  current_setting('request.jwt.claims', true)     as claims_json,
  current_user                                     as current_user;
```

Se `request.jwt.claim.role` vier nulo e o role estiver dentro de `request.jwt.claims` (JSON), trocar a linha do `v_jwt_role` por:

```sql
v_jwt_role := coalesce(
  nullif(current_setting('request.jwt.claims', true)::jsonb ->> 'role', ''),
  current_user
);
```

(embrulhar em `begin ... exception when others then v_jwt_role := current_user; end;` se o cast puder falhar).

**Verificação.**

1. Trigger existe: `select tgname from pg_trigger where tgrelid = 'public.profiles'::regclass and not tgisinternal;`
2. Service role ainda escreve — pelo app, desativar e reativar um usuário de teste em `/admin/usuarios/<id>` e confirmar que não dá erro.
3. Admin ainda altera permissões — pelo app, mexer num toggle em `/admin/usuarios/<id>` e salvar.
4. **Teste negativo (o que importa):** logar como um responsável (`pai`) no navegador e rodar no console:
   ```js
   const { error } = await window.__sbTest.from('profiles').update({ role: 'admin' }).eq('id', (await window.__sbTest.auth.getUser()).data.user.id)
   ```
   Como não há um client global exposto, o caminho prático é chamar a REST API direto com a anon key e o access token da sessão:
   ```bash
   curl -X PATCH "$SUPABASE_URL/rest/v1/profiles?id=eq.$USER_ID" \
     -H "apikey: $ANON_KEY" -H "Authorization: Bearer $ACCESS_TOKEN" \
     -H "Content-Type: application/json" -d '{"role":"admin"}'
   ```
   Deve retornar erro com a mensagem do `raise exception`. Se retornar 200, a correção falhou.
5. Confirmar que o `role` no banco não mudou.

---

## Fase 2 — Fechar o oráculo público de descriptografia de CPF

**Problema.** `public.decrypt_cpf(text)` é `SECURITY DEFINER`, **não tem nenhuma checagem de autorização** e é executável pelo role `anon` via `POST /rest/v1/rpc/decrypt_cpf`. Ela lê a chave de `_app_config` e devolve o CPF em claro. Quem obtiver um valor de `pacientes.cpf_cifrado` (24 pacientes têm) descriptografa com uma chamada não autenticada. Toda a criptografia das migrations 017/021/022/023 fica sem efeito.

**Confirmado por leitura de código:** `decrypt_cpf` **não é chamada de lugar nenhum da aplicação** — só internamente por `get_paciente_cpf`. Como `get_paciente_cpf` é `SECURITY DEFINER`, ela continua conseguindo chamar `decrypt_cpf` mesmo depois do revoke. Nada quebra.

Chamadores reais no app (todos permanecem funcionando):

| Função | Chamador | Client |
|---|---|---|
| `get_paciente_cpf` | `admin/pacientes/[id]/page.tsx:77`, `admin/pacientes/[id]/editar/page.tsx:26`, `terapia/paciente/[id]/page.tsx:111` | client do usuário → manter `authenticated` |
| `encrypt_cpf` | `api/paciente/route.ts:63`, `api/paciente/[id]/route.ts:61` | `createAdminClient` → pode revogar de anon/authenticated |
| `rotar_chave_cpf` | `api/admin/rotar-chave-cpf/route.ts:29` | `createAdminClient` → pode revogar de anon/authenticated |

`get_paciente_cpf` já tem autorização interna correta (admin, recepção ou terapeuta vinculado; devolve NULL fora disso) — **não alterar a lógica dela**.

Aproveitar a mesma migration para fixar `search_path` nas 9 funções `SECURITY DEFINER` apontadas pelo advisor do Supabase (search_path mutável em função SECURITY DEFINER é vetor de escalonamento).

Migration `supabase/migrations/20260930_fechar_rpc_cpf_e_search_path.sql`:

```sql
-- decrypt_cpf não tem checagem de autorização e estava executável por anon.
-- Só get_paciente_cpf (que valida admin/recepcao/terapeuta vinculado) deve
-- permanecer exposta ao usuário autenticado.

revoke execute on function public.decrypt_cpf(text)      from anon, authenticated;
revoke execute on function public.encrypt_cpf(text)      from anon, authenticated;
revoke execute on function public.get_paciente_cpf(uuid) from anon;
revoke execute on function public.handle_new_user()      from anon, authenticated;
revoke execute on function public.trigger_audit_log()    from anon, authenticated;

-- search_path fixo em SECURITY DEFINER (advisor 0011)
alter function public.get_my_role()                          set search_path = public, pg_temp;
alter function public.decrypt_cpf(text)                      set search_path = public, pg_temp;
alter function public.encrypt_cpf(text)                      set search_path = public, pg_temp;
alter function public.get_paciente_cpf(uuid)                 set search_path = public, pg_temp;
alter function public.paciente_esta_ativo(uuid)              set search_path = public, pg_temp;
alter function public.handle_new_user()                       set search_path = public, pg_temp;
alter function public.trigger_audit_log()                     set search_path = public, pg_temp;
alter function public.nomes_terapeutas_do_paciente(uuid)     set search_path = public, pg_temp;
alter function public.touch_push_subscription_updated_at()   set search_path = public, pg_temp;
```

**Antes de aplicar**, levantar as assinaturas exatas, porque `gerar_codigo_interno` e `rotar_chave_cpf` não foram confirmadas e um `alter function` com assinatura errada falha:

```sql
select n.nspname, p.proname, pg_get_function_identity_arguments(p.oid) as args,
       p.prosecdef as security_definer, p.proconfig
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
order by p.proname;
```

Incluir `gerar_codigo_interno` e `rotar_chave_cpf` no `alter ... set search_path` usando a assinatura real retornada. Para `rotar_chave_cpf`, revogar também de `anon, authenticated`.

**Verificação.**

1. `select has_function_privilege('anon', 'public.decrypt_cpf(text)', 'execute');` → deve ser `false`. Idem para `authenticated`.
2. `select has_function_privilege('authenticated', 'public.get_paciente_cpf(uuid)', 'execute');` → deve continuar `true`.
3. Abrir `/admin/pacientes/<id>` no app como admin e confirmar que o CPF do paciente continua aparecendo. **Se aparecer vazio, a Fase 2 quebrou algo — reverter o revoke de `get_paciente_cpf`.**
4. Cadastrar um paciente de teste com CPF em `/admin/pacientes/novo` e confirmar que salva (valida `encrypt_cpf` via service role).
5. Rodar o advisor: o lint `function_search_path_mutable` deve cair de 9 para 0 ou perto disso.

---

## Fase 3 — Remover a tabela de backup da API pública

**Problema.** `public._backup_confirmacoes_terapeuta_20260929` está com **RLS desabilitado**, `anon` tem SELECT e ela tem **82 linhas** com `paciente_id`, `terapeuta_id`, `data_hora`, `status`. Como está no schema `public`, o PostgREST a expõe: qualquer pessoa com a anon key (que está no bundle do navegador) lê tudo. É vazamento de PHI para a internet.

**Dado importante levantado na auditoria:** das 82 linhas, **0 existem só no backup** (todos os ids estão em `sessao_confirmacoes`), mas **81 têm `terapeuta_id` diferente** da tabela viva. Ou seja: é o snapshot do estado *anterior* à correção do commit `b241c02` ("avisar a profissional dona do horario, nao quem gerou o link"). **É material de rollback legítimo e recente — não apagar.**

**Solução:** mover para um schema fora da API do PostgREST. Preserva o rollback e elimina a exposição de uma vez. Mais seguro que só ligar RLS, porque não depende de policy nenhuma estar certa.

Migration `supabase/migrations/20260930_mover_backup_para_schema_privado.sql`:

```sql
-- _backup_confirmacoes_terapeuta_20260929 estava em public com RLS desligado
-- e SELECT liberado para anon: 82 linhas de PHI legíveis pela internet.
-- É o snapshot pré-correção de b241c02 (81 das 82 linhas divergem no
-- terapeuta_id da tabela viva), então tem valor de rollback e é preservado.

create schema if not exists backups;

revoke all on schema backups from anon, authenticated;
revoke all on public._backup_confirmacoes_terapeuta_20260929 from anon, authenticated;

alter table public._backup_confirmacoes_terapeuta_20260929
  set schema backups;

alter table backups._backup_confirmacoes_terapeuta_20260929
  enable row level security;

comment on table backups._backup_confirmacoes_terapeuta_20260929 is
  'Snapshot de sessao_confirmacoes.terapeuta_id anterior a b241c02 (29/09/2026). Fora de public para nao ser exposto pelo PostgREST. Pode ser removido apos validacao do fix de atribuicao de horario.';
```

**Verificação.**

1. `select count(*) from backups._backup_confirmacoes_terapeuta_20260929;` → 82 (dado preservado).
2. A tabela não pode mais aparecer no schema público:
   ```sql
   select count(*) from information_schema.tables
   where table_schema = 'public' and table_name like '_backup%';
   ```
   → 0.
3. Rodar o advisor de segurança: o lint `rls_disabled_in_public` deve sair da lista.
4. Confirmar que o `schema backups` não está exposto: no dashboard do Supabase, Settings → API → "Exposed schemas" deve listar só `public` (e `graphql_public`). Se `backups` aparecer, remover.

**Decisão pendente do Renan:** depois de confirmar que a atribuição de profissional na agenda está correta, essa tabela pode ser derrubada com `drop table backups._backup_confirmacoes_terapeuta_20260929;`. **Não executar o drop nesta rodada.**

---

## Fase 4 — Validar `sourcePath` na geração de PDF autenticado

**Problema.** Em `lib/pdf/documento-clinico-pdf.ts:134`, o `sourcePath` vem do corpo da requisição e só é conferido pela extensão (`isPdfPath`/`isImagePath`). Nada exige que o arquivo pertença ao paciente do documento. O download roda com service role no bucket `relatorios-pdf` (linhas 139-141), o conteúdo é carimbado e gravado no path do documento do chamador (linha 169), devolvido por signed URL, e a linha 179 **apaga o arquivo de origem**.

Efeito: uma terapeuta dona de qualquer relatório ou evolução (a linha 78 exige `isOwner` ou `isAdmin`, então não é qualquer usuário) chama
`POST /api/relatorio/<id-dela>/pdf` com `{"sourcePath":"<uuid-de-outro-paciente>/<id>.pdf"}` e:

- recebe o PDF clínico de um paciente sem vínculo com ela (PHI cruzada);
- **destrói** o arquivo original, deixando o `pdf_url` do outro documento apontando para um objeto inexistente.

**Solução.** Exigir que o `sourcePath` esteja dentro da pasta do próprio paciente. Todos os paths legítimos são gerados pelo servidor com esse formato:

- `app/api/upload/relatorio-pdf/route.ts:54` → `${pacienteId}/draft_${Date.now()}_${random}.${ext}`
- `lib/pdf/documento-clinico-pdf.ts:29` → `${pacienteId}/${id}.pdf`
- `lib/pdf/documento-clinico-pdf.ts:37` → `${pacienteId}/evolucoes/${id}.pdf`

Então o prefixo `${documento.paciente_id}/` cobre 100% dos casos válidos.

Editar `lib/pdf/documento-clinico-pdf.ts`, logo depois da linha 134 (`const sourcePath = ...`) e **antes** do bloco `if (sourcePath && (isPdfPath...))` da linha 138:

```ts
  // O sourcePath vem do cliente e o download roda com service role. Sem esta
  // trava, dava para ler e apagar o PDF de qualquer outro paciente.
  if (sourcePath) {
    const prefixoEsperado = `${documento.paciente_id}/`
    const pathSuspeito =
      !sourcePath.startsWith(prefixoEsperado) ||
      sourcePath.includes('..') ||
      sourcePath.startsWith('/')

    if (pathSuspeito) {
      return NextResponse.json(
        { error: 'Anexo nao pertence a este paciente.' },
        { status: 403 }
      )
    }
  }
```

**Não mexer** na guarda da linha 78 (`if (body.sourcePath && !isOwner && !isAdmin)`) — ela continua necessária e correta.

**Verificação.**

1. `npx tsc --noEmit` limpo.
2. Fluxo normal preservado: em `/terapia/paciente/<id>/novo-relatorio`, anexar um PDF e publicar. O relatório deve gerar o PDF carimbado e abrir normalmente.
3. Mesmo teste em `nova-evolucao` (usa o mesmo módulo com `storagePath` diferente, com a subpasta `evolucoes/`). **Atenção:** confirmar que o path `${pacienteId}/evolucoes/${id}.pdf` continua passando na validação — ele começa com `${pacienteId}/`, então passa; se der 403, o prefixo está sendo montado errado.
4. Teste negativo: chamar a rota com `sourcePath` de outro paciente e confirmar 403:
   ```bash
   curl -X POST "$APP_URL/api/relatorio/$MEU_RELATORIO_ID/pdf" \
     -H "Cookie: $COOKIE_DA_TERAPEUTA" -H "Content-Type: application/json" \
     -d '{"sourcePath":"00000000-0000-0000-0000-000000000000/x.pdf"}'
   ```
   Deve responder 403 "Anexo nao pertence a este paciente."

---

## Fase 5 — Senha inicial (RECOMENDADA — confirmar com o Renan antes de executar)

**Status do que foi pedido.** O Renan pediu "um botão de Alterar Senha quando ele recebe a senha". **Isso já existe e está funcionando:** `components/perfil/MeuPerfilForm.tsx:146-161` (função `trocarSenha` com `supabase.auth.updateUser({ password })`) e a seção colapsável "Trocar senha" nas linhas 485-512. O componente é usado pelas três telas de Meu Perfil: `app/(admin)/admin/meu-perfil/page.tsx:42`, `app/(terapia)/terapia/meu-perfil/page.tsx:42`, `app/(portal)/portal/meu-perfil/page.tsx:51`. O fluxo de "Recuperar Senha" também já existe (`app/(auth)/recuperar-senha/page.tsx`). **Nenhum trabalho de UI é necessário.**

**O que continua aberto.** `app/api/admin/criar-usuario/route.ts:8` define `const SENHA_PADRAO = 'alicerce'` e a linha 146 usa esse valor para todo usuário criado, com `email_confirm: true`. Não existe nada que force a troca (busca por `must_change`, `primeiro_acesso`, `senha_provisoria` retorna zero). Combinado com `POST /api/auth/email-from-cpf` — que é sem autenticação, sem filtro de role, e devolve o e-mail de login de qualquer CPF ou CNPJ — quem souber um CPF entra na conta de quem ainda não trocou a senha. `profiles.cpf_cnpj` está em texto puro (31 de 115 perfis). A proteção contra senha vazada do Supabase Auth está desligada.

**Correção proposta (mínima, sem mudar o fluxo de trabalho da recepção).** Trocar a senha fixa por uma aleatória por usuário. A recepção **não precisa** conhecer a senha inicial: `enviarConviteAcesso` (`lib/auth/convite.ts`) já devolve `link_recuperacao` para repasse por WhatsApp, e a rota já retorna esse link no JSON. Com senha aleatória, saber o e-mail deixa de dar acesso.

Em `app/api/admin/criar-usuario/route.ts`, substituir a linha 8:

```ts
// Senha inicial descartável: o acesso é feito pelo link de definição de senha
// devolvido em `link_recuperacao`. Ninguém precisa conhecer este valor.
function gerarSenhaInicial(): string {
  return `${crypto.randomUUID()}${crypto.randomUUID()}`.replace(/-/g, '')
}
```

e na linha 146 usar `password: gerarSenhaInicial(),`.

Remover também a exibição da senha padrão na tela de novo usuário: `app/(admin)/admin/usuarios/novo/page.tsx` linhas 252, 598 e 599 (ler o contexto antes de editar — trocar o texto da senha por uma instrução para usar o link de acesso, sem remover a exibição do `link_recuperacao`).

**Impacto operacional a confirmar com o Renan:** usuários **já existentes** que nunca trocaram a senha continuam com `alicerce`. Fechar isso de verdade exige disparar reset para essa base. Levantamento sugerido antes de decidir:

```sql
select count(*) from auth.users where last_sign_in_at is null;
```

**Se o Renan não aprovar a Fase 5, não executar nada dela** e registrar que o crítico 3 permanece aberto por decisão de produto.

---

## Resumo

| Fase | Achado | Tipo | Bloqueia? |
|---|---|---|---|
| 1 | Autoescalonamento via `profiles` | Migration (trigger) | Sim |
| 2 | `decrypt_cpf` executável por `anon` | Migration (grants) | Sim |
| 3 | Tabela de backup com PHI pública | Migration (schema) | Sim |
| 4 | `sourcePath` sem validação de dono | TypeScript | Sim |
| 5 | Senha inicial fixa `alicerce` | TypeScript | Aguarda decisão |
| — | Recepção com poder de admin | — | Não corrigir (decisão do dono) |

Ordem sugerida: 1 → 2 → 3 → 4 → 5. As fases 1 a 3 são independentes entre si; a 4 é isolada no TypeScript.

Commit sugerido ao final:

```
fix(seguranca): fecha escalonamento de privilegio, oraculo de CPF e vazamento de backup

- trigger em profiles impede usuario alterar proprio role/permissoes/ativo
- revoga execute de decrypt_cpf/encrypt_cpf de anon e authenticated
- fixa search_path nas funcoes SECURITY DEFINER
- move tabela de backup de PHI para schema fora do PostgREST
- valida que sourcePath do PDF pertence ao paciente do documento
```
