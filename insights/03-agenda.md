# Insight: Agenda (ClinicaExperts)

## Layout geral
- 3 colunas: mini-calendário lateral + filtros | grid semanal | (sem coluna direita)
- Grid semanal com slots de 30min
- **Linha vermelha de horário atual** atravessando toda a grade
- **FAB (+)** expande em speed dial com 8 ações (ver seção abaixo)
- Switcher de view no canto superior direito com 5 opções:
  - **Dia** — grid de um único dia
  - **Semana** — grid 7 dias (view padrão)
  - **Mês** — calendário mensal
  - **Profissional** — colunas por terapeuta (todos side-by-side no mesmo dia)
  - **Programação** — provavelmente lista/timeline cronológica

## Painel de filtros (lateral esquerda)
- **Status** — dropdown (Todos / Confirmado / Cancelado / Faltou / etc)
- **Profissional** — dropdown multi-seleção
- **Paciente** — dropdown com busca
- **Procedimento** — dropdown (ligado ao catálogo de procedimentos)
- **Sala de atendimento** — dropdown (ligado ao cadastro de salas)
- Link "Limpar filtros"

### Opções avançadas (colapsável)
| Toggle | Default |
|--------|---------|
| Mostrar finais de semana | ON |
| Mostrar lembretes | ON |
| Mostrar feriados | ON |
| Mostrar eventos do sistema | ON |
| Mostrar eventos no mês | OFF |
| Sobrepor eventos | OFF |

## Botão "Pedir à Anna"
- IA assistente integrada — provavelmente sugere horários, responde dúvidas de agenda
- Gradiente rosa/roxo, destaque visual máximo
- Fora do escopo por enquanto

---

## Comparação com Alicerce

| Feature | ClinicaExperts | Alicerce |
|---------|---------------|----------|
| View semanal | ✅ | ✅ |
| Linha de horário atual | ✅ | ❓ verificar |
| Filtro por status | ✅ | ❌ |
| Filtro por profissional | ✅ | ✅ (admin vê todos) |
| Filtro por paciente | ✅ | ❌ |
| Filtro por procedimento | ✅ | ❌ (não temos catálogo) |
| Filtro por sala | ✅ | ❌ (não temos salas) |
| Toggle fins de semana | ✅ | ❌ |
| Toggle feriados | ✅ | ❌ (temos feriados mas não toggle) |
| Switcher Dia/Semana/Mês | ✅ | ❌ (só semana no terapeuta) |
| FAB para criar | ✅ | ❌ (fluxo diferente) |
| IA de agendamento | ✅ | ❌ |

---

## FAB Speed Dial (botão flutuante +)
Expande para 8 ações ao clicar:

| Ação | Ícone | Relevante pro Alicerce? |
|------|-------|------------------------|
| Novo agendamento | calendário | ✅ já temos |
| **Novo bloqueio de horário** | calendário bloqueado | ✅ **não temos — útil** |
| **Novo Lembrete** | alarme | ✅ interessante |
| **Novo evento** | calendário+ | ✅ reuniões/capacitações |
| Nova venda personalizada | carrinho | ❌ financeiro |
| Nova venda de crédito | moeda | ❌ financeiro |
| Nova venda de pacote | sacola | ❌ financeiro |
| Novo atendimento | estetoscópio | 🟡 similar a agendamento |

### Bloqueio de horário ⭐
- Terapeuta ou recepção marca slot como indisponível (férias, reunião, etc.)
- Impede que agendamento seja criado naquele horário
- Muito útil — temos feriados globais mas não bloqueio individual por terapeuta

### Lembrete
- Nota/alerta vinculado a data/hora na agenda
- Aparece no calendário como item visual diferenciado

### Novo evento
- Agendamento não-clínico (reunião de equipe, supervisão, capacitação)
- Ocupa slot na agenda sem ser sessão de paciente

---

## O que trazer para o Alicerce

### Alta prioridade
1. **Linha de horário atual** no grid — detalhe visual simples, alto impacto UX
2. **Filtro por status** na agenda admin — dados já existem em `agendamentos.status`
3. **Filtro por paciente** — busca rápida de sessões de um paciente específico

### Média prioridade
4. **Toggle "mostrar fins de semana"** — ocultar sáb/dom quando clínica não atende
5. **Toggle "mostrar feriados"** — já temos tabela `feriados`, só falta o toggle visual
6. **View switcher Dia / Semana / Mês** — especialmente "Dia" pra recepção ver agenda do dia
7. **View "Profissional"** ⭐ — todos os terapeutas em colunas lado a lado no mesmo dia. Admin vê sobreposições, gaps, disponibilidade. Muito útil pra clínica com múltiplos profissionais

### Baixa prioridade (depende de outros módulos)
7. **Filtro por sala** — depende de implementar cadastro de salas
8. **Filtro por procedimento** — depende de catálogo de procedimentos
