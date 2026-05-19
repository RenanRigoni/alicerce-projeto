# Insight: Perfil do Profissional (Contatos > Profissional)

## Breadcrumb: Contatos / Listagem / Profissional / [tab]

## Sidebar esquerda — navegação por tabs
- Informações
- Linha do tempo
- Financeiro
- Comissões
- Preferências
- Segurança
- Documentos

---

## Tab: Informações
- Avatar (editável via 📷)
- Nome, telefone com WhatsApp link, badge "Profissional"
- Botão "Enviar mensagem" (WhatsApp direto) + ⋮
- Campos: Nome completo | Email | Telefone | Cadastrado em | Status

## Tab: Linha do tempo
- Feed cronológico de atividades do contato
- Filtros disponíveis
- Demo: único evento "Pessoa criada — ter, 19/05/2026 11:18"
- Padrão de audit trail por pessoa (mesmo conceito que `audit_logs`)

## Tab: Financeiro
KPIs topo: Realizado | A receber | Em aberto | Em atraso | **Total do período**
Lista: Vencimento | Execução | Descrição | Situação | Valor liq. (R$)
= lançamentos financeiros vinculados a este contato (filtro de `lancamentos` WHERE contato_id = profissional)

## Tab: Preferências do profissional (mais denso)

### Notificações por canal (toggle individual)
| Canal | Padrão |
|-------|--------|
| Resumo diário (e-mail matinal com agenda do dia) | ON |
| Push | ON |
| SMS | ON |
| WhatsApp | ON |
| WhatsApp Business | OFF |
| E-mail | ON |

> Aviso WA Business: "Caso o profissional não interaja com as mensagens, o WhatsApp pode interromper temporariamente o envio de novos lembretes. Recomendado responder ao menos uma mensagem da clínica ocasionalmente."

### Configurações da agenda (por profissional)
| Setting | Valor |
|---------|-------|
| Salvar filtros aplicados na agenda | OFF |
| Visualização padrão da agenda | Semana |
| **Cor do agendamento** | Padrão da Clínica ← pode ser cor própria |
| **Google Agenda** | Desconectado — "Configurar" |

### Fichas e compartilhamento
- **Minhas fichas de atendimento** — "Configurar" — escolhe quais fichas e em que ordem usa (independente do padrão da clínica)
- **Compartilhamento automático de atendimento** — "Configurar" — define quais profissionais têm acesso automático aos atendimentos deste profissional

### Lembretes e avisos (configurar individualmente)
- Lembrete de agendamento
- Lembrete de bloqueio de horário
- Lembrete de lembrete
- Aviso de agendamento criado/alterado/cancelado/confirmado

## Tab: Segurança
### Formas de acesso
- Entrar com o Google — ● Ativo — [Remover]
- Entrar com e-mail e senha — ● Inativo — [Habilitar]
- Autenticação de dois fatores — ● Inativo — [Habilitar]

### Dispositivos conectados
- Lista de sessões ativas (browser + OS)
- Badge "Dispositivo Atual"
- [🗑️] para revogar sessão remota

## Tab: Documentos
- Banner de validação: "Para gerar um documento é necessário preencher os campos: data de nascimento e CPF." + [Corrigir]
- Lista de documentos para/por este contato (mesmo módulo CliniDocs)

---

## Modal: Editar Profissional

### Campos básicos
| Campo | Detalhe |
|-------|---------|
| Foto | upload + remover |
| Nome* | |
| E-mail* | |
| Telefone | DDI seletor |
| Data de nascimento | |
| CPF | |
| RG | |
| Sexo | Feminino / Masculino |
| Etiquetas | select + "+ Adicionar" inline |
| **Cor*** | seletor (ex: Violeta) — cor na grade de agendamentos |

### Informações adicionais (profissional)
| Campo | Relevância |
|-------|-----------|
| **Conselho** | select (CRP, CREFITO, CRN, etc.) |
| **Nº de registro do conselho** | ex: CRP 04/12345 |
| **UF do conselho** | MG, SP, etc. |
| **Código CBO** | Classificação Brasileira de Ocupações |
| Profissão | texto livre |
| Estado Civil | select |
| Especialidade | texto livre |
| Biografia | textarea |

---

## Modal: Editar Profissional — Seções adicionais

### Observações
Campo de texto livre por profissional (notas internas).

### Perfil e permissões ⭐
- **Perfil de usuário**: select (ex: "Gerente") = preset de permissões + "Recolher todos"
- Cada permissão = toggle individual — pode sobrescrever o preset do perfil
- Seções accordion (colapsáveis):

#### Permissões por módulo (lista completa)

**Contatos:**
Visualizar/Adicionar/Editar/Excluir: paciente, lead, fornecedor, profissional | Mesclar paciente | Visualizar dados cadastrais | Visualizar/Editar acesso dos profissionais | Visualizar prontuários

**Agenda:**
Visualizar/Adicionar/Editar/Excluir: agendamento próprio, agendamento de outros, bloqueio próprio, bloqueio de outros, lembrete próprio, lembrete de outros, evento de promoção próprio, evento de promoção de outros
+ **Permitir agendamentos fora do horário** ← permissão especial
+ **Permitir agendamentos conflitantes** ← permissão especial
+ Visualizar dashboard

**Atendimentos:**
Adicionar notas | Realizar atendimentos | Arquivar atendimentos | Excluir notas

**Financeiro (extenso):**
Visualizar: extrato, fluxo caixa diário/mensal, contas a receber/pagar, relatório de competência/categorias, DRE
Título próprio: Visualizar/Adicionar/Editar/Excluir/Imprimir
Título de outros: Visualizar/Adicionar/Editar/Excluir/Imprimir
Executar ou desfazer pagamentos | Contas financeiras: Visualizar/Adicionar/Editar/Excluir | Transferências | Categorias | Formas de pagamento | Controlar abertura/fechamento de caixa | Visualizar histórico | Realizar conciliação bancária | Gerenciar integração da maquininha

**Configurações:**
Gerenciar migração | Informações/Assinatura da clínica | Procedimentos | Salas | Modelos de mensagem | Comissões dos profissionais | Horários de funcionamento | Pacotes | Fichas de atendimento | Modelos de documento | Atestados/Prescrições | Convidar colaboradores | Convênios | Etiquetas | CliniChat notificações | Histórico de notificações | Preferências do sistema

**Exportações:** Exportar dados

**Documentos:** Visualizar/Criar/Editar/Excluir

**Anna (AI assistant):** Utilizar Assistente Virtual ← feature de IA com permissão própria

---

### Comissões padrão
- Comissionar vendas (toggle)
- Comissionar atendimentos (toggle)

### Horário de Atendimento ⭐
- Toggle **"Igual ao da clínica"** (ON por padrão)
- Quando OFF: profissional define horário próprio (diferente do horário da clínica)

### Contatos adicionais
- Tipo + Número (ex: telefone comercial, celular pessoal)
- "+ Adicionar contato" (múltiplos)

### Documentos (no cadastro)
- Tipo + Número (ex: CPF, RG, CNH, Passaporte — campos separados por tipo)
- "+ Adicionar documento"

### Endereço
- País (Brasil), CEP + "Buscar CEP" (autocomplete ViaCEP)
- Estado*, Cidade* (cascade), Bairro*, Rua*, Número*, Complemento

### Anexos
- Upload drag & drop
- Formatos: JPG, JPEG, PNG, WEBP, HEIC, PDF, TXT, DOC, DOCX, XLS, XLSX, OGG, **MP4, MOV** (vídeo!)
- Limite: 20.97 MB

---

## Para o Alicerce

### Campos faltantes em `profiles` (profissional)
```sql
-- adicionar em profiles ou tabela profissionais separada
conselho           text  -- ex: 'CRP', 'CREFITO', 'CRFa'
nr_conselho        text  -- ex: '04/12345'
uf_conselho        text  -- ex: 'MG'
codigo_cbo         text
especialidade      text
biografia          text
cor_agenda         text  -- hex color para grade de agendamentos
```

### Features por prioridade

| Feature | Relevância | Complexidade |
|---------|-----------|--------------|
| **Resumo diário** (e-mail com agenda do dia) | ⭐⭐ Alta | Baixa — cron + e-mail |
| **Cor do profissional na agenda** | ⭐⭐ Alta | Baixa |
| **Conselho / CBO** | ⭐⭐ Alta | Mínima (campo novo) |
| **Tab Financeiro** no perfil | ⭐ Média | Baixa (filtro existente) |
| **Tab Linha do tempo** | ⭐ Média | Baixa (audit_logs existente) |
| **Dispositivos conectados** | ⭐ Média | Média (sessions table) |
| **Google Agenda sync** | ⭐ Baixa | Alta (OAuth + API) |
| **Compartilhamento automático** | ⭐ Baixa | Média |

### Resumo diário (quick win)
Cron job diário às 7h → busca agendamentos do dia por profissional → envia e-mail via Resend com lista:
```
Bom dia, [Nome]! Aqui está sua agenda de hoje:

08:00 — João Silva — Atendimento
09:00 — Maria Santos — Anamnese
...
```
Configurável: toggle "Resumo diário" por profissional.

### Tab Financeiro no perfil
Query simples: `SELECT * FROM lancamentos WHERE contato_id = :profissional_id`
KPIs = aggregations na mesma query.
Zero novo schema — só UI nova.

### Cor do agendamento
Hierarquia: Cor do profissional > Cor do procedimento > Cor padrão da clínica.
Campo `cor_agenda` em `profiles` + lógica na query de agendamentos.
