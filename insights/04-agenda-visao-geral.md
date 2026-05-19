# Insight: Agenda > Visão Geral (ClinicaExperts)

## Sistema de filtros
- Filtros como "chips" removíveis — período aparece como tag
- Botão "+ Adicionar filtro" para filtros adicionais
- "X filtros aplicados" com link "Limpar filtros"

> Alicerce: filtros inline. O padrão de chips é mais limpo visualmente.

---

## KPIs principais (topo)

| Métrica | O que mede | Alicerce tem? |
|---------|-----------|---------------|
| **Total de agendamentos** | Qtd no período filtrado | ❌ não como KPI |
| **Ociosidade** | % de slots disponíveis não preenchidos (96% = quase vazio) | ❌ não existe |
| **Pacientes na lista de espera** | Fila de espera por vaga | ❌ não existe |

### Ociosidade ⭐
- Calcula: (slots ocupados / slots totais possíveis no período) × 100
- Mostra tendência vs período anterior (ex: -4% em verde)
- Extremamente útil: clínica sabe se está subutilizada
- Para calcular: horário de funcionamento da clínica × qtd de terapeutas × período ÷ agendamentos realizados

### Lista de espera
- Pacientes aguardando vaga quando agenda está cheia
- Fora do nosso escopo atual, mas útil no futuro

---

## Gráfico: Agendamentos por período
- Barras: qtd de agendamentos por dia/semana/mês/ano
- Linha de média sobreposta
- Tabs: Diária / Semanal / Mensal / Anual

> Alicerce: não temos gráfico de volume de agendamentos. Dados existem em `agendamentos`.

---

## Agendamentos por status (lateral direita)
Lista com ícone + nome + contagem + percentual:
- Agendado
- Confirmado
- Não compareceu
- Concluído
- Cancelado

> Alicerce: temos status em `agendamentos` mas sem visualização analítica.
> Esse widget aparece também no dashboard principal — alta prioridade.

---

## 4 cards de ranking

| Card | Conteúdo | Depende de |
|------|---------|-----------|
| **Pacientes mais frequentes** | Ranking por qtd de sessões | `agendamentos` — temos |
| **Ociosidade por sala** | Vacancy por sala | Cadastro de salas — não temos |
| **Ociosidade por profissional** | Vacancy por terapeuta | Horário de funcionamento — não temos |
| **Procedimentos mais frequentes** | Ranking por tipo de atendimento | Catálogo de procedimentos — não temos |

> Pacientes mais frequentes: **podemos implementar** com dados atuais.

---

## Widgets no scroll (já vistos no dashboard)
- Dias mais movimentados (barras por D/S/T/Q/Q/S/S)
- Horários mais movimentados (heatmap hora × dia)

---

## O que trazer para o Alicerce

### Implementável agora (sem novos módulos)
1. **Total de agendamentos no período** — KPI simples no dashboard
2. **Agendamentos por status** com percentuais — dados em `agendamentos.status`
3. **Pacientes mais frequentes** — ranking por contagem de sessões
4. **Gráfico de volume** por período (diário/semanal/mensal)
5. **Filtros como chips** — UX mais limpa que dropdowns inline

### Requer módulos novos
6. **Ociosidade** — precisa de "horário de funcionamento" configurado
7. **Ociosidade por profissional** — idem
8. **Ociosidade por sala** — precisa de cadastro de salas
9. **Procedimentos mais frequentes** — precisa de catálogo de procedimentos
10. **Lista de espera** — feature nova completa
