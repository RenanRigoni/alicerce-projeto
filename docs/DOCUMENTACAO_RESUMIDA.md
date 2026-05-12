# Documentação Resumida — Portal Alicerce

## Visão geral

Sistema web da **Alicerce Espaço Terapêutico Infantil** que centraliza cadastro, agenda, prontuário, relatórios, documentos e comunicação com famílias. Acesso separado por perfil; dados clínicos protegidos por RLS, hash de integridade SHA-256, audit log automático e CPF cifrado. O cadastro clínico aceita profissionais de múltiplas especialidades.

**Stack:** Next.js 16 (App Router) + Supabase (Postgres + Auth + Storage) + Vercel.

---

## Perfis de acesso

### Administração e recepção (`/admin/*`)
- Painel geral, cadastros, vínculos, agenda, feriados, comunicados, alta, usuários, auditoria.

### Profissionais clínicos (`/terapia/*`, role interno `terapeuta`)
- Apenas pacientes vinculados em `paciente_terapeutas`. Prontuário (dados clínicos, relatórios, documentos, orientações), agenda própria, registro/confirmação de alta. O cadastro exige tipo profissional e conselho correspondente.
- Tipos aceitos: Terapeuta Ocupacional, Fisioterapeuta, Fonoaudióloga, Psicóloga, Neuropsicóloga, Neuropsicopedagoga e Nutricionista.
- Conselhos exibidos conforme o tipo: CREFITO, CRFa, CRP, CBO ou CRN.

### Família / responsáveis (`/portal/*`)
- Apenas pacientes vinculados em `paciente_responsaveis`. Calendário, relatórios publicados, orientações, upload de documentos, solicitação de alta, edição de meus dados, exportação JSON dos dados pessoais.

---

## Rotas — telas

### Públicas (sem auth — liberadas no `proxy.ts`)
- `/login`
- `/recuperar-senha`
- `/privacidade` (política pública)

### `/admin` (role admin/recepção)
| Rota | Função |
|---|---|
| `/admin/dashboard` | Métricas (pacientes ativos, famílias, profissionais, relatórios recentes, feriados, comunicados) |
| `/admin/pacientes` | Lista de pacientes |
| `/admin/pacientes/novo` | Novo paciente |
| `/admin/pacientes/[id]` | Perfil do paciente |
| `/admin/pacientes/[id]/editar` | Edição |
| `/admin/pacientes/[id]/desativar` | Desativar |
| `/admin/pacientes/[id]/reativar` | Reativar |
| `/admin/responsaveis` | Lista de responsáveis |
| `/admin/terapeutas` | Lista de profissionais clínicos |
| `/admin/usuarios` | Gestão de usuários |
| `/admin/usuarios/novo` | Cria usuário; para profissional, Perfil vem primeiro e carrega tipo/conselho dinâmicos |
| `/admin/usuarios/[id]` | Detalhes + permissões granulares |
| `/admin/usuarios/[id]/editar` | Edição; para profissional, altera e-mail, CPF/CNPJ, tipo e conselho |
| `/admin/agendamentos` | Agenda geral |
| `/admin/agendamentos/novo` | Novo agendamento |
| `/admin/feriados` | Feriados |
| `/admin/comunicados` | Comunicados internos |
| `/admin/alta` | Visão geral de altas |
| `/admin/auditoria` | Log de auditoria (somente leitura) |

### `/terapia` (role interno `terapeuta`)
| Rota | Função |
|---|---|
| `/terapia/dashboard` | Próximos compromissos + pacientes vinculados |
| `/terapia/agenda` | Agenda própria |
| `/terapia/pacientes` | Pacientes vinculados |
| `/terapia/paciente/[id]` | Prontuário (dados clínicos, relatórios, documentos, orientações, alta) |
| `/terapia/paciente/[id]/editar` | Edita dados básicos |
| `/terapia/paciente/[id]/novo-relatorio` | Cria relatório (assinatura inclui conselho profissional dinâmico) |
| `/terapia/paciente/[id]/novo-documento` | Upload de documento |
| `/terapia/relatorio/[id]/editar` | Edita rascunho |
| `/terapia/alta/[id]` | Detalhe de alta |
| `/terapia/responsaveis` | Responsáveis vinculados |
| `/terapia/responsavel/[id]` | Detalhe |
| `/terapia/responsavel/[id]/editar` | Edita |

### `/portal` (role pai)
| Rota | Função |
|---|---|
| `/portal/dashboard` | Visão geral do paciente |
| `/portal/paciente/[id]` | Prontuário do filho (read-only para clínicos) |
| `/portal/paciente/[id]/upload` | Upload de documentos |
| `/portal/meus-dados` | Edição de dados próprios + exportação JSON (LGPD Art. 18) |

---

## Rotas — `app/api/*`

| Rota | Método | Quem pode |
|---|---|---|
| `/api/admin/criar-usuario` | POST | admin/recepção (cria via service role; valida tipo profissional e conselho) |
| `/api/usuario/[id]` | PATCH/DELETE | PATCH: admin/recepção edita dados de perfil/Auth; DELETE: admin (não permite auto-deleção) |
| `/api/usuario/[id]/ativo` | PATCH | admin |
| `/api/paciente` | POST | admin/recepção (cifra CPF na criação) |
| `/api/paciente/[id]/deletar` | DELETE | admin/recepção (bloqueia se houver QUALQUER registro clínico — COFFITO) |
| `/api/paciente/[id]/status` | PATCH | admin/recepção |
| `/api/vincular/paciente-responsavel` | POST | admin/recepção |
| `/api/feriado` | POST/DELETE | admin/recepção |
| `/api/comunicado/[id]` | DELETE | admin |
| `/api/relatorio/[id]` | PATCH/DELETE | profissional dono (até publicação) |
| `/api/relatorio/[id]/publicado` | PATCH | profissional dono |
| `/api/relatorio/[id]/pdf` | POST/GET | profissional dono / admin / pai vinculado (signed URL 1h) |
| `/api/orientacao` | POST | profissional vinculado |
| `/api/orientacao/[id]` | PATCH | profissional dono (DELETE bloqueado — imutabilidade COFFITO) |
| `/api/documento/upload` | POST | profissional/admin |
| `/api/upload/midia` | POST | profissional (mídia de orientação) |
| `/api/alta/registrar` | POST | profissional vinculado |
| `/api/alta/solicitar` | POST | pai vinculado |
| `/api/alta/[id]/confirmar` | PATCH | profissional vinculado |
| `/api/consentimento` | POST | pai (registra `consentimento_aceito_em` + `consentimento_policy_versao`) |
| `/api/portal/exportar-dados` | GET | pai (LGPD Art. 18, VI) |
| `/api/portal/meus-dados` | PATCH | pai |
| `/api/terapeuta/paciente/[id]` | GET | profissional vinculado (rota legada) |
| `/api/terapeuta/responsavel/[id]` | GET | profissional vinculado (rota legada) |

---

## Modelo de dados (resumo)

| Tabela | Conteúdo |
|---|---|
| `profiles` | espelho de `auth.users` com `nome, role, telefone, cpf_cnpj, tipo_profissional, conselho_tipo, conselho_numero, crefito (legado), consentimento_aceito_em, consentimento_policy_versao, permissoes (jsonb), ativo` |
| `pacientes` | dados cadastrais (`cpf` em transição, `cpf_cifrado` via pgcrypto, `status`, `frequencia_atendimento`, etc.) |
| `pacientes_dados_clinicos` | diagnóstico, hipótese diagnóstica, plano terapêutico, observações, `hash_integridade` |
| `paciente_responsaveis` | vínculo família ↔ paciente (`tipo`: principal/secundário) |
| `paciente_terapeutas` | vínculo profissional clínico ↔ paciente; nome legado preservado por compatibilidade |
| `responsaveis_detalhes` | endereço, cidade, CEP, contato emergência |
| `relatorios` | `paciente_id, terapeuta_id` (nome legado), conteúdo, status (rascunho/publicado), assinatura, pdf_url, hash_integridade |
| `documentos` | uploads (paciente_id, url pública, mime, hash) |
| `orientacoes` | mensagens da profissional para a família (texto/PDF/vídeo/imagem); `hash_integridade`; **DELETE bloqueado** |
| `agendamentos` | sessões e compromissos especiais (recorrentes geradas a partir de `horarios_atendimento`) |
| `feriados` | dias sem geração automática de sessão |
| `comunicados` | avisos gerais |
| `comentarios` | thread em recursos clínicos |
| `notificacoes` | toast in-app por usuário |
| `solicitacoes_alta` | fluxo de alta (ver abaixo) |
| `audit_logs` | INSERT/UPDATE em entidades clínicas via trigger SECURITY DEFINER (migration 020) |
| `_app_config` | chave/valor interno (apenas `cpf_key`); `REVOKE ALL` para anon/authenticated |

---

## Permissões granulares — `lib/permissoes/definicoes.ts`

Cada usuário tem `profiles.permissoes JSONB`. As chaves presentes **sobrescrevem** o padrão do `role`. Padrões:

| Chave | admin | recepção | terapeuta | pai |
|---|:-:|:-:|:-:|:-:|
| `ver_todos_pacientes` | ✅ | ✅ | – | – |
| `ver_relatorios_todos` | ✅ | – | – | – |
| `ver_auditoria` | ✅ | – | – | – |
| `cadastrar_pacientes` | ✅ | ✅ | – | – |
| `editar_pacientes` | ✅ | ✅ | – | – |
| `desativar_reativar_paciente` | ✅ | ✅ | – | – |
| `gerenciar_responsaveis` | ✅ | ✅ | – | – |
| `vincular_terapeutas` | ✅ | ✅ | – | – |
| `criar_agendamentos` | ✅ | ✅ | – | – |
| `editar_agendamentos_alheios` | ✅ | ✅ | – | – |
| `gerenciar_feriados` | ✅ | ✅ | – | – |
| `criar_comunicados` | ✅ | ✅ | – | – |
| `registrar_alta` | ✅ | – | ✅ | – |
| `gerenciar_usuarios` | ✅ | – | – | – |
| `bloquear_acesso_portal` | ✅ | – | – | – |

API:
- `temPermissao(role, permissoes, chave)` — checa override + default
- `todasPermissoes(role, permissoes)` — retorna estado efetivo
- `calcularOverrides(role, estadoAtual)` — salva apenas o que difere do default

### Bloqueio do portal da família

Quando admin marca `permissoes.bloquear_acesso_portal = true` no `profiles` de um responsável, o `app/(portal)/layout.tsx` redireciona para `/login?bloqueado=1`. Usado para casos de inadimplência, disputa entre responsáveis, etc.

---

## Fluxo de alta (real, conforme migration 014 + rotas atuais)

Tabela: `solicitacoes_alta` com `tipo ∈ {terapeuta, responsavel}` (valor legado) e `status ∈ {registrada, pendente_confirmacao, confirmada, recusada}`.

### A) Alta direta pelo profissional
1. Profissional vinculado chama `POST /api/alta/registrar` com `paciente_id, motivo`.
2. Sistema valida vínculo, paciente ativo, gera `hash_integridade`, insere com `status='registrada'`.
3. Atualiza `pacientes.status='alta'`.
4. Apaga agendamentos futuros do paciente.
5. Notifica responsáveis.

### B) Solicitação pela família + confirmação pela profissional
1. Pai vinculado chama `POST /api/alta/solicitar` com `paciente_id, motivo, documento_url?`.
2. Insere com `status='pendente_confirmacao'` (bloqueia se já existir uma pendente para o mesmo paciente).
3. Notifica profissionais vinculados.
4. Profissional vinculado chama `PATCH /api/alta/[id]/confirmar`.
5. Status passa a `confirmada`, paciente vira `alta`, agendamentos futuros são apagados.
6. Notifica responsáveis.

> Após `status='alta'`, RLS RESTRICTIVE (migration 016) bloqueia INSERT/UPDATE/DELETE em prontuário. SELECT permanece pelos 20 anos legais (COFFITO Res. 424/2013).

---

## Storage — buckets

| Bucket | Visibilidade | Como é entregue |
|---|---|---|
| `documentos` | **público** | URL pública (`getPublicUrl`); controle real via RLS na tabela `documentos` |
| `relatorios-pdf` | **privado** | Signed URL de 1h (`createSignedUrl(path, 3600)`); upload via service role; `pdf_url` armazena somente o path |

Path padrão dos PDFs: `${paciente_id}/${relatorio_id}.pdf`.

---

## Segurança e LGPD

- **Auth:** Supabase Auth (e-mail + senha); sessão via cookie; `proxy.ts` bloqueia rotas privadas; layouts checam `role`.
- **RLS:** ativo em todas as tabelas com dados pessoais ou clínicos.
- **Hash de integridade:** SHA-256 nas entidades clínicas (`relatorios`, `orientacoes`, `documentos`, `pacientes_dados_clinicos`, `solicitacoes_alta`).
- **Audit log:** triggers automáticas em INSERT/UPDATE nas 5 tabelas clínicas (migration 020), populando `audit_logs` com `auth.uid()`, `TG_TABLE_NAME`, `TG_OP`.
- **CPF cifrado:** `cpf_cifrado bytea` via `pgcrypto.pgp_sym_encrypt`; chave em `_app_config.cpf_key`; leitura via `get_paciente_cpf(uuid)` SECURITY DEFINER (apenas admin/recepção/profissional vinculado).
- **Consentimento:** `ConsentimentoModal` no primeiro acesso da família; grava `consentimento_aceito_em` + `consentimento_policy_versao` (atual: `v1-2026-04-26`).
- **Portabilidade:** `GET /api/portal/exportar-dados` devolve JSON com perfil + detalhes + vínculos (LGPD Art. 18, VI).
- **Correção:** `PATCH /api/portal/meus-dados` permite ao responsável editar nome, telefone, endereço, contato emergência (LGPD Art. 18, III).
- **Imutabilidade:** orientações não podem ser deletadas (HTTP 409 com mensagem citando COFFITO Res. 424/2013); pacientes com prontuário não podem ser excluídos.
- **Conselho profissional:** migration 033 adiciona `tipo_profissional`, `conselho_tipo` e `conselho_numero`; o PDF e a assinatura digital usam o conselho correto (CREFITO, CRFa, CRP, CBO ou CRN). `crefito` fica como legado para cadastros antigos.

Documentos formais: `docs/lgpd/ROPA.md`, `docs/lgpd/RIPD.md`.

---

## Status atual

Base funcional completa. Todas as rotinas administrativas, profissionais e familiares implementadas com camadas de segurança, LGPD e normas dos conselhos aplicáveis. CPF cifrado em produção; cadastro profissional multiespecialidade ativo.

---

## Pendências e gaps confirmados (verificados no código)

| Item | Status real | Detalhe |
|---|---|---|
| **Fase 3 CPF** | ⚠️ Pendente | `cpf` plaintext ainda existe. `cpf_cifrado` ativo. DROP da coluna plaintext não executado. |
| **Renovação de consentimento** | ✅ Corrigido | Bug: layout verificava apenas `consentimento_aceito_em`, nunca `consentimento_policy_versao`. Corrigido: `POLICY_VERSION` em `lib/consentimento.ts`; layout agora exige re-aceite ao mudar versão. |
| **Rotação da chave CPF** | ❌ Sem mecanismo | `cpf_key` em `_app_config`. Sem endpoint ou função para rotação. Exige SQL manual no Supabase. Risco se chave vazar. |
| **Fluxo de recusa de alta** | ✅ Corrigido | Rota `PATCH /api/alta/[id]/recusar` implementada. Apenas profissional vinculado, somente `pendente_confirmacao`. Aceita `argumentacao_recusa`, gera hash, notifica responsáveis. Paciente permanece ativo. |
| **Tabela `comentarios`** | ✅ Corrigido | `GET /api/comentario?ref_tipo=&ref_id=` e `POST /api/comentario` implementados. `ref_tipo ∈ {relatorio, documento}`. RLS: leitura qualquer autenticado, inserção pelo autor. UI pendente. |
| **Teste de recuperação de backup** | ❓ Não verificável | Responsabilidade de infra/Supabase. Não há código no repositório. Documentar procedimento manualmente. |
| **Atendimento a solicitações LGPD** | ⚠️ Parcial | Portabilidade (`exportar-dados`) e correção (`meus-dados`) implementadas. Não há fluxo documentado para exclusão de dados de responsável fora do prazo COFFITO. |
