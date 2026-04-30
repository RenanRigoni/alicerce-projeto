> ⚠️ **Documento histórico — planejamento legado (Bloco 1).** Este spec foi escrito antes da implementação atual. O conteúdo é mantido para rastreio de decisões de design, mas pode divergir do código em produção. Para o estado real do sistema, consulte `README.md` e `docs/DOCUMENTACAO_RESUMIDA.md`.

---

# Alicerce Espaço Terapêutico — Portal do Paciente (Bloco 1)

**Data:** 2026-04-11 (atualizado 2026-04-11)
**Cliente:** Isabella Alvarenga de Oliveira Garcia — Alicerce Espaço Terapêutico Infantil  
**Escopo:** Bloco 1 de 3 — Portal do Paciente (web platform)

---

## 1. Contexto e Problema

A clínica Alicerce opera atualmente com comunicação via WhatsApp, papel impresso e conversa presencial. O principal gargalo é a **demanda incessante dos pais por relatórios de avaliação e orientações**, que consome tempo da equipe e não tem um canal organizado.

**Objetivo central:** Dar às famílias acesso fácil, constante e organizado ao acompanhamento do filho, eliminando a dependência do WhatsApp para esse tipo de solicitação.

**Critério de sucesso (Isabella):** O acesso das famílias seja simplificado e constante.

---

## 2. Decomposição do Projeto

O sistema completo foi dividido em 3 blocos independentes:

| Bloco | Descrição | Status |
|-------|-----------|--------|
| **1 — Portal do Paciente** | Auth, área do paciente, relatórios, documentos, assinatura digital, calendário, fluxo de alta | **Este spec** |
| 2 — Comunicação & Notificações | WhatsApp, e-mails automáticos, notificações de novos comentários | Próximo ciclo |
| 3 — Gestão Interna & App Mobile | Evoluções internas, fluxo de aprovação, app iOS/Android | Futuro |

O Bloco 2 (WhatsApp) foi considerado essencial pela cliente, mas depende do Bloco 1 estar funcionando. O Bloco 3 foi explicitamente solicitado para evitar na V1.

---

## 3. Stack Técnica

| Camada | Tecnologia | Justificativa |
|--------|-----------|---------------|
| Frontend + API | **Next.js 14** (App Router) | Fullstack em um projeto, Server Components, fácil deploy |
| Auth + DB + Storage | **Supabase** | Auth multi-role nativa, PostgreSQL com RLS, Storage privado, free tier adequado para V1 |
| Deploy | **Vercel** | Free tier, CI/CD automático, HTTPS incluso |

**Segurança:** Row Level Security (RLS) no Supabase garante que cada usuário acessa apenas seus próprios dados diretamente no banco, sem depender de validação no código da aplicação.

**Arquivos:** PDFs e fotos são armazenados em buckets privados no Supabase Storage. O acesso se dá exclusivamente via URLs temporárias assinadas, nunca expostas publicamente.

---

## 4. Perfis de Acesso (Roles)

| Role | Capacidades gerais |
|------|-------------|
| **pai** | Ver perfil dos filhos vinculados; baixar relatórios (PDF); ver orientações; ver documentos liberados; curtir/comentar relatórios; ver calendário de agendamentos do filho |
| **terapeuta** | Ver pacientes vinculados (ativos por padrão); criar e publicar relatórios; upload de documentos; assinar digitalmente; editar dados clínicos; solicitar ALTA de paciente; calendário pessoal de agendamentos |
| **recepcao** | Cadastrar e editar pacientes (dados gerais); criar contas; vincular pais ↔ paciente ↔ terapeuta; publicar comunicados; gerenciar agendamentos; desativar usuários; reativar pacientes |
| **admin** | Tudo acima + gestão de todos os usuários + log de auditoria + configurações + aprovar/recusar ALTA + reativar pacientes |

### Matriz de permissões — Edição do Cadastro do Paciente

| Ação | Admin | Recepcao | Terapeuta | Pai |
|------|-------|----------|-----------|-----|
| Editar dados gerais (nome, nascimento, foto, CPF, etc.) | ✅ | ✅ | ✅ | ❌ |
| Editar responsáveis e contatos | ✅ | ✅ | ✅ | ❌ |
| Editar dados administrativos (frequência, convênio, turno) | ✅ | ✅ | ❌ | ❌ |
| Editar dados clínicos (diagnóstico, plano, metas, etc.) | ❌ | ❌ | ✅ | ❌ |
| Desativar paciente (motivo não-ALTA) | ✅ | ✅ | ❌ | ❌ |
| Solicitar ALTA do paciente | ❌ | ❌ | ✅ | ❌ |
| Aprovar/recusar ALTA | ✅ | ❌ | ❌ | ❌ |
| Reativar paciente | ✅ | ✅ | ❌ | ❌ |
| Criar agendamentos | ✅ | ✅ | ❌ | ❌ |

---

## 5. Status de Pacientes

### Tipos de Status

| Status | Código | Quem aciona | Descrição |
|--------|--------|-------------|-----------|
| **Ativo** | `ativo` | Sistema (padrão) | Paciente em tratamento regular |
| **Alta** | `alta` | Terapeuta (solicita) → Admin (aprova) | Paciente atingiu objetivos e recebeu alta formal |
| **Desativado** | `desativado` | Admin ou Recepcao | Paciente encerrou atendimento por qualquer outro motivo (inadimplência, desistência, mudança, etc.) |

### Fluxo de ALTA

1. Terapeuta acessa o perfil do paciente → aciona "Solicitar Alta"
2. Preenche obrigatoriamente os motivos da alta e um resumo do progresso
3. Admin recebe **notificação no painel** informando a solicitação
4. Admin abre o relatório de alta e tem duas opções:
   - **ACEITAR:** paciente passa para status `alta`; terapeuta é notificada da aprovação
   - **RECUSAR:** admin preenche obrigatoriamente os motivos da recusa; terapeuta recebe os motivos sem possibilidade de réplica no sistema (tratativa posterior em reunião presencial)
5. Em caso de recusa, paciente permanece `ativo`

### Comportamento de Pacientes Inativos (alta ou desativado)

- **Dashboard (terapeuta, admin, recepcao):** exibe somente pacientes `ativos` por padrão
- **Relatórios, documentos e qualquer listagem:** exibe somente `ativos` por padrão
- **Filtro "Mostrar inativos":** disponível em qualquer listagem para tornar inativos visíveis
- **Acesso ao histórico:** paciente inativo ainda tem ficha completa acessível via filtro — relatórios, documentos, evolução, etc. permanecem íntegros
- **Reativação:** somente Admin ou Recepcao podem reativar um paciente inativo

---

## 6. Estrutura de Páginas

### Pública
- `/login` — autenticação por e-mail e senha
- `/recuperar-senha` — reset via Supabase Auth

### Pais — `/portal`
- `/portal/dashboard` — cartões dos filhos + widget de próximos agendamentos
- `/portal/paciente/[id]` — perfil com 6 abas: Relatórios | Documentos | Orientações | Calendário | Histórico | Dados Gerais (leitura)
- `/portal/paciente/[id]/relatorio/[id]` — visualização, download PDF, curtida/comentário
- `/portal/paciente/[id]/upload` — envio de arquivo pela família

### Terapeuta — `/terapia`
- `/terapia/dashboard` — calendário pessoal (semanal/mensal) + lista de pacientes ativos
- `/terapia/paciente/[id]` — perfil com 6 abas (ver abaixo)
- `/terapia/paciente/[id]/novo-relatorio` — formulário em 5 seções
- `/terapia/paciente/[id]/novo-documento` — upload de arquivo
- `/terapia/paciente/[id]/solicitar-alta` — formulário de solicitação de alta

### Admin + Recepção — `/admin`
- `/admin/dashboard` — visão geral + **painel de notificações** (solicitações de alta pendentes)
- `/admin/pacientes` — lista (apenas ativos por padrão, filtro para inativos)
- `/admin/pacientes/novo` — cadastro de novo paciente (dados gerais)
- `/admin/pacientes/[id]` — perfil completo com 6 abas
- `/admin/usuarios` — criação e gerenciamento de contas
- `/admin/agendamentos` — criação e gestão de agendamentos para todas as terapeutas
- `/admin/agendamentos/novo` — novo agendamento
- `/admin/feriados` — cadastro de feriados no calendário geral
- `/admin/comunicados` — publicação de comunicados
- `/admin/auditoria` — log de ações por usuário
- `/admin/alta/[solicitacaoId]` — revisão de solicitação de alta (aprovar ou recusar)

### Perfil do Paciente — 6 Abas (terapeuta, admin, recepcao)

| Aba | Conteúdo | Quem edita |
|-----|----------|------------|
| **1 — Dados Gerais** | Nome, nascimento, sexo, foto, CPF, código interno, dados administrativos (frequência, convênio, turno, profissional, data início), status | Recepcao / Admin |
| **2 — Responsáveis** | Responsável principal e secundários, contatos, endereço | Recepcao / Admin / Terapeuta |
| **3 — Dados Clínicos** | Hipótese diagnóstica, objetivos, plano terapêutico, demandas, metas, observações, estratégias, dados complementares | Terapeuta |
| **4 — Relatórios e Documentos** | PDFs, avaliações, devolutivas, anexos | Terapeuta (upload) |
| **5 — Orientações para Casa** | Conteúdos e recomendações | Terapeuta |
| **6 — Histórico** | Linha do tempo de eventos (relatórios, documentos, agendamentos, alta) | Somente leitura |

---

## 7. Modelo de Dados

### `profiles`
Estende `auth.users` do Supabase.

| Campo | Tipo |
|-------|------|
| id | uuid (FK auth.users) |
| nome | text |
| role | enum: admin \| terapeuta \| recepcao \| pai |
| foto_url | text |
| ativo | boolean (default: true) |
| criado_em | timestamp |

### `responsaveis_detalhes`
Dados complementares para usuários com role=`pai`.

| Campo | Tipo |
|-------|------|
| id | uuid (FK profiles) |
| endereco | text |
| cidade | text |
| cep | text |
| telefone_principal | text |

### `pacientes`

| Campo | Tipo | Observação |
|-------|------|------------|
| id | uuid | |
| codigo_interno | text | Gerado automaticamente: 001, 002, ... |
| nome | text | **Obrigatório** |
| foto_url | text | |
| data_nascimento | date | |
| sexo | enum: masculino \| feminino \| outro | |
| cpf | text | |
| status | enum: ativo \| alta \| desativado | default: ativo |
| motivo_desativacao | text | Preenchido ao desativar (não-ALTA) |
| data_inicio | timestamp | Auto: data de criação do cadastro |
| frequencia_atendimento | text | Ex: "2x por semana" |
| dias_horarios_atendimento | text | Ex: "Seg 14h, Qua 15h" |
| turno_preferencia | enum: manha \| tarde \| qualquer | |
| convenio_ou_particular | enum: convenio \| particular | |
| criado_em | timestamp | |
| atualizado_em | timestamp | |

### `pacientes_dados_clinicos`
Preenchida exclusivamente pela terapeuta.

| Campo | Tipo |
|-------|------|
| paciente_id | uuid (FK pacientes, único) |
| hipotese_diagnostica | text |
| diagnostico | text |
| objetivos_terapeuticos | text |
| plano_terapeutico | text |
| demandas_prioritarias | text |
| data_avaliacao_inicial | date |
| obs_clinicas_gerais | text |
| estrategias_utilizadas | text |
| orientacoes_para_casa | text |
| evolucao_resumida | text |
| metas_curto_prazo | text |
| metas_medio_prazo | text |
| sensibilidades_restricoes | text |
| nivel_suporte | text |
| obs_comportamento_regulacao | text |
| informacoes_escolares | text |
| pontos_atencao_equipe | text |
| atualizado_em | timestamp |
| atualizado_por | uuid (FK profiles) |

### `paciente_responsaveis` (junction)

| Campo | Tipo |
|-------|------|
| paciente_id | FK pacientes |
| responsavel_id | FK profiles (role=pai) |
| tipo | enum: principal \| secundario |

### `paciente_terapeutas` (junction)

| Campo | Tipo |
|-------|------|
| paciente_id | FK pacientes |
| terapeuta_id | FK profiles (role=terapeuta) |

### `relatorios`

| Campo | Tipo |
|-------|------|
| id | uuid |
| paciente_id | FK pacientes |
| terapeuta_id | FK profiles |
| identificacao | text |
| obs_clinicas | text |
| testes | text |
| resultado_discussao | text |
| conclusao | text |
| status | enum: rascunho \| publicado |
| assinatura_digital | text (nome + timestamp + hash) |
| assinado_em | timestamp |
| pdf_url | text (Supabase Storage) |
| publicado_em | timestamp |
| criado_em | timestamp |

### `documentos`

| Campo | Tipo |
|-------|------|
| id | uuid |
| paciente_id | FK pacientes |
| enviado_por | FK profiles |
| tipo | enum: foto \| pdf \| video \| outro |
| descricao | text |
| arquivo_url | text (Supabase Storage) |
| visivel_pais | boolean (default: true) |
| criado_em | timestamp |

### `orientacoes`

| Campo | Tipo |
|-------|------|
| id | uuid |
| paciente_id | FK pacientes |
| terapeuta_id | FK profiles |
| titulo | text |
| conteudo | text |
| criado_em | timestamp |

### `solicitacoes_alta`

| Campo | Tipo |
|-------|------|
| id | uuid |
| paciente_id | FK pacientes |
| solicitado_por | FK profiles (role=terapeuta) |
| motivo | text (obrigatório) |
| status | enum: pendente \| aceita \| recusada |
| resposta_admin | text (preenchido ao recusar) |
| respondido_por | FK profiles (role=admin) |
| criado_em | timestamp |
| respondido_em | timestamp |

### `agendamentos`
Criados pela Recepcao ou Admin.

| Campo | Tipo |
|-------|------|
| id | uuid |
| paciente_id | FK pacientes (nullable para eventos gerais) |
| terapeuta_id | FK profiles (role=terapeuta) |
| criado_por | FK profiles (role=recepcao ou admin) |
| tipo | enum: sessao \| devolutiva \| reuniao \| outro |
| titulo | text |
| motivo | text (visível à terapeuta na agenda) |
| data_hora | timestamp |
| duracao_minutos | int |
| visivel_responsavel | boolean (default: true) |
| criado_em | timestamp |

### `feriados`
Visíveis em vermelho no calendário de terapeutas e responsáveis.

| Campo | Tipo |
|-------|------|
| id | uuid |
| data | date |
| descricao | text |
| criado_por | FK profiles (role=admin ou recepcao) |
| criado_em | timestamp |

### `notificacoes`

| Campo | Tipo |
|-------|------|
| id | uuid |
| destinatario_id | FK profiles |
| tipo | enum: solicitacao_alta \| alta_aceita \| alta_recusada |
| ref_id | uuid (ID da solicitacao_alta) |
| lida | boolean (default: false) |
| criado_em | timestamp |

### `comunicados`

| Campo | Tipo |
|-------|------|
| id | uuid |
| criado_por | FK profiles |
| titulo | text |
| conteudo | text |
| criado_em | timestamp |

### `comentarios`

| Campo | Tipo |
|-------|------|
| id | uuid |
| ref_tipo | enum: relatorio \| documento |
| ref_id | uuid |
| autor_id | FK profiles |
| conteudo | text |
| criado_em | timestamp |

### `audit_logs`

| Campo | Tipo |
|-------|------|
| id | uuid |
| usuario_id | FK profiles |
| acao | enum: visualizou \| enviou \| alterou \| assinou \| baixou \| desativou \| reativou \| solicitou_alta \| aprovou_alta \| recusou_alta |
| recurso_tipo | text |
| recurso_id | uuid |
| criado_em | timestamp |

---

## 8. Fluxos Principais

### Terapeuta publica relatório
1. Login → dashboard → seleciona paciente (apenas ativos)
2. Cria novo relatório → preenche as 5 seções → salva como rascunho
3. Revisão → assina digitalmente (nome + confirmação gera hash)
4. Publica → status muda para `publicado` → PDF gerado e salvo no Storage
5. *(Bloco 2)* Pais recebem notificação via WhatsApp

### Pai acessa relatório do filho
1. Login → dashboard → cartão do filho + próximos agendamentos
2. Perfil do paciente → aba Relatórios
3. Abre relatório → lê no portal ou faz download do PDF
4. Opcionalmente: curtida ou comentário
5. Ação registrada automaticamente no `audit_logs`

### Admin/Recepção cadastra novo paciente
1. Preenche Aba 1 — Dados Gerais (somente nome é obrigatório; `codigo_interno` e `data_inicio` gerados automaticamente)
2. Cria conta(s) dos pais no Supabase Auth com role `pai`
3. Vincula pais ↔ paciente em `paciente_responsaveis` (principal/secundário)
4. Vincula terapeuta ↔ paciente em `paciente_terapeutas`
5. Terapeuta preenche Aba 3 — Dados Clínicos quando disponível
6. Portal já fica disponível para o terapeuta e os pais

### Fluxo de ALTA
1. Terapeuta acessa perfil do paciente → "Solicitar Alta" → preenche motivos obrigatórios
2. Sistema cria registro em `solicitacoes_alta` (status=pendente) e notificação para Admin
3. Admin vê badge de pendência no dashboard → abre `/admin/alta/[id]` → lê motivos
4. **Aceitar:** admin confirma → paciente muda para status `alta` → terapeuta recebe notificação de aprovação
5. **Recusar:** admin preenche motivos da recusa → terapeuta recebe notificação com os motivos → sem réplica no sistema

### Recepção cria agendamento
1. Recepcao acessa `/admin/agendamentos/novo`
2. Seleciona terapeuta, paciente, tipo, data/hora, duração, motivo
3. Define se o agendamento é visível para o responsável
4. Agendamento aparece: no calendário da terapeuta (com motivo); no dashboard do responsável (se `visivel_responsavel=true`)

### Desativação de paciente (não-ALTA)
1. Admin ou Recepcao acessa perfil do paciente → "Desativar paciente"
2. Preenche obrigatoriamente o motivo
3. Paciente muda para status `desativado`; desaparece das listagens padrão
4. Histórico completo permanece acessível via filtro "Mostrar inativos"
5. Ação registrada no `audit_logs`

---

## 9. Calendário

### Visão da Terapeuta
- Dashboard mostra calendário pessoal com os agendamentos criados para ela pela Recepcao/Admin
- Alternância entre visualização **Semanal** e **Mensal**
- Dia atual destacado visualmente
- Cada evento exibe: paciente, tipo de agendamento, horário, motivo
- Feriados aparecem em vermelho

### Visão do Responsável
- Dashboard mostra widget com os próximos agendamentos do filho (`visivel_responsavel=true`)
- Tipos visíveis: sessão, devolutiva, reunião ou qualquer outro que a recepção marque como visível
- Feriados aparecem em vermelho

### Visão Admin/Recepcao
- Acesso à agenda de cada terapeuta para criar, editar ou remover agendamentos
- Cadastro de feriados em `/admin/feriados` — ficam vermelhos para todos

---

## 10. Identidade Visual

A clínica possui identidade visual completa (logotipo, paleta de cores, tipografia, manual de marca, Instagram padronizado). O designer deve seguir o manual de marca.

**Diretrizes derivadas do logo e do questionário:**
- Paleta: tons pastéis quentes — rosa, pêssego, azul bebê, lilás, verde menta
- Tom: acolhedor e delicado (não infantil/lúdico, não técnico formal)
- Evitar: cores escuras, tipografia formal/serifada pesada
- Texto: sempre escuro sobre fundo claro para garantir contraste adequado
- Palavras-chave da marca: Acolhimento, Confiança, Profissionalismo, Segurança, Humanização

**Referência visual:** Instagram da clínica (@alicerce, a confirmar).

---

## 11. Decisões Técnicas Notáveis

- **Assinatura digital (V1):** Nome do terapeuta + timestamp + hash SHA-256 do conteúdo do relatório. Não é assinatura ICP-Brasil. Suficiente para o uso prático da clínica nesta versão.
- **Geração de PDF:** No servidor (Next.js API Route) usando `@react-pdf/renderer`, garantindo layout consistente.
- **Dados clínicos em tabela separada:** `pacientes_dados_clinicos` é uma tabela separada de `pacientes` para que as políticas de RLS possam ser aplicadas diferenciadamente — Recepcao não tem acesso de escrita a essa tabela.
- **Código interno do paciente:** Gerado via sequence/trigger no PostgreSQL, garantindo unicidade sem condição de corrida.
- **Notificações de ALTA:** Implementadas como registros em `notificacoes`, consultados no load do dashboard do admin (sem websocket nesta versão).
- **Evoluções internas:** Ficam ocultas dos pais por padrão (`visivel_pais = false`).
- **Mobile-first:** Interface projetada prioritariamente para celular, pois os pais acessam principalmente por esse dispositivo.
- **Sem integrações externas no Bloco 1:** WhatsApp e e-mails ficam para o Bloco 2.

---

## 12. Fora do Escopo (Bloco 1)

- Notificações via WhatsApp → Bloco 2
- E-mails automáticos → Bloco 2
- Registro de evoluções internas (diferente de relatórios) → Bloco 3
- Fluxo de aprovação de conteúdo → Bloco 3
- Materiais educativos / biblioteca de conteúdo → Bloco 3
- Aplicativo mobile (iOS/Android) → Bloco 3
