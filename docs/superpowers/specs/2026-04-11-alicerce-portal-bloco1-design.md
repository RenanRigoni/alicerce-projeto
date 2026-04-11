# Alicerce Espaço Terapêutico — Portal do Paciente (Bloco 1)

**Data:** 2026-04-11  
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
| **1 — Portal do Paciente** | Auth, área do paciente, relatórios, documentos, assinatura digital | **Este spec** |
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

| Role | Capacidades |
|------|-------------|
| **pai** | Ver perfil dos filhos vinculados; baixar relatórios (PDF); ver orientações para casa; anexar arquivos; curtir/comentar relatórios |
| **terapeuta** | Ver pacientes vinculados; criar e publicar relatórios; upload de documentos e fotos; assinar digitalmente |
| **recepcao** | Cadastrar pacientes; criar contas de pais; vincular pais ↔ paciente ↔ terapeuta; publicar comunicados |
| **admin** | Tudo acima + gestão de todos os usuários + visualização do log de auditoria + configurações |

---

## 5. Estrutura de Páginas

### Pública
- `/login` — autenticação por e-mail e senha
- `/recuperar-senha` — reset via Supabase Auth

### Pais — `/portal`
- `/portal/dashboard` — cartões dos filhos cadastrados
- `/portal/paciente/[id]` — perfil completo com 4 abas: Relatórios | Documentos | Orientações | Histórico
- `/portal/paciente/[id]/relatorio/[id]` — visualização do relatório, download PDF, curtida/comentário
- `/portal/paciente/[id]/upload` — envio de arquivo pela família

### Terapeuta — `/terapia`
- `/terapia/dashboard` — lista de pacientes vinculados
- `/terapia/paciente/[id]` — perfil com ações disponíveis
- `/terapia/paciente/[id]/novo-relatorio` — formulário estruturado em 5 seções
- `/terapia/paciente/[id]/novo-documento` — upload de arquivo (PDF, foto, vídeo)

### Admin + Recepção — `/admin`
- `/admin/dashboard` — visão geral da clínica
- `/admin/pacientes` — lista, criação e edição de pacientes
- `/admin/usuarios` — criação e gerenciamento de contas
- `/admin/comunicados` — publicação de comunicados para todos os pais
- `/admin/auditoria` — log de ações por usuário

---

## 6. Modelo de Dados

### `profiles`
Estende `auth.users` do Supabase.

| Campo | Tipo |
|-------|------|
| id | uuid (FK auth.users) |
| nome | text |
| role | enum: admin \| terapeuta \| recepcao \| pai |
| foto_url | text |
| criado_em | timestamp |

### `pacientes`

| Campo | Tipo |
|-------|------|
| id | uuid |
| nome | text |
| foto_url | text |
| data_nascimento | date |
| diagnostico | text |
| plano_terapeutico | text |
| frequencia_atendimento | text |
| criado_em | timestamp |

### `paciente_responsaveis` (junction)
| Campo | Tipo |
|-------|------|
| paciente_id | FK pacientes |
| responsavel_id | FK profiles (role=pai) |

### `paciente_terapeutas` (junction)
| Campo | Tipo |
|-------|------|
| paciente_id | FK pacientes |
| terapeuta_id | FK profiles (role=terapeuta) |

### `relatorios`
Estrutura baseada no padrão da clínica: identificação → observações clínicas → testes → resultado/discussão → conclusão.

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
| visivel_pais | boolean (default: true; evoluções internas = false) |
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
| acao | enum: visualizou \| enviou \| alterou \| assinou \| baixou |
| recurso_tipo | text |
| recurso_id | uuid |
| criado_em | timestamp |

---

## 7. Fluxos Principais

### Terapeuta publica relatório
1. Login → dashboard → seleciona paciente
2. Cria novo relatório → preenche as 5 seções → salva como rascunho
3. Revisão → assina digitalmente (nome + confirmação gera hash)
4. Publica → status muda para `publicado` → PDF gerado e salvo no Storage
5. *(Bloco 2)* Pais recebem notificação via WhatsApp

### Pai acessa relatório do filho
1. Login → dashboard → cartão do filho
2. Perfil do paciente → aba Relatórios
3. Abre relatório → lê no portal ou faz download do PDF
4. Opcionalmente: curtida ou comentário
5. Ação registrada automaticamente no `audit_logs`

### Admin/Recepção cadastra novo paciente
1. Cria registro do paciente com informações clínicas
2. Cria conta(s) dos pais no Supabase Auth com role `pai`
3. Vincula pais ↔ paciente em `paciente_responsaveis`
4. Vincula terapeuta ↔ paciente em `paciente_terapeutas`
5. Portal já fica disponível para o terapeuta e os pais

---

## 8. Identidade Visual

A clínica possui identidade visual completa (logotipo, paleta de cores, tipografia, manual de marca, Instagram padronizado). O designer deve seguir o manual de marca.

**Diretrizes derivadas do logo e do questionário:**
- Paleta: tons pastéis quentes — rosa, pêssego, azul bebê, lilás, verde menta
- Tom: acolhedor e delicado (não infantil/lúdico, não técnico formal)
- Evitar: cores escuras, tipografia formal/serifada pesada
- Texto: sempre escuro sobre fundo claro para garantir contraste adequado
- Palavras-chave da marca: Acolhimento, Confiança, Profissionalismo, Segurança, Humanização

**Referência visual:** Instagram da clínica (@alicerce, a confirmar).

---

## 9. Decisões Técnicas Notáveis

- **Assinatura digital (V1):** Implementada como nome do terapeuta + timestamp + hash SHA-256 do conteúdo do relatório, armazenado na tabela `relatorios`. Não é assinatura ICP-Brasil. Suficiente para o uso prático da clínica nesta versão.
- **Geração de PDF:** Será feita no servidor (Next.js API Route) usando `@react-pdf/renderer` ou `pdfmake`, garantindo layout consistente e independente de impressão do navegador.
- **Evoluções internas:** Ficam ocultas dos pais por padrão (`visivel_pais = false`). Visíveis apenas se solicitado explicitamente.
- **Mobile-first:** Interface projetada prioritariamente para celular, pois os pais acessam principalmente por esse dispositivo.
- **Sem integrações externas no Bloco 1:** A clínica não usa sistema legado que precise ser integrado. WhatsApp fica para o Bloco 2.

---

## 10. Fora do Escopo (Bloco 1)

- Notificações via WhatsApp → Bloco 2
- E-mails automáticos → Bloco 2
- Registro de evoluções internas (diferente de relatórios) → Bloco 3
- Fluxo de aprovação de conteúdo → Bloco 3
- Materiais educativos / biblioteca de conteúdo → Bloco 3
- Aplicativo mobile (iOS/Android) → Bloco 3
