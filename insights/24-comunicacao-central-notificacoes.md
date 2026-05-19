# Insight: Comunicação > Central de Notificações

## Layout
- 2 tabs: **Histórico de notificações** | **Notificações agendadas**
- Colunas: Data | Destinatário (avatar+nome) | Método | Assunto | Status
- Ações em lote + busca + Adicionar filtro

## Status de entrega
| Badge | Significado |
|-------|------------|
| **Enviado** (roxo) | Provider aceitou — entrega não confirmada |
| **Entregue** (verde) | Confirmação de entrega recebida (delivery receipt) |

> Distinção requer webhook do provider (ex: Resend webhooks para e-mail, Twilio status callback para SMS)

## Filtros disponíveis
- Período (presets + calendário — padrão recorrente)
- Via
- Status
- Destinatário
- Canal

## Modal "Visualizar" por registro
### SMS
```
Enviado em:  19/05/2026 11:18:48    Via: SMS
Destinatário: +5534993036785        Status: Entregue
Mensagem: Seu código de validação é: 292363
```

### E-mail
```
Enviado em:  19/05/2026 11:19:25    Via: E-mail
Destinatário: renan.rigoni@gmail.com  Status: Enviado
[preview HTML renderizado do e-mail]
```
Preview renderiza o HTML exato recebido pelo destinatário (com header/logo/footer da clínica).

## Registros no demo
Os 2 registros são mensagens de validação do próprio Renan (configuração de canal), não de pacientes:
- SMS: "Seu código de validação é: 292363"
- E-mail: "Código de verificação — Seu código é: **543070**. Válido por 10 minutos."

## Para o Alicerce

### Log de notificações
Tabela `notification_logs`:
```sql
id, destinatario_id (FK profiles), canal ('email'|'sms'|'whatsapp'|'push'),
assunto, conteudo_html, conteudo_texto, status ('enviado'|'entregue'|'falhou'),
enviado_em, entregue_em, provider_message_id, metadata jsonb
```

### UX highlights
- **Preview HTML renderizado** no modal de visualização — excelente para suporte (recepção vê exatamente o que paciente recebeu)
- **Status duplo** (enviado/entregue) — requer webhook do provider
- **Tab "Notificações agendadas"** — lista de mensagens futuras ainda não disparadas (cron jobs pendentes)

### Prioridade
Média — implementar junto com o módulo de automação de mensagens.
Log de notificações é crítico para debugging em produção.
