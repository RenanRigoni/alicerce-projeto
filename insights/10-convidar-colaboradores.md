# Insight: Contatos > Convidar Colaboradores (ClinicaExperts)

## Três seções

### 1. Convidar por link
- Link de cadastro rápido com token de convite (`?invitation=...`)
- "Copiar link" — copia para clipboard
- "Atualizar link" — invalida token atual e gera novo (segurança)
- Admin envia o link por qualquer canal (WhatsApp, e-mail, etc.)

### 2. Convidar por e-mail
- Campo de e-mail + "+ Adicionar mais" (múltiplos e-mails de uma vez)
- "Enviar convite" — plataforma manda e-mail com link de cadastro
- O convidado cria a própria conta (self-service)

### 3. Aguardando aprovação
- Lista de convites enviados + solicitações de cadastro pendentes
- Admin pode **aprovar** ou **rejeitar** novos colaboradores
- Controle de acesso antes de liberar o usuário

---

## Comparação com Alicerce

Alicerce hoje: admin cria usuário manualmente preenchendo todos os dados (`/api/admin/criar-usuario`). O profissional não participa do processo.

| Fluxo | ClinicaExperts | Alicerce |
|-------|---------------|----------|
| Criação de usuário | Self-service via convite | Admin preenche tudo |
| Dados pessoais | Profissional preenche ao aceitar | Admin preenche |
| Aprovação | Admin aprova após cadastro | N/A (admin cria direto) |
| Link de convite | ✅ | ❌ |
| Convite por e-mail | ✅ | ❌ |

---

## Vale para o Alicerce?

**Parcialmente.** A clínica é pequena — admin cria usuários raramente. Mas link de convite simplificaria:
- Profissional preenche próprio nome, CRP/CREFITO, etc.
- Admin não precisa saber todos os dados do terapeuta

**Esforço: médio** — requer tabela de convites, token com expiração, fluxo de aceite.

**Prioridade: baixa** — fluxo atual funciona, clínica não adiciona usuários com frequência.
