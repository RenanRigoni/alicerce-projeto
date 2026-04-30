> ⚠️ **Documento histórico — planejamento legado (Bloco 1).** Plano original de implementação. Pode divergir do código atual. Estado real em `README.md` e `docs/DOCUMENTACAO_RESUMIDA.md`.

---

# Alicerce — Plano de Implementação (Bloco 1)

**Spec:** `2026-04-11-alicerce-portal-bloco1-design.md`  
**Stack:** Next.js 14 (App Router) + Supabase + Vercel  
**Dev:** Solo

---

## Resumo

| Métrica | Valor |
|---------|-------|
| Total de etapas | 12 |
| Ondas de execução | 5 |
| Complexidade geral | Média-Alta |
| Dependência crítica | Supabase configurado antes de qualquer tela |

---

## Ordem de Execução

| # | Etapa | Depende de | Risco |
|---|-------|-----------|-------|
| 1 | Setup do projeto e infraestrutura | — | Baixo |
| 2 | Banco de dados e RLS no Supabase | 1 | Médio |
| 3 | Autenticação e middleware de roles | 2 | Médio |
| 4 | Layout base e componentes compartilhados | 3 | Baixo |
| 5 | Área Admin — gestão de pacientes e usuários | 4 | Baixo |
| 6 | Fluxo de ALTA e notificações no painel admin | 5 | Médio |
| 7 | Área Terapeuta — criar e publicar relatórios | 5 | Alto |
| 8 | Geração de PDF e assinatura digital | 7 | Alto |
| 9 | Calendário — agendamentos e feriados | 5 | Médio |
| 10 | Área Pais — portal de acesso | 5, 7, 8, 9 | Baixo |
| 11 | Auditoria, comunicados e ajustes finais | 10 | Baixo |
| 12 | Polimento e testes end-to-end | 11 | Baixo |

---

## Ondas de Execução

### Onda 1 — Fundação (sequencial obrigatório)
Etapas 1, 2, 3. Nada funciona sem essa base.

### Onda 2 — Base visual e Admin (sequencial)
Etapas 4 e 5. Admin é a tela mais simples e valida auth + DB completo antes de avançar.

### Onda 3 — Core do produto (sequencial)
Etapas 6, 7, 8. ALTA depende do Admin (etapa 5). Relatório → PDF → Assinatura é o caminho crítico. Fazer com calma.

### Onda 4 — Calendário e Portal dos Pais (paralelo possível após Onda 3)
Etapa 9 (calendário) e Etapa 10 (área pais) podem ser desenvolvidas em paralelo depois que a Onda 3 estiver estável.

### Onda 5 — Polimento e entrega (após Onda 4)
Etapas 11 e 12.

---

## Detalhamento das Etapas

---

### Etapa 1 — Setup do Projeto e Infraestrutura

**Objetivo:** Ter o projeto rodando localmente e conectado ao Supabase e Vercel.

**Passos:**
1. Criar projeto Next.js 14: `npx create-next-app@latest alicerce --typescript --tailwind --app`
2. Criar projeto no Supabase (supabase.com) — free tier
3. Instalar dependências: `@supabase/supabase-js @supabase/ssr`
4. Configurar variáveis de ambiente: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
5. Criar cliente Supabase para servidor (`lib/supabase/server.ts`) e para browser (`lib/supabase/client.ts`) seguindo padrão oficial do `@supabase/ssr`
6. Conectar repositório ao Vercel para deploy automático
7. Configurar variáveis de ambiente no Vercel

**Arquivos a criar:**
- `lib/supabase/server.ts`
- `lib/supabase/client.ts`
- `.env.local` (não commitar)

**Critérios de aceite:**
- [ ] `npm run dev` sobe sem erros
- [ ] Conexão com Supabase funciona (testar com query simples)
- [ ] Deploy no Vercel passa

---

### Etapa 2 — Banco de Dados e RLS

**Objetivo:** Criar todas as tabelas e políticas de segurança no Supabase.

**Passos:**
1. Executar migration no SQL Editor do Supabase criando as tabelas na ordem:
   - `profiles` → `responsaveis_detalhes` → `pacientes` → `pacientes_dados_clinicos` → `paciente_responsaveis` → `paciente_terapeutas` → `relatorios` → `documentos` → `orientacoes` → `solicitacoes_alta` → `agendamentos` → `feriados` → `notificacoes` → `comunicados` → `comentarios` → `audit_logs`
2. Criar enums: `role`, `status_paciente`, `tipo_agendamento`, `tipo_notificacao`, `acao_auditoria`
3. Criar sequence e trigger para `codigo_interno` em `pacientes` (formato: `001`, `002`, ...)
4. Criar trigger para inserir em `profiles` automaticamente ao criar usuário no `auth.users`
5. Criar políticas RLS:
   - `pacientes`: visíveis conforme vínculo + filtro de status (ativos por padrão)
   - `pacientes_dados_clinicos`: leitura para terapeuta vinculada e admin; escrita somente terapeuta vinculada
   - `relatorios`: pai vê apenas os publicados dos seus pacientes; terapeuta gerencia os seus; admin vê todos
   - `documentos`: respeita `visivel_pais` e vínculos
   - `agendamentos`: terapeuta vê os seus; responsável vê os com `visivel_responsavel=true` do seu paciente; admin/recepcao veem todos
   - `notificacoes`: cada usuário vê apenas as próprias
   - demais tabelas: políticas analogamente restritivas
6. Criar buckets privados no Supabase Storage: `relatorios-pdf`, `documentos`, `fotos-pacientes`
7. Criar políticas de Storage alinhadas com RLS

**Arquivo sugerido:** `supabase/migrations/001_initial_schema.sql`

**Critérios de aceite:**
- [ ] Todas as tabelas criadas
- [ ] Trigger de `profiles` funcionando
- [ ] Trigger de `codigo_interno` gera 001, 002, ... sem repetição
- [ ] RLS habilitado em todas as tabelas
- [ ] Terapeuta não consegue escrever em `pacientes_dados_clinicos` de paciente não vinculado
- [ ] Buckets criados como privados

---

### Etapa 3 — Autenticação e Middleware de Roles

**Objetivo:** Login funcionando com redirecionamento por role.

**Passos:**
1. Criar página `/login` com formulário e-mail + senha
2. Criar página `/recuperar-senha`
3. Criar `middleware.ts`:
   - Rotas `/portal/*` → exige role `pai`
   - Rotas `/terapia/*` → exige role `terapeuta`
   - Rotas `/admin/*` → exige role `admin` ou `recepcao`
   - Não autenticado → redireciona para `/login`
4. Criar helper `lib/auth/get-user-role.ts`
5. Após login: redirecionar para dashboard correto por role

**Arquivos a criar:**
- `app/(auth)/login/page.tsx`
- `app/(auth)/recuperar-senha/page.tsx`
- `middleware.ts`
- `lib/auth/get-user-role.ts`

**Critérios de aceite:**
- [ ] Login funciona com e-mail/senha
- [ ] Cada role redireciona para seu dashboard
- [ ] Acesso não autorizado redireciona para `/login`

---

### Etapa 4 — Layout Base e Componentes Compartilhados

**Objetivo:** Estrutura visual reutilizável, mobile-first, com identidade da Alicerce.

**Passos:**
1. Configurar paleta de cores da Alicerce no `tailwind.config.ts` (rosa, pêssego, azul bebê, lilás, verde menta)
2. Criar componentes base:
   - `components/ui/Button.tsx`
   - `components/ui/Card.tsx`
   - `components/ui/Avatar.tsx`
   - `components/ui/Tabs.tsx`
   - `components/ui/Badge.tsx`
   - `components/ui/Modal.tsx`
   - `components/ui/StatusBadge.tsx` (ativo | alta | desativado)
   - `components/layout/Navbar.tsx` (diferente por role)
   - `components/layout/PageWrapper.tsx`
3. Criar layouts por grupo de rotas:
   - `app/(portal)/layout.tsx`
   - `app/(terapia)/layout.tsx`
   - `app/(admin)/layout.tsx`

**Critérios de aceite:**
- [ ] Componentes renderizam sem erros
- [ ] Layout responsivo (375px e 1280px)
- [ ] Contraste adequado em fundos pastéis

---

### Etapa 5 — Área Admin: Cadastro Completo de Pacientes e Usuários

**Objetivo:** Admin/Recepcao consegue cadastrar pacientes detalhados, criar contas e gerenciar vínculos.

**Passos:**
1. `/admin/dashboard` — cards com totais + badge de notificações pendentes (alta)
2. `/admin/pacientes` — listagem de pacientes **ativos por padrão** + toggle "Mostrar inativos"
3. `/admin/pacientes/novo` — formulário Aba 1 (dados gerais + dados administrativos):
   - Somente `nome` obrigatório
   - `codigo_interno` exibido como somente leitura (gerado automaticamente)
   - `data_inicio` gerada automaticamente ao salvar
   - Campos: sexo, nascimento, foto, CPF, frequência, dias/horários, turno, convênio/particular
4. `/admin/pacientes/[id]` — perfil completo com 6 abas:
   - **Aba 1 — Dados Gerais:** editável por admin/recepcao; botão "Desativar paciente" (com campo motivo obrigatório); botão "Reativar" (se inativo)
   - **Aba 2 — Responsáveis:** adicionar principal e secundários; exibe dados de contato
   - **Aba 3 — Dados Clínicos:** somente leitura para recepcao; editável pela terapeuta vinculada
   - **Aba 4 — Relatórios e Documentos:** lista de PDFs e arquivos
   - **Aba 5 — Orientações:** lista de orientações
   - **Aba 6 — Histórico:** linha do tempo
5. `/admin/usuarios` — listagem; criação via `supabase.auth.admin.createUser()` + API Route
6. Ao criar usuário com role `pai`: adicionar dados em `responsaveis_detalhes`

**Arquivos a criar:**
- `app/(admin)/admin/dashboard/page.tsx`
- `app/(admin)/admin/pacientes/page.tsx`
- `app/(admin)/admin/pacientes/novo/page.tsx`
- `app/(admin)/admin/pacientes/[id]/page.tsx`
- `app/(admin)/admin/usuarios/page.tsx`
- `app/(admin)/admin/usuarios/novo/page.tsx`
- `app/api/admin/criar-usuario/route.ts`
- `components/paciente/AbaDadosGerais.tsx`
- `components/paciente/AbaResponsaveis.tsx`
- `components/paciente/AbaDadosClinicos.tsx`

**Critérios de aceite:**
- [ ] Código interno gerado automaticamente (001, 002, ...)
- [ ] Apenas nome obrigatório no cadastro
- [ ] Recepcao não consegue editar campos clínicos
- [ ] Desativação exige motivo
- [ ] Paciente inativo desaparece da lista padrão; aparece com filtro ativado
- [ ] Reativação disponível apenas para admin/recepcao

---

### Etapa 6 — Fluxo de ALTA e Notificações

**Objetivo:** Terapeuta solicita alta; admin aprova ou recusa com workflow completo.

**Passos:**
1. `/terapia/paciente/[id]/solicitar-alta` — formulário com campo `motivo` obrigatório
2. Ao submeter: cria registro em `solicitacoes_alta` (status=pendente) + cria `notificacao` para o(s) admin(s)
3. `/admin/dashboard` — exibir badge com contagem de solicitações de alta pendentes
4. `/admin/alta/[solicitacaoId]` — tela de revisão:
   - Exibe nome do paciente, terapeuta, data, motivo da solicitação
   - Botão **Aceitar:** muda `solicitacoes_alta.status=aceita`, muda `pacientes.status=alta`, cria notificação para terapeuta
   - Botão **Recusar:** abre campo obrigatório de motivo da recusa → salva `resposta_admin`, muda status=recusada, cria notificação para terapeuta
5. Terapeuta vê notificação no seu dashboard (badge) informando aprovação ou recusa com os motivos

**Arquivos a criar:**
- `app/(terapia)/terapia/paciente/[id]/solicitar-alta/page.tsx`
- `app/(admin)/admin/alta/[id]/page.tsx`
- `components/notificacoes/BadgeNotificacoes.tsx`
- `lib/notificacoes/criar-notificacao.ts`

**Critérios de aceite:**
- [ ] Terapeuta só vê "Solicitar Alta" em pacientes ativos
- [ ] Notificação aparece no dashboard do admin após solicitação
- [ ] Aceitar muda status do paciente para `alta`
- [ ] Recusar exige motivo; terapeuta recebe motivo mas não pode replicar no sistema
- [ ] Paciente com alta some das listagens padrão

---

### Etapa 7 — Área Terapeuta: Criar e Publicar Relatórios

**Objetivo:** Terapeuta preenche dados clínicos, cria relatórios e publica para os pais.

**Passos:**
1. `/terapia/dashboard` — calendário pessoal (ver Etapa 9) + lista de pacientes ativos
2. `/terapia/paciente/[id]` — perfil com 6 abas (mesma estrutura do admin, mas com controles de edição clínica)
   - Aba 3 — Dados Clínicos: formulário editável pela terapeuta vinculada
3. `/terapia/paciente/[id]/novo-relatorio` — formulário multi-seção (5 seções)
   - Botão "Salvar rascunho" e "Publicar" (abre modal de assinatura)
4. Modal de assinatura: confirma nome do terapeuta, gera hash SHA-256
5. Ao publicar: salva assinatura, muda status → aciona geração de PDF (Etapa 8)
6. `/terapia/paciente/[id]/novo-documento` — upload de arquivo

**Arquivos a criar:**
- `app/(terapia)/terapia/dashboard/page.tsx`
- `app/(terapia)/terapia/paciente/[id]/page.tsx`
- `app/(terapia)/terapia/paciente/[id]/novo-relatorio/page.tsx`
- `app/(terapia)/terapia/paciente/[id]/novo-documento/page.tsx`
- `components/relatorio/FormularioRelatorio.tsx`
- `components/relatorio/ModalAssinatura.tsx`
- `lib/relatorio/gerar-hash.ts`

**Critérios de aceite:**
- [ ] Terapeuta vê apenas seus pacientes ativos
- [ ] Dados clínicos salvos ficam visíveis nas abas
- [ ] Rascunho não aparece para os pais
- [ ] Publicação exige confirmação de assinatura
- [ ] Relatório publicado aparece na área dos pais

---

### Etapa 8 — Geração de PDF e Assinatura Digital

**Objetivo:** Relatório publicado gera PDF bem formatado disponível para download.

**Passos:**
1. Instalar `@react-pdf/renderer`
2. Criar template `lib/pdf/template-relatorio.tsx`:
   - Cabeçalho: logo + nome do paciente + data
   - 5 seções do relatório
   - Rodapé: assinatura digital (nome + data/hora + hash)
3. Criar API Route `app/api/relatorio/[id]/pdf/route.ts`:
   - Verifica permissão
   - Gera PDF
   - Salva no Storage (`relatorios-pdf/{id}.pdf`)
   - Atualiza `pdf_url` na tabela
   - Retorna URL assinada temporária
4. Acionar geração automaticamente ao publicar

**Arquivos a criar:**
- `lib/pdf/template-relatorio.tsx`
- `app/api/relatorio/[id]/pdf/route.ts`

**Critérios de aceite:**
- [ ] PDF gerado ao publicar
- [ ] PDF contém todas as seções e dados de assinatura
- [ ] Download funciona para terapeuta e pais
- [ ] URL do PDF é privada (URL assinada)

---

### Etapa 9 — Calendário: Agendamentos e Feriados

**Objetivo:** Recepcao gerencia agendamentos; terapeuta e pais visualizam no dashboard.

**Passos:**
1. `/admin/agendamentos` — lista de agendamentos (filtráveis por terapeuta, data, tipo)
2. `/admin/agendamentos/novo` — formulário:
   - Terapeuta (select)
   - Paciente (select, opcional)
   - Tipo: sessao | devolutiva | reuniao | outro
   - Título, motivo (visível à terapeuta)
   - Data, hora, duração
   - Toggle "Visível para o responsável"
3. `/admin/feriados` — cadastrar data + descrição; exibição em vermelho
4. Componente `components/calendario/CalendarioTerapeuta.tsx`:
   - Visualização semanal e mensal
   - Destaque para o dia atual
   - Feriados em vermelho
   - Clique no evento mostra detalhes (paciente, tipo, motivo)
5. Componente `components/calendario/WidgetAgendamentosResponsavel.tsx`:
   - Lista próximos agendamentos do filho
   - Feriados em vermelho

**Arquivos a criar:**
- `app/(admin)/admin/agendamentos/page.tsx`
- `app/(admin)/admin/agendamentos/novo/page.tsx`
- `app/(admin)/admin/feriados/page.tsx`
- `components/calendario/CalendarioTerapeuta.tsx`
- `components/calendario/WidgetAgendamentosResponsavel.tsx`

**Critérios de aceite:**
- [ ] Recepcao cria agendamento e aparece no calendário da terapeuta
- [ ] Calendário alterna entre semanal e mensal
- [ ] Dia atual destacado
- [ ] Feriados aparecem em vermelho para terapeuta e responsável
- [ ] Agendamentos com `visivel_responsavel=false` não aparecem para o pai

---

### Etapa 10 — Área Pais: Portal de Acesso

**Objetivo:** Pais acessam acompanhamento do filho de forma simples no celular.

**Passos:**
1. `/portal/dashboard` — cartão(ões) do(s) filho(s) + widget de próximos agendamentos
2. `/portal/paciente/[id]` — perfil com 6 abas:
   - **Relatórios:** lista publicados + download PDF
   - **Documentos:** arquivos com `visivel_pais=true`
   - **Orientações:** lista de orientações
   - **Calendário:** próximos agendamentos + feriados
   - **Histórico:** linha do tempo
   - **Dados Gerais:** leitura dos dados permitidos
3. `/portal/paciente/[id]/relatorio/[id]` — leitura + curtida + comentário
4. `/portal/paciente/[id]/upload` — envio de arquivo para a equipe
5. Registrar no `audit_logs`: `visualizou` ao abrir relatório, `baixou` ao fazer download

**Arquivos a criar:**
- `app/(portal)/portal/dashboard/page.tsx`
- `app/(portal)/portal/paciente/[id]/page.tsx`
- `app/(portal)/portal/paciente/[id]/relatorio/[id]/page.tsx`
- `app/(portal)/portal/paciente/[id]/upload/page.tsx`
- `components/portal/CardPaciente.tsx`
- `lib/audit/registrar-acao.ts`

**Critérios de aceite:**
- [ ] Pai vê apenas os filhos vinculados
- [ ] Download de PDF funciona no celular
- [ ] Comentário e curtida funcionam
- [ ] Agendamentos visíveis ao responsável aparecem no calendário
- [ ] Ação de download registrada no audit_log

---

### Etapa 11 — Auditoria, Comunicados e Polimento

**Objetivo:** Fechar o escopo com log de auditoria, comunicados e qualidade geral.

**Passos:**
1. `/admin/auditoria` — tabela paginada com filtros por usuário, ação e data; inclui ações de desativação, alta, etc.
2. Comunicados: aparecer no dashboard dos pais como card "Avisos da clínica"
3. Revisar responsividade de todas as telas (375px)
4. Garantir estados de loading e erro em todos os formulários
5. Revisar contraste de cores

**Critérios de aceite:**
- [ ] Log exibe ações com usuário, ação e timestamp
- [ ] Comunicados aparecem para todos os pais no dashboard
- [ ] Nenhuma tela quebra em mobile (375px)

---

### Etapa 12 — Testes End-to-End e Entrega

**Objetivo:** Validar o fluxo completo antes de entregar para a cliente.

**Fluxos a testar:**
1. Admin cria paciente → vincula pai e terapeuta → pais e terapeuta fazem login
2. Terapeuta preenche dados clínicos → cria relatório → publica → pai acessa e baixa PDF
3. Terapeuta solicita alta → admin aprova → paciente some das listas
4. Admin recusa alta → terapeuta recebe motivo
5. Recepcao cria agendamento → aparece na agenda da terapeuta e no dashboard do pai
6. Recepcao desativa paciente → some das listas; histórico ainda acessível via filtro
7. Admin cadastra feriado → aparece em vermelho no calendário

**Critérios de aceite:**
- [ ] Todos os fluxos acima funcionam end-to-end sem erros
- [ ] Nenhum dado de um usuário vaza para outro (testar RLS)
- [ ] PDF gerado corretamente em todos os testes

---

## Pacotes npm Relevantes

| Pacote | Uso |
|--------|-----|
| `@supabase/supabase-js` | Cliente Supabase |
| `@supabase/ssr` | Supabase com SSR no Next.js |
| `@react-pdf/renderer` | Geração de PDF no servidor |
| `tailwindcss` | Estilização |
| `react-hook-form` | Formulários |
| `zod` | Validação de dados |

---

## Dicas para Dev Solo com Experiência Baixa

- **Comece pelo Admin (Etapa 5)** depois da fundação — é a tela mais simples e valida auth + DB
- **RLS separado para `pacientes_dados_clinicos`** — teste no SQL Editor antes de depender na aplicação
- **Código interno** — use uma sequence do PostgreSQL (`CREATE SEQUENCE`) com trigger; não gere no código
- **Calendário** — comece simples: uma lista de eventos ordenados por data; adicione a visualização visual depois
- **Notificações de ALTA** — implemente como query simples (`SELECT * FROM notificacoes WHERE destinatario_id = $1 AND lida = false`), sem websocket nesta versão
- **PDF é a parte mais difícil** — deixe para a Etapa 8 quando o restante já estiver estável
- **Não construa componentes genéricos antes de precisar** — faça funcionar, depois refatore
