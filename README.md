# Portal Alicerce

Sistema web da **Alicerce Espaço Terapêutico Infantil** para gestão clínica (pacientes, prontuário, agenda, relatórios, documentos, orientações) e portal da família. Conformidade LGPD + COFFITO Res. 424/2013 + CREFITO Res. 426/2015.

---

## Stack

- **Next.js 16** (App Router) + **React 19** + **TypeScript 5**
- **Supabase** (Auth, Postgres com RLS, Storage)
- **Tailwind 4** + **react-hook-form** + **zod**
- **@react-pdf/renderer** (PDFs de relatórios)
- Deploy: **Vercel**

---

## Scripts

```bash
npm run dev      # dev server (localhost:3000)
npm run build    # build de produção
npm run start    # start do build
npm run lint     # eslint
```

---

## Variáveis de ambiente

Criar `.env.local` na raiz:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key>
SUPABASE_SERVICE_ROLE_KEY=<service role key>   # nunca expor no cliente
```

> A `SUPABASE_SERVICE_ROLE_KEY` é usada apenas em rotas `app/api/**` para operações privilegiadas (criar usuário, deletar paciente sem prontuário, upload server-side, etc.). Nunca importar em código `'use client'`.

---

## Supabase — banco e migrations

### Aplicar migrations

Migrations versionadas em `supabase/migrations/` (001 → 022). Aplicar em ordem via Supabase SQL Editor ou CLI:

```bash
# CLI (opcional)
supabase db push
```

Resumo das migrations principais:

| Migration | Conteúdo |
|---|---|
| 001 | Schema inicial (profiles, pacientes, vínculos, relatórios, documentos, orientações, comunicados, audit_logs) |
| 002–008 | Horários, alta, cadastro completo, FKs, perfil terapeuta, contato emergência |
| 009 / 011 | RLS fixes (geral e portal família) |
| 010 | Notificações |
| 012 | Consentimento LGPD (`consentimento_aceito_em`) |
| 013 | `hash_integridade` SHA-256 nas entidades clínicas |
| 014 | Refactor do fluxo de alta (status: registrada / pendente_confirmacao / confirmada) |
| 015 | Permissões granulares (`profiles.permissoes` JSONB) |
| 016 | Prontuário somente leitura pós-alta (RLS RESTRICTIVE) |
| 017 | CPF — coluna `cpf_cifrado` + funções `encrypt_cpf` / `decrypt_cpf` (pgcrypto) |
| 018 | CREFITO obrigatório para `role = 'terapeuta'` |
| 019 | Versão da política de consentimento (`consentimento_policy_versao`) |
| 020 | Triggers de audit log (orientações, documentos, dados clínicos, alta, relatórios) |
| 021 | CPF Fase 2 — função `get_paciente_cpf` SECURITY DEFINER |
| 022 | Tabela `_app_config` para chave de cifragem do CPF |

### Configurar a chave de cifragem do CPF (após migration 022)

```sql
INSERT INTO _app_config (key, value)
VALUES ('cpf_key', '<gere uma chave forte e guarde fora do banco>')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
```

> Sem essa chave, `encrypt_cpf` / `decrypt_cpf` falham. Guarde também em cofre/secret manager — se a chave for perdida, os CPFs cifrados ficam ilegíveis.

### Storage Buckets

Criar dois buckets no Supabase Storage:

| Bucket | Visibilidade | Uso |
|---|---|---|
| `documentos` | **público** (leitura) | uploads de documentos do paciente e mídias de orientação |
| `relatorios-pdf` | **privado** | PDFs gerados de relatórios; entregues via signed URL (1h) |

> O bucket `documentos` usa URL pública para reduzir custo/latência; o controle de acesso é feito via RLS na tabela `documentos`. O bucket `relatorios-pdf` é privado e exige `createSignedUrl`.

### RLS

Todas as tabelas com dados clínicos ou pessoais têm RLS habilitado. Política geral:

- **admin / recepção:** acesso amplo conforme matriz de permissões
- **terapeuta:** somente pacientes vinculados em `paciente_terapeutas`
- **pai (família):** somente pacientes vinculados em `paciente_responsaveis`
- **prontuário pós-alta:** RLS RESTRICTIVE bloqueia INSERT/UPDATE/DELETE; SELECT preservado pelos 20 anos legais

---

## Arquitetura — pastas

```
app/
  (admin)/admin/...         layout + páginas admin/recepção
  (auth)/login              login
  (auth)/recuperar-senha    recuperação
  (auth)/privacidade        política pública
  (portal)/portal/...       layout + portal família
  (terapia)/terapia/...     layout + área do terapeuta
  api/...                   route handlers (server)
components/                 UI compartilhada
lib/
  supabase/{client,server,admin}.ts
  permissoes/{definicoes,verificar}.ts
  hash/gerar-hash.ts        SHA-256 das entidades clínicas
  pdf/template-relatorio.tsx
  notificacoes/inserir.ts
proxy.ts                    middleware (auth) — rotas públicas: /login, /recuperar-senha, /privacidade
supabase/migrations/        SQL versionado
docs/                       documentação + LGPD (RIPD, ROPA)
```

---

## PWA

Manifesto em `public/manifest.json`. Service worker em `public/sw.js`.

### Assets

| Arquivo | Uso |
|---|---|
| `public/logo_ico.png` | Ícone base 512×512 — fonte para geração de todos os ícones PWA |
| `public/mobile.png` | Intro screen + splash iOS para telefones |
| `public/tablet.png` | Intro screen + splash iOS para tablets (iPad) |
| `public/icons/icon-*.png` | Ícones PWA (48→512px) |
| `public/icons/icon-maskable-*.png` | Ícones maskable (192, 512px) |
| `public/icons/splash-*.png` | Splash screens iOS por tamanho de device |

### Scripts de assets

```bash
node scripts/regen-icons.mjs          # Regenera ícones PWA a partir de logo_ico.png
node scripts/gen-splash.mjs           # Regenera splashes iOS (mobile.png → phones, tablet.png → iPads)
node scripts/generate-pwa-assets.mjs  # Geração completa
```

### Tela de intro (`app/page.tsx`)

Exibe splash animado (fade-in/out, 2.8s) uma vez por sessão (`sessionStorage`).
- Largura ≥ 768px → `tablet.png`
- Largura < 768px → `mobile.png`

Splash estático iOS (`apple-touch-startup-image`) segue a mesma divisão: 6 tamanhos de iPhone gerados de `mobile.png`, 3 tamanhos de iPad gerados de `tablet.png`.

---

## Deploy (Vercel)

1. Conectar repositório no Vercel.
2. Definir as variáveis (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`) no painel do projeto.
3. Build padrão: `npm run build`. Output `.next`.
4. Aplicar migrations no Supabase de produção antes do primeiro deploy.
5. Inserir a chave de cifragem do CPF em `_app_config`.
6. Garantir os buckets `documentos` e `relatorios-pdf` criados (ver acima).
7. Habilitar PITR no plano Supabase Pro (recomendação do RIPD).

---

## Documentação adicional

- [`docs/DOCUMENTACAO_RESUMIDA.md`](docs/DOCUMENTACAO_RESUMIDA.md) — visão funcional, rotas, modelo de dados, permissões, fluxo de alta
- [`docs/lgpd/ROPA.md`](docs/lgpd/ROPA.md) — Registro de Atividades de Tratamento (LGPD Art. 37)
- [`docs/lgpd/RIPD.md`](docs/lgpd/RIPD.md) — Relatório de Impacto à Proteção de Dados
- [`docs/superpowers/specs/`](docs/superpowers/specs/) — planejamento histórico (Bloco 1)
