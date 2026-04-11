# Alicerce — Plano de Implementação (Bloco 1)

**Spec:** `2026-04-11-alicerce-portal-bloco1-design.md`  
**Stack:** Next.js 14 (App Router) + Supabase + Vercel  
**Dev:** Solo

---

## Resumo

| Métrica | Valor |
|---------|-------|
| Total de etapas | 9 |
| Ondas de execução | 4 |
| Complexidade geral | Média |
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
| 6 | Área Terapeuta — criar e publicar relatórios | 5 | Alto |
| 7 | Geração de PDF e assinatura digital | 6 | Alto |
| 8 | Área Pais — portal de acesso | 5, 6, 7 | Baixo |
| 9 | Auditoria, comunicados e ajustes finais | 8 | Baixo |

---

## Ondas de Execução

### Onda 1 — Fundação (sequencial obrigatório)
Etapas 1, 2, 3 devem ser feitas nessa ordem. Nada funciona sem essa base.

### Onda 2 — Base visual (paralelo possível após Onda 1)
Etapa 4 (layout) pode começar junto com Etapa 5 (Admin), pois o Admin é a tela mais simples e serve para validar auth e DB.

### Onda 3 — Core do produto (sequencial)
Etapas 6 e 7 são o coração do sistema. Relatório → PDF → Assinatura. Alta complexidade, fazer com calma.

### Onda 4 — Entrega final (após Onda 3)
Etapas 8 e 9: área dos pais e polimento. Com relatórios funcionando, a área dos pais é basicamente leitura.

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
1. Executar migration no SQL Editor do Supabase criando as tabelas na ordem correta (respeitando FKs):
   - `profiles` → `pacientes` → `paciente_responsaveis` → `paciente_terapeutas` → `relatorios` → `documentos` → `orientacoes` → `comunicados` → `comentarios` → `audit_logs`
2. Criar tipo enum para `role` em profiles: `admin | terapeuta | recepcao | pai`
3. Criar trigger para inserir em `profiles` automaticamente ao criar usuário no `auth.users`
4. Criar políticas RLS para cada tabela:
   - `pacientes`: pai vê apenas os vinculados em `paciente_responsaveis`; terapeuta vê apenas os vinculados em `paciente_terapeutas`; admin/recepcao veem todos
   - `relatorios`: pai vê apenas os publicados dos seus pacientes; terapeuta gerencia os dos seus pacientes; admin vê todos
   - `documentos`: respeita `visivel_pais` e vínculos de paciente
   - demais tabelas: políticas analogamente restritivas
5. Criar buckets privados no Supabase Storage: `relatorios-pdf`, `documentos`, `fotos-pacientes`
6. Criar políticas de Storage alinhadas com RLS do banco

**Arquivo sugerido:** `supabase/migrations/001_initial_schema.sql`

**Critérios de aceite:**
- [ ] Todas as tabelas criadas
- [ ] Trigger de `profiles` funcionando (criar usuário → profile criado automaticamente)
- [ ] RLS habilitado em todas as tabelas
- [ ] Buckets criados como privados

---

### Etapa 3 — Autenticação e Middleware de Roles

**Objetivo:** Login funcionando com redirecionamento por role.

**Passos:**
1. Criar página `/login` com formulário de e-mail + senha usando Supabase Auth
2. Criar página `/recuperar-senha`
3. Criar `middleware.ts` na raiz do projeto:
   - Rotas `/portal/*` → exige role `pai`
   - Rotas `/terapia/*` → exige role `terapeuta`
   - Rotas `/admin/*` → exige role `admin` ou `recepcao`
   - Usuário não autenticado → redireciona para `/login`
4. Criar helper `lib/auth/get-user-role.ts` que lê o `role` da tabela `profiles`
5. Após login bem-sucedido: redirecionar para dashboard correto baseado no role

**Arquivos a criar:**
- `app/(auth)/login/page.tsx`
- `app/(auth)/recuperar-senha/page.tsx`
- `middleware.ts`
- `lib/auth/get-user-role.ts`

**Critérios de aceite:**
- [ ] Login funciona com e-mail/senha
- [ ] Pai redirecionado para `/portal/dashboard`
- [ ] Terapeuta redirecionado para `/terapia/dashboard`
- [ ] Admin/recepção redirecionado para `/admin/dashboard`
- [ ] Acesso não autorizado a rota redireciona para `/login`

---

### Etapa 4 — Layout Base e Componentes Compartilhados

**Objetivo:** Estrutura visual reutilizável, mobile-first, com identidade da Alicerce.

**Passos:**
1. Configurar paleta de cores da Alicerce no `tailwind.config.ts`:
   - Rosa, pêssego, azul bebê, lilás, verde menta (extrair do manual de marca quando disponível; usar logo como referência por ora)
   - Regra: texto sempre escuro (`#2d2d2d`) sobre fundo pastel
2. Configurar tipografia (quando o manual de marca estiver disponível)
3. Criar componentes base:
   - `components/ui/Button.tsx`
   - `components/ui/Card.tsx`
   - `components/ui/Avatar.tsx`
   - `components/ui/Tabs.tsx`
   - `components/ui/Badge.tsx`
   - `components/layout/Navbar.tsx` (diferente por role)
   - `components/layout/PageWrapper.tsx`
4. Criar layouts por grupo de rotas:
   - `app/(portal)/layout.tsx` — navbar dos pais
   - `app/(terapia)/layout.tsx` — navbar dos terapeutas
   - `app/(admin)/layout.tsx` — navbar do admin

**Critérios de aceite:**
- [ ] Componentes renderizam sem erros
- [ ] Layout responsivo (testar em 375px e 1280px)
- [ ] Contraste de texto adequado em todos os fundos pastéis

---

### Etapa 5 — Área Admin: Gestão de Pacientes e Usuários

**Objetivo:** Admin/recepção consegue cadastrar pacientes e criar contas.

**Passos:**
1. `/admin/dashboard` — cards com totais: pacientes, terapeutas, pais cadastrados
2. `/admin/pacientes` — listagem + botão "Novo paciente"
3. Formulário de criação de paciente: nome, data de nascimento, foto, diagnóstico, plano terapêutico, frequência
4. `/admin/usuarios` — listagem de usuários com role
5. Formulário de criação de usuário: nome, e-mail, role (pai/terapeuta/recepcao)
   - Usa `supabase.auth.admin.createUser()` via API Route (requer `SUPABASE_SERVICE_ROLE_KEY`)
   - Após criar usuário, vincula automaticamente ao paciente se role=pai ou terapeuta
6. `/admin/comunicados` — criar e listar comunicados (texto simples)

**Arquivos a criar:**
- `app/(admin)/admin/dashboard/page.tsx`
- `app/(admin)/admin/pacientes/page.tsx`
- `app/(admin)/admin/pacientes/novo/page.tsx`
- `app/(admin)/admin/usuarios/page.tsx`
- `app/(admin)/admin/usuarios/novo/page.tsx`
- `app/(admin)/admin/comunicados/page.tsx`
- `app/api/admin/criar-usuario/route.ts`

**Critérios de aceite:**
- [ ] Admin cria paciente e aparece na listagem
- [ ] Admin cria usuário com role `pai` e vincula ao paciente
- [ ] Admin cria usuário com role `terapeuta` e vincula ao paciente
- [ ] Pais criados conseguem fazer login

---

### Etapa 6 — Área Terapeuta: Criar e Publicar Relatórios

**Objetivo:** Terapeuta preenche relatório estruturado e publica para o(s) pai(s).

**Passos:**
1. `/terapia/dashboard` — lista dos pacientes vinculados ao terapeuta logado
2. `/terapia/paciente/[id]` — perfil do paciente com lista de relatórios e botão "Novo relatório"
3. `/terapia/paciente/[id]/novo-relatorio` — formulário multi-seção:
   - Seção 1: Identificação
   - Seção 2: Observações Clínicas
   - Seção 3: Testes Aplicados
   - Seção 4: Resultado e Discussão
   - Seção 5: Conclusão
   - Botão "Salvar rascunho" (status=rascunho) e "Publicar" (abre modal de assinatura)
4. Modal de assinatura: exibe nome do terapeuta, solicita confirmação, gera hash SHA-256 do conteúdo
5. Ao publicar: salva `assinatura_digital`, `assinado_em`, `publicado_em`, muda `status` para `publicado`
6. `/terapia/paciente/[id]/novo-documento` — upload de arquivo com tipo e descrição

**Arquivos a criar:**
- `app/(terapia)/terapia/dashboard/page.tsx`
- `app/(terapia)/terapia/paciente/[id]/page.tsx`
- `app/(terapia)/terapia/paciente/[id]/novo-relatorio/page.tsx`
- `app/(terapia)/terapia/paciente/[id]/novo-documento/page.tsx`
- `components/relatorio/FormularioRelatorio.tsx`
- `components/relatorio/ModalAssinatura.tsx`
- `lib/relatorio/gerar-hash.ts`

**Critérios de aceite:**
- [ ] Terapeuta vê apenas seus pacientes
- [ ] Rascunho salvo não aparece para os pais
- [ ] Publicação exige confirmação de assinatura
- [ ] Relatório publicado aparece na área dos pais
- [ ] Upload de documento funciona para PDF, imagem e vídeo

---

### Etapa 7 — Geração de PDF

**Objetivo:** Relatório publicado gera um PDF bem formatado, disponível para download.

**Passos:**
1. Instalar `@react-pdf/renderer`
2. Criar template de PDF: `lib/pdf/template-relatorio.tsx`
   - Cabeçalho: logo da clínica + nome do paciente + data
   - 5 seções do relatório
   - Rodapé: assinatura digital (nome + data/hora + hash)
3. Criar API Route: `app/api/relatorio/[id]/pdf/route.ts`
   - Recebe `id` do relatório
   - Verifica permissão (só o terapeuta dono ou admin)
   - Gera PDF com `@react-pdf/renderer`
   - Salva no Supabase Storage (`relatorios-pdf/{id}.pdf`)
   - Atualiza `pdf_url` na tabela `relatorios`
   - Retorna URL assinada temporária para download
4. Acionar geração de PDF automaticamente ao publicar relatório (chamar API Route no submit)

**Arquivos a criar:**
- `lib/pdf/template-relatorio.tsx`
- `app/api/relatorio/[id]/pdf/route.ts`

**Critérios de aceite:**
- [ ] PDF gerado ao publicar relatório
- [ ] PDF contém todas as seções e dados de assinatura
- [ ] Download funciona para terapeuta e para os pais
- [ ] URL do PDF é privada (acesso via URL assinada, não direta)

---

### Etapa 8 — Área Pais: Portal de Acesso

**Objetivo:** Pais acessam tudo do acompanhamento do filho de forma simples.

**Passos:**
1. `/portal/dashboard` — cartão(ões) do(s) filho(s) com foto, nome e último relatório
2. `/portal/paciente/[id]` — perfil completo com 4 abas:
   - **Relatórios:** lista de relatórios publicados, botão de download PDF
   - **Documentos:** arquivos com `visivel_pais=true`
   - **Orientações:** lista de orientações para casa
   - **Histórico:** linha do tempo de eventos (relatórios, documentos, orientações)
3. `/portal/paciente/[id]/relatorio/[id]` — leitura do relatório + curtida + caixa de comentário
4. `/portal/paciente/[id]/upload` — envio de arquivo para a equipe
5. Registrar automaticamente em `audit_logs`: `visualizou` ao abrir relatório, `baixou` ao fazer download

**Arquivos a criar:**
- `app/(portal)/portal/dashboard/page.tsx`
- `app/(portal)/portal/paciente/[id]/page.tsx`
- `app/(portal)/portal/paciente/[id]/relatorio/[id]/page.tsx`
- `app/(portal)/portal/paciente/[id]/upload/page.tsx`
- `components/portal/CardPaciente.tsx`
- `components/portal/TabsRelatorios.tsx`
- `lib/audit/registrar-acao.ts`

**Critérios de aceite:**
- [ ] Pai vê apenas os filhos vinculados
- [ ] Download de PDF funciona no celular
- [ ] Comentário aparece abaixo do relatório
- [ ] Curtida funciona (toggle)
- [ ] Ação de download registrada no audit_log

---

### Etapa 9 — Auditoria, Comunicados e Polimento

**Objetivo:** Fechar o escopo com log de auditoria, comunicados e qualidade geral.

**Passos:**
1. `/admin/auditoria` — tabela paginada com filtros por usuário, ação e data
2. Comunicados: aparecer no dashboard dos pais como card "Avisos da clínica"
3. Revisar responsividade de todas as telas no celular (375px)
4. Garantir estados de loading e erro em todos os formulários
5. Testar fluxo completo: admin cria paciente → terapeuta publica relatório → pai acessa e baixa PDF
6. Revisar contraste de cores em toda a aplicação

**Critérios de aceite:**
- [ ] Log de auditoria exibe ações com usuário e timestamp
- [ ] Comunicados aparecem para todos os pais no dashboard
- [ ] Fluxo completo funciona end-to-end
- [ ] Nenhuma tela quebra em mobile (375px)

---

## Pacotes npm Relevantes

| Pacote | Uso |
|--------|-----|
| `@supabase/supabase-js` | Cliente Supabase |
| `@supabase/ssr` | Supabase com SSR no Next.js |
| `@react-pdf/renderer` | Geração de PDF no servidor |
| `tailwindcss` | Estilização (já incluso no create-next-app) |
| `react-hook-form` | Formulários |
| `zod` | Validação de dados |

---

## Dicas para Dev Solo com Experiência Baixa

- **Comece pelo Admin (Etapa 5)** depois da fundação — é a tela mais simples e vai confirmar que auth + DB estão funcionando antes de partir para o complexo
- **Não construa componentes genéricos antes de precisar** — faça funcionar, depois refatore
- **Supabase tem excelente documentação** para Next.js App Router — use os guias oficiais como referência principal
- **RLS pode ser confuso no início** — teste cada política no SQL Editor do Supabase antes de depender dela na aplicação
- **PDF é a parte mais difícil** — deixe para a Etapa 7 quando o restante já estiver estável
