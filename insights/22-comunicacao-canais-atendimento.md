# Insight: Comunicação > Canais de Atendimento

## Layout
- Banner promoção: migração WhatsApp Lite → WhatsApp Business
- Seção "Seus canais" — lista de canais configurados
- Demo vazio (0 registros) — nenhum canal configurado no ambiente de demonstração

## Filtros disponíveis
| Filtro | Opções |
|--------|--------|
| Período | Hoje / Esta semana / Este mês / Últimos 7 dias / Últimos 30 dias + calendário custom |
| Status | Ativo / (outros não visíveis) |

## UX: filtro de período com presets + calendário
Padrão recorrente na plataforma:
- Radio buttons com presets comuns (Hoje, Esta semana, etc.)
- Calendário lateral para range customizado
- Mesma data atual destacada em roxo

## Arquitetura WhatsApp (modal "Mais informações")

| | WhatsApp Lite | WhatsApp Business |
|--|--|--|
| API | **Não oficial** (baileys/WA-web.js) | **Oficial Meta** |
| Estabilidade | Risco de instabilidade | Sem quedas de conexão |
| Banimento | Risco de banimento | Sem risco (segue diretrizes Meta) |
| Segurança | Menor | Maior |
| Botões em mensagens | Não | Em breve |
| Custo | Sem custo direto | Pago por sessão de 24h |

**Insight arquitetural**: ClinicaExperts construiu primeiro com API não oficial (risco, mas fácil de implementar), depois criou caminho de migração para API oficial. Custo calculado com base no volume real de mensagens — sessão de 24h = ilimitadas mensagens para mesmo contato.

## Canais presumidos (não visíveis no demo)
Com base no banner e contexto:
- **WhatsApp Lite** — API não oficial, mais simples de integrar
- **WhatsApp Business** — API oficial Meta, requer aprovação e número dedicado
- Possível: Email, SMS

## Para o Alicerce

### Canais de atendimento
**Baixa prioridade** — integração WhatsApp Business (Meta API) requer:
- Conta Meta Business verificada
- Número de telefone dedicado
- Aprovação de templates
- Custo por conversa

Alicerce já tem: link direto `wa.me/55...` nas telas de pacientes.

### UX: filtro de período com presets
**Alto valor** — padrão de UX muito útil para qualquer relatório/lista:
```
[Período ▾]
○ Hoje
○ Esta semana  
○ Este mês
○ Últimos 7 dias
○ Últimos 30 dias
[calendário para range customizado]
```
Reutilizável em: Relatório financeiro, Frequência de atendimentos, Extrato, Fluxo de caixa.
Implementar como componente `<PeriodFilter>` compartilhado.
