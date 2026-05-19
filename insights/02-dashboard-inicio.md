# Insight: Dashboard — Início (ClinicaExperts)

## O que aparece na tela

### Bloco superior — Fluxo de Caixa + Balanço
- Gráfico de barras: Entradas (verde), Saídas (vermelho), versões "previstas" em cor clara
- Linha sobreposta: Saldo real vs Saldo previsto
- Tabs de granularidade: Diária / Semanal / Mensal / Anual
- Seletor de período no painel lateral
- Cards de resumo: Balanço total, Entradas, Saídas — cada um com valor real e previsto lado a lado
- Botão de ocultar valores (ícone olho)

> Alicerce: zero financeiro. Esse bloco inteiro é gap — depende de implementar módulo financeiro antes.

### Bloco inferior esquerdo — Agendamentos das próximas 24h
- Lista cronológica de agendamentos do dia atual + próximas 24h
- Cada item: nome do paciente, tipo de atendimento, horário início–fim
- Cor diferente por profissional (bolinha colorida)

> Alicerce: temos agenda mas não temos widget de "próximas 24h" no dashboard admin.
> **Fácil de implementar** — dados já existem em `agendamentos`.

### Bloco inferior direito — Próximos Aniversariantes
- Lista de pacientes com aniversário próximo (mês corrente)
- Estado vazio elegante com ícone e mensagem

> Alicerce: não temos. Precisaria de campo `data_nascimento` no paciente.
> Verificar se já existe esse campo no schema.

---

## Tela de Relatórios (scroll para baixo na mesma página)

### Tabs de relatório (4 abas com ícones)
- Provavelmente: por Profissional / por Procedimento / por Paciente / Geral

### Widgets visíveis
| Widget | Tipo | Dado |
|--------|------|------|
| Agendamentos por profissional | Barras verticais | Qtd sessões por terapeuta |
| Dias mais movimentados | Barras por dia da semana | D/S/T/Q/Q/S/S |
| Horários mais movimentados | **Heatmap** (hora × dia) | Intensidade de uso |
| Status por agendamento | Donut | Realizado / Cancelado / Faltou / etc |
| Pacientes por sexo | Donut | M/F/Outro |
| Faturamento comparado | Barras por data | R$ por dia no período |

### Badge "Seu progresso" (20%)
- Indicador de completude do cadastro/configuração da clínica
- Aparece fixo no canto inferior direito

---

## O que trazer para o Alicerce

### Alta prioridade (dados já existem)
1. **Agendamentos das próximas 24h** no dashboard admin
   - Fonte: tabela `agendamentos` com filtro de data/hora
   - Já temos a lista de agendamentos — só falta o widget

2. **Dias mais movimentados** (barras por dia da semana)
   - Fonte: `agendamentos` agrupados por `dia_semana`
   - Útil para a clínica otimizar horários

3. **Horários mais movimentados** (heatmap hora × dia)
   - Fonte: `agendamentos` com `horario_inicio` agrupado por hora + dia
   - Visual muito informativo, implementação moderada

4. **Status por agendamento** (donut)
   - Fonte: `agendamentos.status` agrupados
   - Fácil, dados já existem

5. **Agendamentos por profissional** (barras)
   - Fonte: `agendamentos` join `profiles` por terapeuta
   - Fácil

### Média prioridade (requer campo novo)
6. **Próximos aniversariantes**
   - Requer `data_nascimento` no paciente — verificar schema
   - Se não existe: migration simples + UI

### Baixa prioridade (depende de módulo financeiro)
7. Fluxo de caixa, Balanço, Faturamento comparado
   - Bloqueia no módulo financeiro que não temos

---

## Observação de UX

Dashboard deles é denso mas bem organizado — informação financeira no topo (contexto rápido) e operacional embaixo (próximas 24h). Relatórios analíticos ficam em scroll na mesma página.

Para o Alicerce, uma versão mais simples mas já útil seria:
- Widget próximas 24h
- Heatmap de horários movimentados
- Donut de status de agendamentos
- (futuro) Aniversariantes do mês
