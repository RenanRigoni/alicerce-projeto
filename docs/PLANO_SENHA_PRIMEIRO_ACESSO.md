# Plano — troca de senha obrigatória no primeiro acesso

Continuação de `docs/PLANO_CORRECOES_CRITICAS.md` (fases 1 a 4 já aplicadas em produção, commit `22d17fb`).
Planejado com Opus 5 para execução por Sonnet.

## Decisão do dono do produto

A senha inicial **continua sendo `alicerce`** para todo usuário criado. O que muda: no primeiro acesso, o app **obriga** a pessoa a definir uma senha nova antes de usar qualquer tela. Quem não lembrar a senha usa o "Esqueci minha senha", que já existe.

Proposta de senha aleatória foi **recusada**. Não implementar.

## Dado que motiva o backfill

`select count(*) from auth.users where last_sign_in_at is null` → **99 de 115 usuários nunca logaram**, ou seja, 99 contas estão na senha `alicerce` hoje. Como `POST /api/auth/email-from-cpf` é público e devolve o e-mail de login a partir de qualquer CPF, cada uma dessas contas é acessível por quem tiver o CPF da pessoa.

Por isso o backfill da Fase 3 abaixo marca **todos os 115** como "senha não definida", e não só os 99. Assim qualquer conta que ainda esteja em `alicerce` — inclusive as 16 que já logaram e podem nunca ter trocado — é obrigada a definir senha no próximo acesso.

## Limite conhecido desta abordagem (registrar, não tentar resolver aqui)

A barreira é de interface. Quem souber um CPF e usar `alicerce` obtém uma sessão válida e pode ler dados direto da API REST do Supabase sem abrir nenhuma tela. Logo:

- a troca obrigatória protege a conta **depois** do primeiro uso;
- **não** protege uma conta nova na janela entre a criação pela recepção e o primeiro acesso da pessoa.

Isso é consequência de existir senha conhecida na criação e foi aceito pelo dono do produto. **Não implementar bloqueio via RLS nesta rodada** — seria mudança em todas as policies do schema.

## Regras de execução

1. Não refatorar nada fora do escopo. Arquivos e linhas estão explícitos.
2. Banco: usar **exclusivamente o MCP do Supabase** — `apply_migration` para DDL, `execute_sql` só para leitura/verificação. Nunca pedir SQL manual ao usuário.
3. Criar também o arquivo `.sql` em `supabase/migrations/` com o mesmo conteúdo aplicado. Convenção: `20260930_*` (última: `20260930_mover_backup_para_schema_privado.sql`).
4. Uma fase por vez, com a verificação da fase, antes de seguir.
5. `npx tsc --noEmit` ao final.
6. **Produção direta, sem staging.** A Fase 3 (backfill) afeta o login de 115 pessoas reais — executar por último e avisar antes.
7. Commit + push ao final (o `AGENTS.md` pede commit/push automático).

---

## Fase 1 — Coluna de controle

Migration `supabase/migrations/20260930_senha_definida_em.sql`:

```sql
-- Controla se o usuário já definiu a própria senha. NULL = ainda está com a
-- senha inicial `alicerce` e precisa trocar antes de usar o sistema.
alter table public.profiles
  add column if not exists senha_definida_em timestamptz;

comment on column public.profiles.senha_definida_em is
  'Quando o usuario definiu a propria senha. NULL = ainda na senha inicial; o app forca a troca no proximo acesso.';
```

**Não fazer backfill aqui.** O backfill é a Fase 3, depois de a tela existir — senão 115 pessoas ficam travadas sem ter para onde ir.

**Verificação.** A coluna existe e está toda nula:
```sql
select count(*) as total, count(senha_definida_em) as preenchidos from public.profiles;
```
→ `total: 115, preenchidos: 0`.

O trigger `profiles_bloquear_escalonamento` (da rodada anterior) bloqueia apenas `role`, `permissoes` e `ativo`, então esta coluna nova não é afetada por ele. Confirmar que continua sendo possível atualizar o próprio perfil.

---

## Fase 2 — Rota que estampa a coluna + tela de definição de senha

### 2.1 Rota `app/api/auth/senha-definida/route.ts` (nova)

Chamada pelo cliente depois de um `updateUser({ password })` bem-sucedido. Usa service role para gravar, e só grava no próprio usuário da sessão.

```ts
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export async function POST() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { error } = await createAdminClient()
    .from('profiles')
    .update({ senha_definida_em: new Date().toISOString() })
    .eq('id', user.id)

  if (error) {
    return NextResponse.json({ error: 'Erro ao registrar a troca de senha.' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
```

### 2.2 Tela `app/(auth)/definir-senha/page.tsx` (nova)

**Precisa ficar em `(auth)`**, fora dos grupos `(admin)`, `(terapia)` e `(portal)`, senão o próprio gate da Fase 2.3 a bloquearia em loop.

Comportamento:

- Server Component que valida a sessão. Sem sessão → `redirect('/login')`. Se `senha_definida_em` **não** for nulo → redirecionar para o dashboard do role (usar `getDashboardByRole` de `lib/auth/get-user-role.ts`), para a tela não ficar acessível depois de cumprida.
- Um client component com os campos "Nova senha" / "Confirmar nova senha". **Reaproveitar o visual e as validações de `app/(auth)/atualizar-senha/page.tsx`** (mínimo 6 caracteres, confirmação igual) para não inventar um terceiro estilo de formulário.
- Ao submeter: `supabase.auth.updateUser({ password })` → se der erro, mostrar a mensagem; se der certo, `POST /api/auth/senha-definida` → se essa também der certo, `router.replace(dashboardDoRole)`.
- **Não oferecer jeito de pular.** Sem botão "depois", sem fechar. Deve haver um link de "Sair" que chame `supabase.auth.signOut()` e vá para `/login`, para a pessoa não ficar presa sem alternativa.
- Texto: explicar que a senha inicial é provisória e precisa ser trocada antes de continuar.

**Diferença importante em relação a `atualizar-senha`:** aquela tela lida com link de recuperação (troca de `code` por sessão, erro no fragmento da URL). Esta aqui parte de uma sessão **já ativa** — não replicar a lógica de `onAuthStateChange` nem de `PASSWORD_RECOVERY`.

### 2.3 Gate nos três layouts

Em `app/(admin)/layout.tsx`, `app/(terapia)/layout.tsx` e `app/(portal)/layout.tsx`:

- adicionar `senha_definida_em` ao `select` do `profiles` (hoje: `'nome, role, ativo, permissoes, foto_url'` no admin e terapia; o portal já tem uma lista maior);
- logo após as checagens existentes de `ativo` e `role`, e **antes** de renderizar, adicionar:

```ts
  if (!profile.senha_definida_em) redirect('/definir-senha')
```

No `(portal)/layout.tsx`, colocar esse redirect **antes** do bloco de `bloquear_acesso_portal` e antes do cálculo de `precisaConsentimento`, para a pessoa não receber dois modais empilhados.

**Usar `redirect()` de página inteira, não modal.** O modal de consentimento (`ConsentimentoModal`) é contornável apagando o overlay no DevTools, porque `{children}` continua sendo renderizado — não repetir esse padrão aqui.

### 2.4 Estampar também nos outros dois caminhos de troca

Onde o usuário já consegue trocar a senha hoje, chamar a rota nova depois do sucesso, senão quem trocar por esses caminhos continua sendo cobrado no próximo acesso:

- `components/perfil/MeuPerfilForm.tsx`, função `trocarSenha` (linhas ~146-161): depois do `updateUser` sem erro e antes do `showToast('Senha alterada com sucesso!')`, adicionar `await fetch('/api/auth/senha-definida', { method: 'POST' })`.
- `app/(auth)/atualizar-senha/page.tsx`, no `handleSubmit`: depois do `updateUser` bem-sucedido, o mesmo `fetch`. Esse é o caminho do link que a recepção envia por e-mail/WhatsApp — **é o mais importante dos dois**, porque é por ele que a maioria vai definir a senha.

**Verificação da Fase 2.**

1. `npx tsc --noEmit` limpo.
2. Com um usuário de teste, marcar `senha_definida_em = null` manualmente e confirmar que ao abrir `/admin/dashboard` (ou o dashboard do role dele) cai em `/definir-senha`.
3. Definir a senha na tela e confirmar: vai para o dashboard, `senha_definida_em` preenchido no banco, e um novo acesso **não** pede de novo.
4. Confirmar que `/definir-senha` com `senha_definida_em` preenchido redireciona para o dashboard em vez de mostrar o formulário.
5. Confirmar que o link de "Sair" funciona.
6. Testar o caminho do e-mail: gerar link em `/admin/usuarios/<id>` (botão de reenviar acesso), abrir, definir senha, e confirmar que `senha_definida_em` foi preenchido — isto é, que a chamada do item 2.4 em `atualizar-senha` funcionou.

---

## Fase 3 — Backfill (executar por último, avisar antes)

Depois de a tela estar em produção e verificada. Como a coluna já nasce nula (Fase 1) e nada preenche retroativamente, **não é preciso UPDATE nenhum**: os 115 usuários já estão em estado "precisa trocar".

Só confirmar o estado e medir o impacto:

```sql
select
  count(*) as total,
  count(senha_definida_em) as ja_definiram,
  count(*) - count(senha_definida_em) as serao_obrigados
from public.profiles;
```

**O que isso provoca na prática:** no próximo acesso, todas as 115 pessoas veem a tela de definição de senha uma vez. Não há reset de senha nem invalidação de sessão — quem estiver logado continua logado, e é cobrado na próxima navegação que passe por um dos três layouts.

**Avisar o Renan antes de considerar a fase concluída**, para a recepção saber responder se alguém ligar perguntando por que apareceu uma tela nova.

### Poupar admin e recepção (DECIDIDO — executar)

O Renan decidiu não cobrar a troca de quem usa o sistema diariamente. Rodar **antes** de dar a fase por concluída:

```sql
-- Admin e recepcao usam o sistema todo dia e ja definiram a propria senha.
-- Poupa as duas contas da tela de troca obrigatoria.
update public.profiles
set senha_definida_em = now()
where role in ('admin', 'recepcao')
  and senha_definida_em is null;
```

Conferir quantas linhas foram afetadas e reportar. Esperado: **2** (1 admin e 1 recepção, conforme levantamento de 30/09/2026).

**Ressalva a repassar ao Renan.** Essa isenção parte do princípio de que essas duas contas já têm senha própria. "Já logou" não é o mesmo que "já trocou a senha": se o admin ainda estiver em `alicerce`, poupá-lo deixa justamente a conta mais privilegiada do sistema — que lê o prontuário de todos — na senha conhecida, e ela é alcançável por quem tiver o CPF dele, porque `/api/auth/email-from-cpf` é público e não filtra por role.

Resolver isso não exige código: pedir ao Renan que ele e a recepção troquem a senha em **Meu Perfil → Trocar senha**, que já funciona hoje. Se ele confirmar que ambas já têm senha própria, nada a fazer. Não bloquear a fase por causa disso — é só o aviso.

Os 8 profissionais (`role = 'terapeuta'`) e os 105 responsáveis (`role = 'pai'`) **continuam sendo cobrados**.

---

## Fase 4 — `rotar_chave_cpf`: remover — ✅ JÁ EXECUTADA, NÃO REFAZER

> **Concluída em 30/09/2026 pelo Opus, fora da execução do Sonnet.** A função foi derrubada no banco, a migration `20260930_remover_rotar_chave_cpf.sql` está no repositório e a rota `app/api/admin/rotar-chave-cpf/route.ts` foi apagada. Verificado: `rotar_chave_cpf` não existe mais em `pg_proc`, os 25 CPFs seguem decifráveis (25 de 25), `npm run build` passa e a rota não aparece mais no manifest. **Pular esta fase.** O texto abaixo fica como registro do motivo.

**Contexto.** `public.rotar_chave_cpf(text)` deveria trocar a chave de criptografia dos CPFs: descriptografar cada CPF com a chave velha, recriptografar com a nova, e só então salvar a nova. Está quebrada em três pontos, confirmados na definição em produção e originários da migration `023_cpf_fase3.sql` (linhas 23 e 51 — **não** foi a rodada anterior que causou):

1. `SET search_path = 'public'`, mas o pgcrypto está no schema `extensions` → `pgp_sym_decrypt` não resolve;
2. passa `rec.cpf_cifrado` direto para `pgp_sym_decrypt` sem `decode(..., 'base64')`, enquanto `decrypt_cpf` faz `decode` — o dado está gravado em base64;
3. grava o retorno `bytea` de `pgp_sym_encrypt` em coluna `text` sem `encode`.

As três falham dentro de `EXCEPTION WHEN OTHERS THEN RAISE WARNING`, então cada paciente vira aviso, `count_ok` fica 0, e o `UPDATE _app_config SET value = nova_chave` da última linha roda **sem condição**. A rota `/api/admin/rotar-chave-cpf` responde `{ success: true, registros_re_encriptados: 0 }` e os **25 CPFs cifrados ficam permanentemente indecifráveis**.

Não existe botão na interface — o único chamador é `app/api/admin/rotar-chave-cpf/route.ts:29`.

**O Renan escolheu a Opção A: remover a função e a rota.** Executar.

Migration `supabase/migrations/20260930_remover_rotar_chave_cpf.sql`:

```sql
-- rotar_chave_cpf estava quebrada em tres pontos (search_path sem extensions,
-- pgp_sym_decrypt sem decode de base64, pgp_sym_encrypt sem encode) e todas as
-- falhas eram engolidas por EXCEPTION WHEN OTHERS RAISE WARNING. O UPDATE final
-- da chave em _app_config rodava sem condicao, entao uma chamada trocava a chave
-- sem re-encriptar nada e tornava os 25 CPFs cifrados indecifraveis para sempre,
-- respondendo success: true.
--
-- Rotacao de chave nao e necessidade do produto hoje. Removida por decisao do
-- dono. Se um dia for preciso, reescrever com os passos simetricos e sem
-- EXCEPTION interno, para que qualquer falha aborte a transacao.

drop function if exists public.rotar_chave_cpf(text);
```

E apagar o arquivo `app/api/admin/rotar-chave-cpf/route.ts`.

**Antes de apagar**, confirmar que não sobrou nenhum chamador:

```
grep -rn "rotar-chave-cpf\|rotar_chave" app components lib
```

Devem sobrar apenas menções nos arquivos de `docs/` e nas migrations antigas (`023_cpf_fase3.sql`, `20260930_fechar_rpc_cpf_e_search_path.sql`), que são histórico e **não** devem ser editadas.

**Verificação.**

1. A função não existe mais:
   ```sql
   select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and p.proname = 'rotar_chave_cpf';
   ```
   → 0.
2. Os CPFs continuam intactos — esta é a checagem que importa:
   ```sql
   select count(*) filter (where cpf_cifrado is not null) as cifrados,
          count(*) filter (where cpf_cifrado is not null
                             and public.decrypt_cpf(cpf_cifrado) is not null) as decifraveis
   from public.pacientes;
   ```
   → `cifrados: 25, decifraveis: 25`. Se `decifraveis` vier menor que `cifrados`, **pare e avise** — algo quebrou a descriptografia.
3. `npx tsc --noEmit` limpo (a rota removida não pode deixar import órfão).
4. `/admin/pacientes/<id>` continua exibindo o CPF do paciente.

---

## Resumo

| Fase | O que faz | Depende de |
|---|---|---|
| 1 | Coluna `profiles.senha_definida_em` | — |
| 2 | Rota + tela `/definir-senha` + gate nos 3 layouts | Fase 1 |
| 3 | Conferir estado, poupar admin/recepção, avisar o impacto | Fase 2 verificada |
| 4 | `rotar_chave_cpf`: remover | ✅ já executada — pular |

Commit sugerido (fases 1 a 3):

```
feat(auth): exige definicao de senha no primeiro acesso

- coluna profiles.senha_definida_em controla quem ainda esta na senha inicial
- tela /definir-senha com gate de pagina inteira nos layouts admin, terapia e portal
- rota /api/auth/senha-definida estampa a coluna apos troca bem-sucedida
- MeuPerfilForm e atualizar-senha passam a estampar a coluna tambem
```
