# Revisão das Etapas A, B, F, C — CONCLUÍDA em 30/09/2026

Auditoria independente do trabalho do Sonnet (commits `aa45d70`, `70cfe90`, `d084fb1`,
`6c0d018`) e da migration de auditoria ainda não aplicada. Tudo abaixo foi medido no banco
ou lido por inteiro, não relido do relatório dele.

## Resultado

| Item | Veredito |
|---|---|
| 4 commits no remoto, migration de auditoria fora do commit | ✅ como prometido |
| `tsc --noEmit` | ✅ limpo |
| 10 suítes | ✅ todas passam |
| Etapa A — guarda de autorização do encaminhamento no cadastro | ✅ verdadeira |
| Etapa A — CHECK "ao menos um dos três" | ✅ correta |
| Etapa B — hífen do CEP com `{ apagando }` | ✅ não trava no Backspace |
| Etapa F — plano atualizado, teste de privacidade do termo | ✅ presentes |
| C7 — 3 × `limit(1)` + teste novo | ✅ aplicados |
| Migration de auditoria — lógica nova | ✅ verificada por execução |
| Diagnóstico do Sonnet sobre os 8 telefones | ❌ **errado** |
| 3 registros de 12 dígitos em `profiles.telefone` | ❌ **não vistos por ele** |
| CHECK de `medico_telefone` | ⚠️ **conflita com o pedido** |

## O que foi verificado, e como

**Etapa A.** A afirmação sensível era "a rota barra quem não é admin nem recepção, porque o
cliente admin ignora a RLS". Li `app/api/paciente/route.ts` inteira do topo: a guarda está
na linha 50, `encaminhamento.dados && role !== 'admin' && role !== 'recepcao'` → 403, antes
de criar o paciente. Verdadeira, e o comentário dá o motivo certo. A acumulação de falhas
(`falhas[]` + `encaminhamentoFalhou`) devolve 500 com `paciente_id` e não desfaz o paciente
— padrão já estabelecido na Fase 6.

No banco: `encaminhamentos_ao_menos_um_check` exige nome, CRM **ou** telefone;
`medico_nome` deixou de ser `NOT NULL`.

**Etapa B.** `mascaraCep(valor, { apagando })` + `mascaraCepDoEvento` lendo `inputType`.
Tracei: campo `38742-`, Backspace apaga o hífen → `apagando: true` e `valor.includes('-')`
falso → devolve `38742` sem recolocar. Não trava. `LIMITE_DIGITOS_MASCARA`, `validarCep` e
`useCep` intactos.

**Migration de auditoria.** Corrige os 5 defeitos: cast para `audit_acao`, `recurso_id`
como uuid, id via `to_jsonb(linha) ->> 'id'` com queda para a PK, `OLD` no DELETE, e
`RAISE WARNING` no lugar do silêncio. Verifiquei **a lógica nova por execução em tabelas
temporárias, sem tocar na função de produção**: para tabela sem coluna `id` resolve
`paciente_id`; para tabela com `id` resolve `id`; os dois devolvem o uuid esperado.

**VEREDITO: pode aplicar.** É AFTER trigger, protegida por exception, ~600 escritas em 4
meses, `SECURITY DEFINER`, não altera política nem tranca tabela.

## Correções ao relatório do Sonnet

### 1. O diagnóstico dos 8 telefones está errado

Ele disse que a máscara antiga "errava fixo de 10 dígitos". A máscara antiga
(`.slice(0, 11)`, split sempre `5+resto`) realmente exibia 10 dígitos como `5+3` — isso
está certo. **Mas os 8 registros não são telefones fixos.**

Os 8, todos em `responsaveis_detalhes`: `(34) 88126-967`, `(34) 88297-802`,
`(34) 91599-591`, `(34) 93222-908`, `(34) 99229-936`, `(34) 99304-406`, `(34) 99969-256`,
`(37) 99975-015`.

Os dígitos após o DDD começam com **8 ou 9**. Fixo em Patrocínio começa com **3**. São
**celulares no formato antigo de 8 dígitos**, sem o nono dígito. `(34) 8812-6967` não
completa chamada hoje. São 8 famílias com telefone inacessível — mesma classe do CEP
`38742-24`, não ruído de formatação.

A máscara nova exibe esses valores como `(34) 9159-9591`, com cara de fixo. Continua
errado, de outra forma.

### 2. Ele não viu 3 registros piores

`profiles.telefone` tem 3 valores com **12 dígitos**:

- Michelle Moralista (`pai`): `34 998864 9617`
- Caroline Bernardes de Freitas Dias (`pai`): `(34) 993222-2908`
- Joana D'arc da Silva (`pai`): `(34) 9990304406`

A máscara antiga limitava em 11 dígitos, então **esses valores não podem ter vindo de um
campo mascarado**. Existe caminho de escrita em `profiles.telefone` sem máscara e **sem
validação de servidor nenhuma** — ao contrário do CEP, que ganhou validação nas 4 rotas.
`(34) 993222-2908` tem dígito duplicado.

### 3. A CHECK de `medico_telefone` conflita com o pedido

- No banco: `CHECK (medico_telefone IS NULL OR medico_telefone ~ '^[0-9]{10,11}$')`
- Na tela: `lib/paciente/encaminhamentos.ts:141` → "deve ter DDD e número (10 ou 11 dígitos)"

Dois problemas. A dona da clínica disse que nenhum dos 3 campos é obrigatório e não pediu
formato — se o papel do médico traz só `3822-1234`, a recepção não consegue registrar. E o
Renan pediu **DDD em campo separado**: com o DDD vazio, o número sozinho tem 8 ou 9 dígitos
e é recusado nas duas camadas.

**Recomendação:** aceitar 8, 9, 10 ou 11 dígitos. 8/9 = número local sem DDD (a recepção é
local, disca sem DDD); 10/11 = com DDD.

## Pendências latentes na migration (não bloqueiam)

1. **DELETE gravado como `alterou`.** O enum `audit_acao` não tem valor de exclusão. Hoje é
   código morto (nenhum trigger de DELETE existe), mas é armadilha para quem criar um
   depois acreditando que está tratado. Corrigir com `ALTER TYPE audit_acao ADD VALUE
   'excluiu'` **antes** de ligar qualquer trigger de DELETE.
2. **Fallback de PK composta** pega a coluna de menor `attnum`. As 7 tabelas têm PK de
   coluna única, então não afeta nada hoje.
3. **`recurso_tipo` vai misturar convenções.** O app grava nome lógico singular
   (`paciente`); os triggers vão gravar nome de tabela (`evolucoes`, `relatorios`). A tela
   `/admin/auditoria` mostra os dois. Vem da migration 020, não é regressão.

## Decisão sobre as orientações — recomendação afinada

O defeito é real e eu confirmei a causa: `orientacoes` **não tem nenhuma policy PERMISSIVE
de UPDATE para terapeuta** — só a RESTRICTIVE pós-alta, que restringe sem conceder. Em RLS,
sem PERMISSIVE não há permissão: o UPDATE afeta 0 linhas sem erro, e
`app/api/orientacao/[id]/route.ts` devolve `{success:true}` sem conferir linhas afetadas.

Um detalhe que o Sonnet não levantou: a rota **recalcula `hash_integridade` incluindo
`assinado_em`**. Editar uma orientação já assinada mudaria o conteúdo mantendo a assinatura
— problema de integridade, não só de permissão.

**Duas etapas, separadas de propósito:**

1. **Agora, sem mudar permissão:** a rota passa a usar `.select('id')` e devolve erro quando
   0 linhas voltam. Só isso já para a mentira. Barato, não concede nada a ninguém.
2. **Decisão do Renan:** permitir que a autora edite a própria orientação **apenas enquanto
   `assinado_em IS NULL`** (rascunho). É o que a tela promete e é defensável sob a
   imutabilidade do COFFITO Res. 424/2013 que o próprio handler de DELETE cita. Se preferir
   que ninguém edite, esconder o botão "Editar" — com a rota honesta, os dois caminhos
   ficam coerentes.

Com `orientacoes` em 0 linhas, ninguém foi afetado até agora.

## Ficha de Dados Clínicos na busca do prontuário

**Incluir.** 17 campos de texto, 1 registro por paciente, 0 linhas hoje — custa quase nada
e é o registro clinicamente mais denso. Deixar fora cria busca que mente por omissão no dia
em que a ficha começar a ser usada. Mesmo argumento que valeu para `obs_clinicas`.

## O que falta fazer

### Código
1. Aplicar a migration de auditoria (liberada por esta revisão) e commitar o arquivo.
2. `ALTER TYPE audit_acao ADD VALUE 'excluiu'` e usar no DELETE, antes de qualquer trigger
   de DELETE.
3. Telefone: DDD em campo separado e máscara ancorada à direita (especificação do Renan,
   abaixo).
4. Afrouxar a validação de `medico_telefone` para 8–11 dígitos, nas duas camadas.
5. Validação de telefone **no servidor**, nas rotas que gravam telefone — hoje não existe
   nenhuma, e os 3 registros de 12 dígitos são a prova.
6. Rota de orientação honesta (`.select('id')` + erro em 0 linhas).
7. Ficha de Dados Clínicos na busca do prontuário.

### Especificação da máscara de telefone (pedido do Renan, verificada como correta)
Campo do DDD separado do campo do número. O número preenche **ancorado à direita**: o
sufixo são sempre os **últimos 4 dígitos**, e o prefixo cresce de 1 até 5.

| Dígitos | Mostra |
|---|---|
| 4 | `1234` |
| 5 | `1-2345` |
| 6 | `12-3456` |
| 7 | `123-4567` |
| 8 | `1234-5678` (fixo completo) |
| 9 | `12345-6789` (celular completo) |

Isso é correto por um motivo técnico: não se sabe se o número tem 8 ou 9 dígitos até a
pessoa terminar. Máscara da esquerda para a direita tem de chutar — a atual em
`lib/masks.ts` mostra `(34) 9988-2254` no 10º dígito e faz o hífen **saltar** para
`(34) 99882-2549` no 11º. Ancorada à direita, todo estado intermediário está certo para os
dois tamanhos.

Cuidados: auto-avanço do DDD para o número após 2 dígitos; Backspace no início do campo do
número volta para o DDD; **colar** `(34) 99882-2549` ou `34998822549` no DDD tem de
distribuir entre os dois campos, não truncar (a recepção copia do WhatsApp).

### Dados a corrigir com a equipe (não adivinhar)
- **8 responsáveis com celular sem o nono dígito.** A regra da ANATEL é prefixar `9`, mas é
  telefone de família: a recepção confirma, ninguém deduz.
- **3 responsáveis com telefone de 12 dígitos** em `profiles.telefone`.
- **Maria Teodora de Souza**, CEP `38742-24` — único registro que bloqueia salvamento.

### Operacional do Renan
- Avisar a equipe: **105 responsáveis e 7 terapeutas** caem na troca obrigatória de senha no
  próximo acesso. Código no `main`, migration aplicada.
- Perguntar à dona da clínica se "busca na página do paciente" era achar o paciente ou
  buscar dentro do prontuário. As duas estão prontas; a resposta não desfaz trabalho.
- Aline (0 pacientes, último login 13/05) e Maria Vitória (0 pacientes, último login 25/09)
  sem vínculo nenhum.

### Verificações no navegador (só o Renan pode)
Não entrar na conta das terapeutas: 7 das 8 cairiam na troca obrigatória de senha e ele
definiria uma senha que elas não conhecem. Criar duas contas descartáveis:

| Conta | `gerenciar_responsaveis` | `ver_todos_pacientes` | Substitui |
|---|---|---|---|
| Teste-A | true | false | Alexandra |
| Teste-B | false | false | Rute (28 pacientes, sem a permissão) |

Maria Vitória **não** serve de teste negativo: 0 pacientes, não dá para distinguir botão
escondido por permissão de ausência de paciente.

Itens: botão "Cadastrar novo" responsável aparece na Teste-A e não na Teste-B; POST direto
em `/api/admin/criar-usuario` como Teste-B devolve 403; lista abre em "Meus pacientes";
toggle persiste entre telas; sem `ver_todos` não há toggle; busca por `#155`; botão Copiar
endereço; CEP com 7 dígitos acusa erro na hora e bloqueia o salvamento; CEP vazio salva;
**Backspace com 5 dígitos apaga o 5º dígito e não trava no hífen**; cadastro de paciente com
os 3 campos de encaminhamento vazios não cria linha, e com só o telefone salva.
