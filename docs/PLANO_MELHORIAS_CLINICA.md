# Plano — Melhorias pedidas pela equipe da clínica

Origem: documento "Sugestões de Melhorias no sistema da Alicerce" enviado pela equipe,
com um print da aba **Responsáveis** do paciente #155 mostrando o modal "Adicionar
responsável" com o campo **Selecione...** vazio.

Este plano cobre os 6 pedidos do documento mais o ajuste que o Renan acrescentou
(buscar responsável já existente em vez de cadastrar de novo).

> **Contexto de execução.** O sistema está em produção, com dados reais de pacientes
> (PHI/LGPD), e **não existe ambiente de staging** — tudo que for aplicado vale
> imediatamente para a clínica inteira. Operações de banco vão pelo **MCP do Supabase**
> (`apply_migration` para DDL, `execute_sql` só para leitura), nunca por SQL manual.
> Todo arquivo `.sql` aplicado também é gravado em `supabase/migrations/` para o
> histórico do repositório não divergir do banco.

---

## O que os números de produção dizem

Levantado antes de planejar, direto no banco:

| Medida | Valor | Por que importa |
|---|---|---|
| Pacientes ativos | 116 | — |
| **Pacientes ativos sem nenhum responsável vinculado** | **14 (12%)** | Prova que o fluxo de 2 etapas perde gente no meio |
| Pacientes ativos sem profissional vinculado | 2 | — |
| Perfis `pai` sem nenhum paciente | 4 | Contas órfãs: criou o usuário e não vinculou |
| Responsáveis com 2 filhos em acompanhamento | 3 | O caso que o Renan levantou já existe |
| Responsáveis com endereço preenchido | 64 de 101 | O endereço **já existe** no banco |
| Responsáveis com CEP preenchido | 11 de 101 | A busca por CEP existe mas quase não é usada |
| Terapeutas com `ver_todos_pacientes` ligado | **5 de 8** | Explica a lista poluída de que reclamaram |
| Nomes ou telefones duplicados entre responsáveis | 0 | Ainda não há duplicata — a busca evita criar a primeira |

Os 14 pacientes sem responsável e as 4 contas órfãs são o mesmo problema visto dos dois
lados: hoje, cadastrar responsável e vincular ao paciente são duas viagens diferentes, e
a segunda às vezes não acontece.

---

## Resumo das fases

| Fase | Pedido atendido | Tamanho | Risco |
|---|---|---|---|
| 1 | Responsável no cadastro do paciente: buscar existente ou cadastrar na hora | Grande | Médio |
| 2 | Lista abre nos pacientes do profissional + busca por nome | Pequeno | Baixo |
| 3 | Endereço do paciente aproveitado do responsável | Pequeno | Baixo |
| 4 | Médico do encaminhamento e CRM (tabela própria, com histórico) | Médio | Baixo |
| 5 | ~~Modelo de avaliação próprio da profissional~~ **CANCELADA** (ver a Fase 5) | — | — |
| 6 | Correções adjacentes encontradas no caminho | Pequeno | Baixo |

**Ordem recomendada: 1 → 6 → 2 → 3 → 4 → 5.** A Fase 6 sobe para logo depois da 1
porque conserta falhas silenciosas exatamente no código que a Fase 1 passa a usar muito
mais.

Cada fase é independente: dá para parar depois de qualquer uma e o sistema continua
coerente.

---

## Decisões já tomadas pelo Renan (não reabrir)

1. **Encaminhamento vai em tabela própria `encaminhamentos`**, relacionada a pacientes e
   profissionais, fora de `pacientes_dados_clinicos`. Recepção e admin criam e editam;
   terapeuta consulta os dos seus pacientes. O histórico permite **vários
   encaminhamentos por paciente**.
2. **Modelo de avaliação é visível só para quem criou e para quem ela compartilhar.** O
   admin enxerga o inventário (nome, dona, data) para governança, mas **não baixa o
   arquivo**. *(Sem efeito: a Fase 5 foi cancelada. Mantida aqui só como registro.)*
3. **Endereço do paciente é herdado do responsável**, exibido na aba Dados Gerais com
   botão de copiar. Não se cria campo de endereço em `pacientes`.

---

# Fase 1 — Responsável junto com o cadastro do paciente

**Pedido:** *"ao efetuar o cadastro do paciente é importante já cadastrar o responsável
legal por aquele paciente na mesma página"* + *"não consegui fazer o cadastro do
responsável"* + (Renan) *"caso um responsável tenha mais do que 2 filhos que faz
acompanhamento, é bom ter um campo para pesquisar o responsável ao invés de
cadastrá-lo"*.

## O que existe hoje

O backend **já suporta** quase tudo. O problema é de tela.

- `app/api/paciente/route.ts:27` já aceita `responsavel_id` no corpo e vincula em
  `paciente_responsaveis` (linhas 85-92).
- ~~`app/api/admin/criar-usuario/route.ts:82` já permite que terapeuta com
  `gerenciar_responsaveis` crie um usuário `pai`.~~ **ERRADO — corrigido na execução.**
  A linha 54 barrava tudo que não fosse `admin` ou `recepcao`, antes de chegar na
  checagem de `gerenciar_responsaveis` da linha 82, que era código morto para terapeuta.
  A rota precisou ser aberta para `role: 'pai'` com a permissão, junto com a checagem de
  vínculo do item 6.2 — sem ela, abrir a porta viraria escalonamento.
- A mesma rota já aceita `paciente_id` (linha 210) e faz o vínculo na hora.
- A rota já grava endereço completo em `responsaveis_detalhes` (linhas 194-209) e já
  devolve `link_recuperacao` para repassar por WhatsApp.

O que falha é a interface:

| Onde | Problema |
|---|---|
| `app/(admin)/admin/pacientes/novo/page.tsx:274-284` | O responsável é um `<select>` simples com **os 105 perfis `pai`** carregados de uma vez. Sem busca. |
| `app/(admin)/admin/pacientes/novo/page.tsx:266-272` | O link "+ Cadastrar responsável" leva para `/admin/usuarios/novo` e **abandona tudo que já foi digitado** no formulário do paciente. |
| `app/(terapia)/terapia/pacientes/novo/NovoPacienteTerapeutaForm.tsx` | **Não tem campo nenhum de responsável.** Paciente cadastrado por terapeuta nasce sem responsável. |
| `components/paciente/PerfilPacienteTabs.tsx:648` | O botão "Cadastrar novo" está atrás de `isAdminOuRecepcao`. A terapeuta que abriu o print **tem** `gerenciar_responsaveis`, o backend deixaria ela criar, mas a tela esconde o botão. **Esta é a causa literal do "não consegui fazer o cadastro do responsável".** |
| `components/paciente/PerfilPacienteTabs.tsx:1649-1660` | Quando não há responsável disponível, a mensagem "Cadastrar novo →" também só aparece para admin/recepção. |

## O que fazer

### 1.1 Componente de busca de responsável (novo)

Criar `components/responsavel/BuscaResponsavel.tsx` — um combobox reutilizável.

- Campo de texto que filtra por **nome, CPF e telefone**. Só nome não basta: é
  exatamente por telefone/CPF que se reconhece a mãe que já está cadastrada com outro
  filho.
- **Busca no servidor, não no cliente.** A RLS de `profiles` (política *"profiles:
  terapeuta lê responsáveis dos seus pacientes"*) só deixa a terapeuta ler os `pai`
  ligados a pacientes dela — Santa vê 38, Alexandra 18, Aline 0. Justamente o caso que
  importa, a mãe cadastrada por causa de um filho de **outra** profissional, fica
  invisível. Uma busca client-side não resolveria.
- Ao lado de cada resultado, mostrar **quantos pacientes aquele responsável já tem**
  (`paciente_responsaveis`), para a recepção confirmar que é a pessoa certa antes de
  vincular.
- Props: `valor`, `onSelecionar(id)`, `excluirIds` (para não oferecer quem já está
  vinculado), `onPedirCadastro()`.

Os dados vêm de uma consulta única:

```ts
supabase
  .from('profiles')
  .select('id, nome, cpf_cnpj, responsaveis_detalhes(telefone_principal), paciente_responsaveis(paciente_id)')
  .eq('role', 'pai')
  .order('nome')
```

> Confira o retorno do embed antes de confiar: `responsaveis_detalhes` é 1-para-1 com
> `profiles` e o PostgREST pode devolver objeto ou array conforme enxerga a FK. Ajuste o
> tipo ao que vier de verdade, não ao que parece.

### 1.2 Painel de cadastro inline (novo)

Criar `components/responsavel/FormResponsavelInline.tsx`.

- Campos: nome, CPF, telefone, e-mail (opcional), CEP, endereço, número, complemento,
  bairro, cidade, UF.
- **Reaproveitar a busca de CEP** que já existe em
  `app/(admin)/admin/usuarios/novo/page.tsx:40-52` (`buscarCep`, ViaCEP). Extrair para
  `lib/endereco/via-cep.ts` e passar as duas telas a importar de lá, em vez de duplicar.
- Envia para `POST /api/admin/criar-usuario` com `role: 'pai'` e, quando o paciente já
  existir, `paciente_id`. **Não reimplementar a criação de usuário** — essa rota cria a
  conta no Auth, preenche `profiles` e `responsaveis_detalhes`, gera o e-mail interno
  quando não há e-mail real e dispara o convite. Duplicar isso ia divergir na primeira
  manutenção.
- Mostrar o `link_recuperacao` devolvido pela rota, com botão de copiar — é assim que a
  recepção passa o acesso por WhatsApp, e **98 dos 105 responsáveis não têm e-mail
  real**, então esse link é o caminho normal, não a exceção.
- Se for modal, **usar `ModalPortal`** (`components/ui/ModalPortal.tsx`). O wrapper
  `animate-fade-up` dos layouts cria contexto de empilhamento e quebra `position: fixed`
  — é uma regra já estabelecida neste projeto.

### 1.3 Ligar nos três lugares

**a) `app/(admin)/admin/pacientes/novo/page.tsx`**
Trocar o `<select>` (linhas 274-284) por `BuscaResponsavel`. O link que saía da página
(linhas 266-272) vira um botão que abre o `FormResponsavelInline` **sem sair do
formulário**. Ao criar, o responsável já vem selecionado. O `responsavel_id` continua
seguindo no mesmo POST que hoje (linha 137) — o backend não muda.

**b) `app/(terapia)/terapia/pacientes/novo/NovoPacienteTerapeutaForm.tsx`**
Acrescentar o mesmo bloco, condicionado a `gerenciar_responsaveis`. Hoje não existe
nada aqui, e é um dos motivos dos 14 pacientes sem responsável.

**c) `components/paciente/PerfilPacienteTabs.tsx`**
- Linha 648: trocar a condição `isAdminOuRecepcao` por `podeGerenciarResponsaveis`
  (já calculada na linha 354). É o conserto direto do print.
- Linhas 1649-1660: mesma troca na mensagem de lista vazia.
- Dentro do modal, trocar o `<select>` (linhas 1650-1660) por `BuscaResponsavel` e
  permitir cadastrar na hora, passando `paciente_id`.
- O destino do "Cadastrar novo" precisa deixar de ser `/admin/usuarios/novo`: terapeuta
  não tem acesso à área `/admin` e cairia num 404 ou num `notFound()`.

## Verificação

1. Como **admin**: cadastrar paciente, buscar responsável existente por telefone,
   confirmar que o contador de filhos aparece, salvar, e conferir a linha em
   `paciente_responsaveis`.
2. Como **admin**: cadastrar paciente e criar o responsável na mesma página. Conferir
   que nada digitado do paciente se perde e que o link de acesso aparece para copiar.
3. Como **terapeuta com `gerenciar_responsaveis`** (ex.: Alexandra ou Aline, que têm a
   permissão mas não têm `ver_todos_pacientes`): abrir um paciente seu, aba
   Responsáveis, e cadastrar um responsável do zero. Este é o cenário exato do print.
4. Como **terapeuta sem a permissão** (ex.: Maria Vitória): confirmar que os botões não
   aparecem e que um POST direto na rota devolve 403.
5. `npx tsc --noEmit` limpo.

---

# Fase 6 — Correções adjacentes (executar logo depois da Fase 1)

Três defeitos encontrados durante a pesquisa, no mesmo código que a Fase 1 passa a usar
muito mais. Não estavam no pedido da clínica, mas explicam parte dos números.

### 6.1 `app/api/paciente/route.ts:85-103` — vínculos falham em silêncio

```ts
if (responsavel_id) {
  await adminClient.from('paciente_responsaveis').insert({ ... })   // erro ignorado
}
if (terapeutasParaVincular.length > 0) {
  await adminClient.from('paciente_terapeutas').insert(...)         // erro ignorado
}
return NextResponse.json({ success: true, paciente_id: pacienteId })
```

Nenhum dos dois `insert` tem o erro verificado. Se qualquer um falhar, o paciente é
criado, os vínculos não, e a tela diz que deu tudo certo. **É a explicação mais provável
para os 14 pacientes ativos sem responsável.**

Corrigir: capturar `error` dos dois, e devolver 500 com mensagem específica dizendo que
o paciente foi criado mas o vínculo não — para quem está na recepção saber que precisa
vincular à mão, em vez de descobrir meses depois.

### 6.2 `app/api/admin/criar-usuario/route.ts:210-222` — falta checar vínculo do paciente

A rota aceita `paciente_id` e vincula sem verificar se quem chamou pode mexer naquele
paciente. Uma terapeuta com `gerenciar_responsaveis` pode passar o id de **qualquer**
paciente da clínica e criar um vínculo.

A rota irmã já faz essa checagem certo — copiar de
`app/api/vincular/paciente-responsavel/route.ts:27-38`:

```ts
if (profile.role === 'terapeuta' && !temPermissao(profile.role, permissoes, 'ver_todos_pacientes')) {
  // exige linha em paciente_terapeutas para (paciente_id, user.id)
}
```

Isso fica mais importante depois da Fase 1, porque é a Fase 1 que passa a mandar
`paciente_id` nessa rota o tempo todo.

### 6.3 `app/api/admin/criar-usuario/route.ts:194-209` — `responsaveis_detalhes` sem checagem

O `upsert` do endereço também não verifica erro. O usuário é criado, o endereço não, e a
tela informa sucesso. Mesmo tratamento do 6.1.

## Verificação

- Forçar o erro do 6.1 mandando um `responsavel_id` inexistente: a rota deve responder
  erro, não `success`.
- Como terapeuta sem `ver_todos_pacientes`, chamar `criar-usuario` com `paciente_id` de
  paciente alheio: deve devolver 403.
- Rodar a query dos 14 pacientes sem responsável depois e confirmar que o número não
  cresce.

---

# Fase 2 — Lista de pacientes: abrir nos meus e permitir busca

**Pedidos:** *"Cadastrar a profissional ou vincular, de forma que no início só aparece os
pacientes vinculados ao profissional que está acessando"* e *"Ter como fazer busca na
página do paciente"*.

## O que existe hoje

`app/(terapia)/terapia/pacientes/page.tsx:26-41` **já filtra** por vínculo — só que
apenas para quem **não** tem `ver_todos_pacientes`. E **5 das 8 terapeutas têm essa
permissão ligada** (Brenda, Isabella, Letícia, Rute, Santa). Para elas a lista abre com
os 116 pacientes da clínica.

E `app/(terapia)/terapia/pacientes/PacientesListaTerapeuta.tsx` **não tem campo de
busca** — só os chips de status (linhas 55-69). A lista do admin
(`app/(admin)/admin/pacientes/PacientesLista.tsx:58-63`) tem busca; a da terapia não.

## O que fazer

**Não mexer nas permissões.** Tirar `ver_todos_pacientes` de quem já tem quebraria o
acesso de quem realmente precisa (supervisão, cobertura de férias). A correção é de
comportamento padrão da tela:

1. Em `page.tsx`, quando houver `ver_todos_pacientes`, buscar **os dois conjuntos**:
   os vinculados e todos. Passar ambos para o componente.
2. Em `PacientesListaTerapeuta.tsx`, acrescentar um alternador
   **"Meus pacientes" | "Todos"**, com **"Meus pacientes" como padrão**. Quem não tem a
   permissão não vê o alternador — nada muda para essas pessoas.
3. Acrescentar o campo de busca, no mesmo formato da lista do admin (`PacientesLista.tsx:58-63`),
   filtrando por nome **e** por `codigo_interno` — a equipe usa o "#155" do print para se
   referir ao paciente.
4. Guardar a escolha do alternador em `sessionStorage`, para não irritar quem
   alterna toda hora. Envolver em `try/catch`: acesso a storage pode lançar.

> **Sobre "busca na página do paciente":** a frase é ambígua. A leitura desta fase é
> "busca na lista de pacientes", que é uma lacuna comprovada. A outra leitura possível é
> busca **dentro** do prontuário de um paciente (achar uma evolução ou relatório por
> texto). Essa segunda ficou **fora do escopo** — vale confirmar com a equipe qual delas
> pediram antes de investir. O filtro de evoluções existente
> (`components/evolucao/filtro-evolucoes.tsx`) filtra por profissional e tipo, não por
> texto livre.

## Verificação

- Entrar como Brenda (tem `ver_todos_pacientes`): a lista abre em "Meus pacientes";
  alternar para "Todos" mostra os 116.
- Entrar como Maria Vitória (não tem): nenhum alternador aparece, lista só com os dela.
- Buscar por "#155" e pelo nome: os dois acham.

---

# Fase 3 — Endereço do paciente aproveitado do responsável

**Pedido:** *"Cadastrar endereço do paciente ou ter como comunicar o endereço do paciente
e do responsável para ganhar tempo no preenchimento"*.

**Decisão do Renan: herdar, não duplicar.**

## O que existe hoje

`responsaveis_detalhes` já tem endereço completo: `endereco`, `numero`, `complemento`,
`bairro`, `cidade`, `estado`, `cep`. 64 dos 101 registros preenchidos.

`components/paciente/PerfilPacienteTabs.tsx:33-40` já traz `endereco`, `cidade`, `cep` e
`telefone_principal` de cada responsável para dentro da tela, e a aba Responsáveis já
mostra (linhas 690-708) — mas em pedaços, e só naquela aba.

O que falta é aparecer **onde se precisa**: na aba Dados Gerais, junto do resto.

## O que fazer

1. Ampliar a interface `Responsavel` (linhas 33-40) para trazer também `numero`,
   `complemento`, `bairro` e `estado`. Ajustar o `select` das páginas que montam esse
   objeto — `app/(admin)/admin/pacientes/[id]/page.tsx` e
   `app/(terapia)/terapia/paciente/[id]/page.tsx`.
2. Na aba **Dados Gerais**, acrescentar um bloco "Endereço (do responsável principal)"
   com o endereço formatado em uma linha e um **botão de copiar**
   (`navigator.clipboard.writeText`), com retorno visual de "Copiado".
3. Se houver mais de um responsável, usar o de tipo `principal`. Se nenhum for
   principal, usar o primeiro e rotular com o nome de quem é.
4. Se o responsável não tiver endereço, mostrar um aviso discreto com link para
   completar o cadastro dele — é o empurrão que resolve os 37 registros vazios.
5. Montar o endereço formatado em um helper compartilhado, ex.
   `lib/endereco/formatar.ts`, para a aba Responsáveis e a Dados Gerais não divergirem.

## Verificação

- Paciente com responsável e endereço completo: o bloco aparece e o botão copia o texto
  inteiro.
- Paciente sem responsável (existem 14): a tela não quebra, mostra o estado vazio.
- Responsável sem endereço: mostra o aviso, não um bloco em branco.

---

# Fase 4 — Encaminhamentos (médico e CRM)

**Pedido:** *"Campo para preencher o médico responsável pelo encaminhamento e campo do
CRM; (pode ser com preenchimento opcional se a ficha for travada para salvar)"*.

**Decisão do Renan:** tabela própria `encaminhamentos`, fora de
`pacientes_dados_clinicos`; recepção e admin criam e editam, terapeuta consulta os dos
seus pacientes; histórico com vários encaminhamentos por paciente.

## Por que tabela própria (registrado para quem for manter isso depois)

`pacientes_dados_clinicos` tem RLS que só deixa a **terapeuta vinculada** escrever —
admin e recepção são leitura (confirmado em `pg_policy`: *"dados_clinicos: inserção
terapeuta"*, *"dados_clinicos: atualização terapeuta"*). O papel do encaminhamento chega
na recepção. Guardar ali significaria que quem recebe o papel não pode registrá-lo. A
tabela separada resolve isso e ainda permite histórico, que uma coluna não permitiria.

## 4.1 Migration

Nome sugerido: `20260930_encaminhamentos.sql`.

```sql
create table if not exists public.encaminhamentos (
  id                  uuid primary key default gen_random_uuid(),
  paciente_id         uuid not null references public.pacientes(id) on delete cascade,
  medico_nome         text not null,
  medico_crm          text,
  medico_crm_uf       char(2),
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

-- Permite sugerir médicos já digitados antes, sem precisar de tabela de médicos
create index if not exists encaminhamentos_medico_idx
  on public.encaminhamentos (lower(medico_nome));

alter table public.encaminhamentos enable row level security;
revoke all on public.encaminhamentos from anon;

-- Leitura: admin, recepção, e a terapeuta vinculada ao paciente
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

-- Escrita: só admin e recepção
create policy "encaminhamentos: insere admin recepcao"
  on public.encaminhamentos for insert
  with check (public.get_my_role() in ('admin', 'recepcao'));

create policy "encaminhamentos: atualiza admin recepcao"
  on public.encaminhamentos for update
  using (public.get_my_role() in ('admin', 'recepcao'));

create policy "encaminhamentos: apaga admin recepcao"
  on public.encaminhamentos for delete
  using (public.get_my_role() in ('admin', 'recepcao'));
```

Dois pontos de atenção na migration:

- **Não incluir `pai` em lugar nenhum.** O encaminhamento não vai para o portal da
  família nesta fase.
- Seguir o padrão de prontuário travado após alta que as outras tabelas clínicas usam
  (`supabase/migrations/016_prontuario_somente_leitura.sql`): políticas **RESTRICTIVE**
  de INSERT/UPDATE/DELETE com `paciente_esta_ativo(paciente_id)`. Ler a 016 e espelhar a
  forma exata antes de escrever.
- Acrescentar o trigger de auditoria no mesmo padrão de
  `supabase/migrations/020_audit_triggers.sql` (`trigger_audit_log`). Ler a 020 primeiro
  e confirmar que a função é genérica o bastante para a tabela nova.

## 4.2 Tela

- Novo bloco na aba **Dados Clínicos** do paciente, acima dos campos atuais, ou uma
  seção própria — o que ficar mais legível dentro de
  `components/paciente/AbaDadosClinicos.tsx`.
- Lista dos encaminhamentos em ordem decrescente de data, cada um mostrando médico, CRM
  (com UF), especialidade, data e motivo.
- Botões de criar e editar **só para admin e recepção**. Para terapeuta, leitura.
- Ao digitar o nome do médico, sugerir nomes já usados em outros encaminhamentos
  (consulta com `ilike` sobre `medico_nome`), para o mesmo médico não virar três grafias
  diferentes.
- CRM é **opcional**, como a equipe pediu — nada de travar o salvamento por causa dele.

## 4.1 Correção de escopo (Etapa A, aplicada em 2026-09-30)

A dona da clínica corrigiu o escopo depois da primeira entrega. Palavras dela: *"imagine
que um paciente vá em um neuro, e ele manda essa criança aqui pra gente fazer o
tratamento por terapia ocupacional - logo, quando a gente cadastrar esse paciente, tem
que ter um campo pra preencher o CRM do médico que encaminhou pra gente e um campo pra
por o nome completo do médico e do telefone - mas nenhum desses 3 campos é
obrigatorio."*

O que mudou (migration `20260930_encaminhamentos_telefone_campos_opcionais.sql`; a tabela
tinha 0 linhas na hora de aplicar):

- **`medico_telefone`** (texto, só dígitos, 10 ou 11). É **um** campo: sem distinção de
  consultório e pessoal, sem seletor, sem lista de telefones (decisão do Renan: "tanto
  faz").
- **Nome deixou de ser obrigatório** (`medico_nome` aceita null; a CHECK de nome não vazio
  foi removida).
- **Em troca, uma CHECK exige ao menos um dos três** (nome, CRM ou telefone). "Nenhum
  campo é obrigatório" não significa "pode gravar em branco": sem isso entraria linha
  vazia no prontuário. A mesma regra vale na tela e na rota
  (`validarEncaminhamento`).
- **Os campos também existem no cadastro do paciente** (`/admin/pacientes/novo`, só para
  admin e recepção), além do bloco da aba Dados Clínicos. Os dois caminhos gravam na
  mesma tabela. Tudo em branco no cadastro = nenhuma linha criada. Se a gravação do
  encaminhamento falhar, o paciente **não** é desfeito: a rota devolve o `paciente_id` com
  o aviso (mesmo padrão da Fase 6).
- Na tela, nome, CRM e telefone ficam em primeiro plano; especialidade, data, motivo e
  observações ficam em "Mais detalhes".
- A máscara de telefone passou a viver em `lib/masks.ts` (havia 4 cópias); ver
  `scripts/test-masks.ts`.
- **RLS não mudou.**

## Verificação

- Como recepção: criar dois encaminhamentos para o mesmo paciente e ver os dois no
  histórico, o mais recente em cima.
- Como terapeuta vinculada: enxerga, mas não vê botão de editar; um UPDATE direto pelo
  cliente é recusado pela RLS.
- Como terapeuta **não** vinculada: `select` devolve vazio.
- Como responsável (`pai`): `select` devolve vazio.
- Paciente com alta: tentativa de inserir é recusada pela política RESTRICTIVE.

---

# Fase 5 — Modelo de avaliação próprio da profissional

> ## ⛔ FASE CANCELADA — NÃO IMPLEMENTAR
>
> **Decidido pelo Renan em 2026-09-30.** Não foi criado bucket, tabela, rota nem tela. O
> texto abaixo fica registrado para quem for manter isto depois entender o que foi
> pensado e por que não foi feito.
>
> **Motivo.** O pedido original era ambíguo entre duas coisas: (a) *subir o modelo em
> branco* para a plataforma e (b) *montar e preencher o formulário dentro do navegador*. A
> dona da clínica queria a (b), e o Renan recusou a complexidade. O fluxo atual
> permanece: a profissional escreve no Word do computador dela, exporta PDF, anexa à
> evolução/relatório e assina.
>
> **Esse fluxo já funciona em escala** (medido em produção em 2026-09-30): **579 das 594
> evoluções** e **6 dos 6 relatórios** têm PDF anexado e assinatura. São 585 usos
> comprovados; não há o que substituir.
>
> **A proteção que ela pediu também fica atendida.** O pedido dizia "o modelo deve
> aparecer apenas para quem o criou". Se a ficha em branco nunca sai do computador da
> profissional, não há nada dela para proteger dentro da plataforma.
>
> Decisão correlata: **nada de preencher formulário dentro do navegador.**

**Pedido:** *"Dar opção de criar um formulário caso o profissional tenha o próprio padrão;
Ex.: Subir modelo de avaliação (importante: esse modelo deve aparecer apenas para quem o
criou ou vinculou, assim permite garantir proteção de dados do profissional)"*.

**Decisão do Renan:** visível só para a autora e para quem ela compartilhar. O admin vê
o inventário, não baixa o arquivo.

> **Limite que precisa ficar claro para a equipe.** "Modelo" aqui é **ficha em branco**:
> o padrão de avaliação que a profissional trouxe da formação dela. Documento
> **preenchido** com dados de paciente continua indo para a aba Documentos do paciente,
> que tem RLS por vínculo e trilha de auditoria. Se um modelo preenchido for parar aqui,
> vira prontuário fora do controle de acesso e fora da auditoria — o oposto do que a
> LGPD pede. Deixar isso escrito na própria tela, junto do botão de upload.

## 5.1 Migration

Nome sugerido: `20260930_modelos_avaliacao.sql`.

```sql
create table if not exists public.modelos_avaliacao (
  id             uuid primary key default gen_random_uuid(),
  criado_por     uuid not null references public.profiles(id) on delete cascade,
  nome           text not null,
  descricao      text,
  arquivo_path   text not null unique,
  arquivo_nome   text not null,
  tamanho_bytes  bigint,
  criado_em      timestamptz not null default now()
);

create table if not exists public.modelo_avaliacao_compartilhamentos (
  modelo_id        uuid not null references public.modelos_avaliacao(id) on delete cascade,
  profile_id       uuid not null references public.profiles(id) on delete cascade,
  compartilhado_em timestamptz not null default now(),
  primary key (modelo_id, profile_id)
);

alter table public.modelos_avaliacao enable row level security;
alter table public.modelo_avaliacao_compartilhamentos enable row level security;
revoke all on public.modelos_avaliacao from anon;
revoke all on public.modelo_avaliacao_compartilhamentos from anon;
```

Políticas de `modelos_avaliacao`:

- **SELECT:** `criado_por = auth.uid()`, **ou** existe compartilhamento para
  `auth.uid()`, **ou** `get_my_role() = 'admin'` (inventário).
- **INSERT:** `criado_por = auth.uid()` e `get_my_role() in ('terapeuta','admin')`.
- **UPDATE / DELETE:** `criado_por = auth.uid()`.

Políticas de `modelo_avaliacao_compartilhamentos`: só a dona do modelo insere e apaga;
SELECT para a dona e para quem recebeu.

> Cuidado com **recursão de políticas**: a policy de `modelos_avaliacao` consulta
> `modelo_avaliacao_compartilhamentos` e vice-versa. Escreva as duas de forma que nenhuma
> dependa de um SELECT protegido da outra — ou resolva com uma função `SECURITY DEFINER`
> com `search_path` fixado (`public, pg_temp`), seguindo o padrão já usado em
> `get_my_role()`. Teste os dois sentidos antes de considerar pronto: uma recursão aqui
> derruba a consulta com erro, não com resultado vazio.

## 5.2 Storage

Criar bucket **privado** `modelos-avaliacao`.

- Caminho: `{criado_por}/{uuid}-{nome-do-arquivo}`.
- Políticas em `storage.objects` espelhando o par que já existe para `documentos`
  (`documentos_storage_read` / `documentos_storage_write`), mas amarrando à autoria:
  SELECT só se existir linha em `modelos_avaliacao` com aquele `arquivo_path` onde o
  usuário é a dona **ou** tem compartilhamento. **O admin não entra nessa policy** — é o
  que garante que ele veja o inventário e não o arquivo.
- Limitar tipo e tamanho: PDF, DOC/DOCX e ODT, até 10 MB.

## 5.3 Rotas e tela

- `POST /api/modelo-avaliacao` — upload + linha na tabela.
- `GET /api/modelo-avaliacao/[id]/download` — **espelhar
  `app/api/documento/[id]/download/route.ts`**: ler a linha com o cliente do usuário
  (a RLS faz a autorização), e só então assinar a URL com o cliente admin
  (`createSignedUrl(path, 3600)`). Não usar `getPublicUrl` — o bucket é privado, e existe
  em `app/api/upload/midia/route.ts:71` um `getPublicUrl` sobre bucket privado que é
  justamente o padrão a não copiar.
- `POST /api/modelo-avaliacao/[id]/compartilhar` — compartilha com outra profissional.
- Tela nova em `/terapia/modelos` (lista, upload, compartilhar, apagar).
- Para o admin, uma visão de inventário em `/admin` mostrando nome, dona e data — **sem
  botão de download**.

## Verificação

1. Terapeuta A sobe um modelo e baixa.
2. Terapeuta B não vê o modelo na lista; o download direto pelo id devolve 404.
3. A compartilha com B: B passa a ver e baixar.
4. A remove o compartilhamento: B para de ver.
5. **Admin vê nome e dona, e o download devolve erro** — este é o teste que prova a
   decisão do Renan. Se o admin conseguir baixar, a policy de storage está errada.
6. Responsável (`pai`): não vê nada, em nenhuma rota.

---

## Fora de escopo (registrado de propósito)

- **Fase 5 — modelos de avaliação (bucket privado, tabelas `modelos_avaliacao` e
  `modelo_avaliacao_compartilhamentos`, rotas e `/terapia/modelos`): CANCELADA.** Motivo e
  números no topo da própria Fase 5. Não criar bucket, tabelas nem rotas; o fluxo
  Word → PDF → anexar → assinar continua sendo o oficial.
- **Preencher formulário de avaliação dentro do navegador.** O Renan recusou a
  complexidade.
- **Telefone do médico com tipo (consultório/pessoal) ou vários telefones.** É um campo só.
- **Não mexer nas permissões das terapeutas.** As 5 com `ver_todos_pacientes` continuam
  com ela; a Fase 2 resolve por comportamento padrão da tela.
- **Não criar campos de endereço em `pacientes`** (decisão 3).
- **Não levar encaminhamento para o portal da família** nesta rodada.
- **Não mexer no fluxo de senha de primeiro acesso** — está em
  `docs/PLANO_SENHA_PRIMEIRO_ACESSO.md`, em execução separada. Se as duas frentes
  estiverem abertas ao mesmo tempo, terminar aquela antes desta, porque ela toca os
  layouts dos três grupos de rota.
- ~~**Busca de texto dentro do prontuário**~~ — **entregue na Etapa F** (2026-09-30): campo
  de busca no perfil do paciente, filtrando no navegador o que a página já carregou
  (evoluções, relatórios, orientações, encaminhamentos e, desde 2026-10-01, a ficha de
  dados clínicos; sem acento e sem diferença de maiúscula; todas as colunas de texto). O
  termo não vai ao servidor, à URL, ao armazenamento nem a log. Sem endpoint, sem índice
  de texto, sem `tsvector`.
- **Busca de texto ENTRE pacientes (global).** Fora de escopo de propósito: daria a quem
  tem `ver_todos_pacientes` (5 das 8 terapeutas) uma varredura sobre as anotações clínicas
  de toda a clínica. Feature diferente, que precisaria de decisão própria.

---

## Dívidas registradas (NÃO resolvidas; ficam para outra rodada)

### Dívida 6 — o telefone do responsável vive em dois lugares

`profiles.telefone` e `responsaveis_detalhes.telefone_principal` guardam o telefone da mesma
pessoa. **6 responsáveis têm valores divergentes** nos dois campos (medido em 2026-10-01,
sobre 105 responsáveis) e ninguém sabe qual é o verdadeiro; 14 estão ruins nos dois ao mesmo
tempo e 19 (18%) têm pelo menos um que não completa chamada.

Unificar numa fonte só é mudança de modelo de dados (migration, rotas que gravam, login por
telefone, telas) e **não foi feito**. Enquanto isso:

- o painel "Dados para conferir" da home de admin/recepção expõe a divergência
  (`/admin/responsaveis?problema=telefone-divergente`) e a recepção confirma com a família;
- nenhum registro existente foi corrigido ou normalizado: telefone de família, quem confirma
  é a recepção, ninguém deduz (prefixar o 9 é a regra da ANATEL, mas continua sendo decisão
  humana);
- o login por telefone usa `responsaveis_detalhes.telefone_digits` (coluna gerada, só dígitos).

### Pendências de decisão encontradas na revisão

- **Orientação: a autora pode editar?** `orientacoes` não tem policy PERMISSIVE de UPDATE para
  terapeuta (só a RESTRICTIVE pós-alta), então o UPDATE afeta 0 linhas. A rota agora devolve
  erro em vez de "salvo". Se for permitir, só enquanto `assinado_em IS NULL`: a rota
  recalcula `hash_integridade` com `assinado_em`, e editar uma orientação assinada mudaria o
  conteúdo mantendo a assinatura. Se não for permitir, esconder o botão "Editar".

- **O painel de qualidade de dados fica só na home de admin e recepção, mas 6 das 8
  terapeutas podem arrumar esses dados.** Medido em 01/10/2026: 6 terapeutas têm
  `gerenciar_responsaveis` em `profiles.permissoes`, e são elas que falam com as famílias.
  Copiar o painel para `/terapia/dashboard` **como está daria número errado**: numa transação
  desfeita, com `auth.uid()` de uma dessas terapeutas, a RLS devolve 18 `profiles` de
  `role='pai'` (só as famílias das pacientes dela) e **101** `responsaveis_detalhes` (todas).
  `carregarLinhasQualidadeDados` parte dos perfis, então a contagem sairia parcial, sem
  dizer que é parcial. Se for levar o painel para lá, a contagem precisa ser explicitamente
  "entre as suas famílias" — não o mesmo número da recepção.

- **`responsaveis_detalhes` é legível por qualquer terapeuta, inteira.** A policy de SELECT
  é `(id = auth.uid()) OR get_my_role() = ANY (ARRAY['admin','recepcao','terapeuta'])`: cada
  terapeuta lê telefone, endereço, CEP e contato de emergência das 101 famílias, inclusive
  das que não são pacientes dela — enquanto `profiles` de `role='pai'` já restringe às 18
  dela. A escrita está certa (só o próprio dono ou admin/recepção; a rota da terapeuta usa
  `createAdminClient()` com a autorização conferida antes). É assimetria antiga, não foi
  introduzida agora, e as 8 terapeutas são funcionárias da clínica — mas é mais dado de
  contato do que o trabalho exige (minimização, LGPD art. 6º III). Decidir se a leitura passa
  a exigir vínculo com a paciente, como `profiles` já faz.

### Ficha de dados clínicos: resolvido em 01/10/2026

A ficha **nunca** pôde ser salva. O upsert de `AbaDadosClinicos` enviava `hash_integridade`,
coluna que `pacientes_dados_clinicos` não tem, e o PostgREST recusava a gravação inteira:

```
HTTP 400 {"code":"PGRST204","message":"Could not find the 'hash_integridade' column
          of 'pacientes_dados_clinicos' in the schema cache"}
```

Não era descarte silencioso: o PostgREST valida as chaves contra o cache de schema **antes**
de tocar o banco, então a requisição morria no 400 e a tela só dizia "Erro ao salvar. Tente
novamente." Nada no SQL denunciava — a tabela apenas ficava com 0 linhas. Medido em produção
mandando o mesmo corpo como anon: com o campo dá 400 PGRST204; sem o campo dá 401 `42501`
(RLS), ou seja, passa da validação de schema. Nada foi gravado nos dois testes.

**Decisão: parar de enviar o campo, sem criar a coluna.** A ficha é um documento vivo
(`upsert` por `paciente_id`, sobrescrito a cada edição), então um hash recalculado em toda
gravação não prova integridade de nada — diferente de `evolucoes` e `relatorios`, que são
imutáveis depois de assinados. Autoria e data já ficam em `atualizado_por`/`atualizado_em`,
e a trilha de alteração agora existe pelo trigger `audit_dados_clinicos`, que passou a
gravar com a migration da auditoria.

O payload saiu da tela para `lib/paciente/dados-clinicos.ts`, com a lista de colunas reais
e `colunasDesconhecidas()`; `test:dados-clinicos` reprova qualquer chave fora da tabela
(três mutações conferidas: campo de volta na tela, detector neutralizado, `paciente_id`
removido do payload).

---

## Fechamento

Ao final de cada fase: `npx tsc --noEmit`. Se aparecer erro apontando para arquivo
dentro de `.next/`, é artefato de build antigo — apagar `.next/types` e `.next/dev/types`
e rodar de novo.

Commit por fase, seguindo o padrão de mensagens do repositório (`feat:`, `fix:`), com o
número da fase no corpo.
