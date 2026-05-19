# Insight: Agenda > Eventos (ClinicaExperts)

## Página Eventos
- Listagem tabular de eventos não-clínicos
- Mesmos padrões: filtros chips, busca, paginação 25/página
- Estado vazio elegante com CTA direto ("+ Novo evento")
- Filtros disponíveis: Período, Profissionais, Procedimentos

---

## Modal "Novo evento" ⭐ — Modal unificado de criação

O botão "+ Novo evento" (e o FAB +) abre **um único modal** com tabs de tipo no topo:

| Tab | O que cria |
|-----|-----------|
| **Agendamento** | Sessão clínica com paciente |
| **Bloqueio de horário** | Slot indisponível (sem paciente) |
| **Lembrete** | Alerta/nota na agenda |
| **Evento** | Reunião, capacitação, evento interno |

### Campos do tipo "Evento"
- **Título do evento*** — texto livre
- **Data de início*** + **Hora de início***
- **Data de fim*** + **Hora de fim***
- **Profissionais** — multi-select com chips removíveis (pré-preenche com o usuário logado)
- **Procedimentos** — dropdown pesquisável
- **Toggle**: "Permitir agendamentos de outros procedimentos nesta data"
  - OFF = bloqueia toda agenda do profissional naquele período
  - ON = bloqueia só aquele procedimento, outros podem ser agendados

---

## Padrão de design: modal unificado por tipo

Em vez de telas/rotas separadas para cada tipo de item de agenda, tudo vai para um modal com tabs. O tipo muda os campos exibidos.

> Alicerce hoje: criação de agendamento é fluxo separado. Não temos bloqueio de horário, lembrete ou evento.

---

## O que trazer para o Alicerce

### Alta prioridade
1. **Bloqueio de horário** — terapeuta bloqueia período sem criar sessão de paciente
   - Campos mínimos: profissional, data/hora início–fim, motivo (opcional)
   - Aparece na agenda como slot ocupado/hachurado
   - Dados: nova tabela `bloqueios_agenda` ou campo `tipo` em `agendamentos`

2. **Modal unificado** com seleção de tipo — UX muito mais fluida que navegação entre páginas

### Média prioridade
3. **Lembrete** — nota/alerta vinculado a data na agenda do terapeuta
4. **Evento interno** — reunião de equipe, supervisão clínica

### Baixo impacto para o Alicerce
5. Toggle "Permitir outros procedimentos" — só faz sentido com catálogo de procedimentos implementado

---

## Observação: breadcrumb "Sala de espera"
O breadcrumb mostra "Agenda / Sala de espera" mas o conteúdo é "Eventos".
Provavelmente são duas sub-seções distintas no mesmo menu — "Sala de espera" é outra tela (fila de chegada de pacientes no dia).
