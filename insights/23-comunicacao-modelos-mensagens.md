# Insight: Comunicação > Modelos de Mensagens

## Mensagens do sistema (13 templates predefinidos)

| Template | Gatilho | Canais disponíveis |
|----------|---------|-------------------|
| Aniversário | Data aniversário do paciente | WA Lite / E-mail / SMS / WA Business |
| Boas-vindas | Cadastro criado | WA Lite / E-mail / SMS / WA Business |
| Lembrete de retorno | Intervalo entre sessões (plano de tratamento) | WA Lite / E-mail / SMS / WA Business |
| Lembrete de agendamento | X horas/dias antes do horário | WA Lite / **E-mail** / SMS / WA Business |
| Agendamento criado | Agendamento novo | WA Lite / E-mail / SMS / WA Business |
| Agendamento alterado | Data/hora/profissional/sala alterado | WA Lite / E-mail / SMS / WA Business |
| Confirmação de agendamento | Status = "Agendado" → envia link | WA Lite / E-mail / SMS / WA Business |
| Agendamento confirmado | Status muda para "Confirmado" | WA Lite / E-mail / SMS / WA Business |
| Agendamento cancelado | Status = "Cancelado" ou "Excluído" | WA Lite / E-mail / SMS / WA Business |
| Formulário de pré-atendimento | Antes do atendimento | WA Lite / **E-mail** / SMS / WA Business |
| Envio de orçamento | Criação de orçamento | WA Lite / **E-mail** / SMS / WA Business |
| Lembrete de fatura | Vencimento a vencer | WA Lite / E-mail / SMS / WA Business |
| Orientações Pós Procedimento | Conclusão do procedimento | WA Lite / E-mail / SMS / WA Business |

> Tag colorida (verde) = canal padrão/ativo para aquele template

## Mensagens personalizadas (6 no demo)
Templates criados pela clínica:
- Mensagem com a chave PIX
- Não comparecimento no horário marcado
- Pós-atendimento
- Pré-atendimento
- Recuperação de horário cancelado
- Recuperação de paciente inativo

## UX do layout
- Cards grid 4 colunas, ícone + título + descrição + tags de canais + botão "Personalizar"
- Seção separada "Mensagens personalizadas" = lista tabular com toggle ativo/inativo + ⋮
- Column configurator mínimo (Nome + Status apenas)

---

## Editor de automação (modal interno de cada template)

### Estrutura
- Accordion com 1 automação por canal (3 pré-configuradas: WA Lite / SMS / E-mail)
- "+ Nova automação" para adicionar canais extras
- Toggle por automação com tooltip "Ative para enviar automaticamente"
- Preview ao vivo no mockup de celular (muda conforme canal selecionado)

### Campos por canal
| Campo | WA Lite | SMS | E-mail |
|-------|---------|-----|--------|
| Seletor de canal | ✅ | ✗ | ✗ |
| Assunto | ✗ | ✗ | ✅ |
| Mensagem (rich text) | ✅ Bold/Italic/Strike/Emoji | ✅ Emoji apenas | ✅ Bold/Italic/Strike/Emoji |
| Contador de caracteres | ✗ | ✅ (limite 120, corte automático) | ✗ |
| Horário de envio | ✅ | ✅ | ✅ |

### Variáveis (tokens coloridos)
- Inserção via botão `{x}` na toolbar
- Variáveis ficam **destacadas em roxo** no editor — diferenciam de texto fixo
- Visíveis no demo: `Primeiro nome do paciente`, `Nome da clínica`
- Preview ao vivo substitui tokens pelos dados reais (ex: "Aninha", "ClinicaExperts")

### Dois tipos de trigger (descobertos ao comparar templates)

| Tipo | Campo | Exemplo |
|------|-------|---------|
| **Data fixa** | Horário de envio (ex: 9:00) | Aniversário — envia às 9h do dia do aniversário |
| **Relativo ao evento** | Antecedência (N + horas/dias) | Lembrete agendamento — envia 1h antes do horário |

### Variáveis descobertas no lembrete de agendamento
- `Primeiro nome do paciente`
- `Data do agendamento`
- `Hora do agendamento`
- `Nome da clínica`

### Lembrete de agendamento — estado no demo
- WA Lite: **Inativo**, 1h de antecedência
- SMS: **Inativo**, 1h de antecedência
- E-mail: **Ativo**, 1h de antecedência ← único canal habilitado

### Templates pré-populados (lembrete agendamento)
**WhatsApp:**
> Olá, [Primeiro nome do paciente]! Tudo certo pra nossa consulta em [Data do agendamento], às [Hora do agendamento]? 😀 Caso não possa comparecer, nos avise o mais breve possível!

**SMS (50/85 chars):**
> Lembrete: você possui uma consulta na [Nome da clínica] em [Data do agendamento] às [Hora do agendamento].

**E-mail (assunto: "Lembrete de agendamento"):**
> Olá, [Primeiro nome do paciente]! Tudo bem? Sua próxima consulta aqui na [Nome da clínica] é no dia [Data do agendamento], às [Hora do agendamento]. Caso não possa comparecer, nos avise o mais breve possível!

---

### Confirmação de agendamento — variáveis extras descobertas
- `Procedimento` — nome do procedimento do agendamento
- `Nome completo do profissional`
- `Link para confirmação` — URL curta única por agendamento (ex: `cexp.app/s/abc123`)

**Fluxo:** paciente clica no link → página de confirmação → status muda para "Confirmado" automaticamente na agenda.

Antecedência padrão: **1 dia** (não 1 hora como no lembrete).

**Templates:**

WhatsApp:
> Oii, [Primeiro nome do paciente]! 😀 Por favor, confirme seu horário para [Procedimento] aqui na [Nome da clínica] clicando neste link: [Link para confirmação]

SMS (41/45 chars):
> [Primeiro nome do paciente], confirme seu horário na [Nome da clínica] em [Data do agendamento] às [Hora do agendamento]: [Link para confirmação]

E-mail (assunto: "Confirmação de agendamento"):
> Olá, [Primeiro nome do paciente]. Por gentileza, confirme seu horário para [Procedimento], com [Nome completo do profissional], em [Data do agendamento], às [Hora do agendamento]. Basta clicar aqui: [Link para confirmação]. Contamos com sua confirmação. Grata, [Nome da clínica]

**Implementação no Alicerce:**
```sql
-- tabela para tokens de confirmação
agendamento_tokens (
  id uuid PK,
  agendamento_id uuid FK,
  token varchar unique,  -- slug curto ou UUID
  expires_at timestamptz,
  used_at timestamptz    -- null = não usado ainda
)
```
Endpoint público: `GET /confirmar/[token]` → valida token, atualiza `agendamentos.status = 'confirmado'`, marca `used_at`.
Email via Resend = implementação mais rápida (sem WA API).

---

### Templates pré-populados (aniversário)
**WhatsApp:**
> Oieee, [Primeiro nome do paciente]! Passando para te desejar um feliz aniversário 🎉. Que você tenha um excelente dia e que esse novo ciclo seja repleto de realizações ✨. Você merece. Um abraço! [Nome da clínica] 😘

**SMS (81/90 chars):**
> Hoje é o seu dia, [Primeiro nome do paciente]! Que esse novo ciclo seja repleto de coisas boas. Abraços, [Nome da clínica].

**E-mail (assunto: "Hoje o dia é todo seu!"):**
> [Primeiro nome do paciente], com certeza muitas coisas boas te aguardam nesse novo ciclo. 💜 [...] Com muito carinho, equipe [Nome da clínica].

---

## Para o Alicerce

### Cruzamento com o que já existe
| Template | Status no Alicerce |
|----------|-------------------|
| Lembrete de agendamento | ✅ Push notification já implementado |
| Agendamento criado/cancelado | ✅ Push notification já implementado |
| Aniversário | ✅ `data_nascimento` existe — só falta trigger |
| Orientações Pós Procedimento | ✅ Módulo `orientacoes` já existe — integrar envio automático |
| Confirmação de agendamento | ❌ Link de confirmação não existe ainda |
| Boas-vindas | ❌ Não implementado |
| Não comparecimento | ❌ Não implementado |
| Lembrete de retorno | ❌ Plano de tratamento não existe |
| Recuperação de paciente inativo | ❌ Não implementado |
| Chave PIX | ❌ Não implementado |

### Templates prioritários para terapia
1. **Confirmação de agendamento** — link que paciente clica para confirmar, resposta reflete na agenda
   - Conecta com o status "Confirmado" que já existe em `agendamentos`
2. **Não comparecimento** — envio automático após horário marcado não realizado
   - Conecta com status "Faltou" em `agendamentos`
3. **Orientações Pós Procedimento** — disparar envio do módulo `orientacoes` automaticamente após marcar "Realizado"
4. **Recuperação de paciente inativo** — detectar paciente sem agendamento há X semanas + enviar mensagem

### Arquitetura de templates
Sistema de templates com variáveis: `{{nome_paciente}}`, `{{data}}`, `{{hora}}`, `{{profissional}}`, etc.
Cada template = configuração por canal (WhatsApp/Email/SMS independentes).
Trigger = evento do sistema (agendamento criado, status alterado, data de aniversário, etc.).

### Canal mais viável agora
**E-mail** — sem dependência de API não oficial, sem custo por mensagem.
Usar Resend ou SendGrid + templates React Email.
WhatsApp = segunda fase (requer infraestrutura de canal dedicado).
