# Insight: Agenda > Relatório de Agendamentos (ClinicaExperts)

## Layout geral
- Tabela paginada com filtros e exportação
- Contagem de registros no título ("2 registros")
- Filtros como chips + "+ Adicionar filtro"

---

## Tabs de status (acima da tabela)
Funcionam como filtro rápido — clique filtra a tabela:
- Agendado: 1
- Confirmado: 0
- Não compareceu: 0
- Concluído: 1
- Cancelado: 0
- **Todos: 2** (selecionado, sublinhado em roxo)

> Padrão muito bom — mostra contagem por status antes de filtrar.

---

## Colunas da tabela
| Coluna | Detalhe |
|--------|---------|
| ☐ checkbox | Seleção para ações em lote |
| Procedimentos | Nome do tipo de atendimento |
| Paciente ↕ | Avatar + nome (truncado) — ordenável |
| Profissional ↕ | Avatar + nome — ordenável |
| Duração ↕ | Em minutos (ex: "60 min") — ordenável |
| Agendado para ↕ | Data + hora — ordenável |
| Status ↕ | Badge colorido (Concluído verde, Agendado roxo) — ordenável |
| ⚙️ / ⋮ | Menu de ações por linha |

### Avatars na tabela ⭐
- Foto de perfil do paciente E do profissional em cada linha
- Identidade visual imediata — sem precisar ler nome completo

---

## Ações
- **Ações em lote** (dropdown) — habilitado só quando ≥1 checkbox selecionado. Título muda para "X selecionados de Y registros". Opções:
  - **Alterar status** — muda status de todos selecionados de uma vez
  - **Alterar profissional** — reatribui sessões em lote
  - **Alterar sala** — move sessões para outra sala
  - **Alterar data** — reagenda em lote
  - **Excluir** — remove todos selecionados
- **Exportar** (dropdown): **CSV** e **Excel** — sem PDF
- **Menu ⋮ por linha** — ações individuais (ver, editar, cancelar, etc.)

## Configurador de colunas ⚙️
Ícone de engrenagem abre checklist de colunas visíveis:

| Coluna | Padrão |
|--------|--------|
| Procedimentos | ✅ |
| Paciente | ✅ |
| Profissional | ✅ |
| Duração | ✅ |
| Agendado para | ✅ |
| Status | ✅ |
| Convênio | ☐ (oculto) |
| Salas | ☐ (oculto) |
| Comanda | ☐ (oculto) |

- Botão "Restaurar Padrão" volta ao conjunto default
- Convênio/Salas/Comanda = módulos não-relevantes pro Alicerce

> Padrão excelente de UX — usuário escolhe o que ver sem sobrecarregar a tabela.

## Sistema de filtros ("+ Adicionar filtro")
Painel de 2 colunas:
- **Coluna esquerda**: categorias de filtro (Período, Status, Profissionais, Pacientes, Convênio)
- **Coluna direita**: opções do filtro selecionado

### Filtro Período
Atalhos rápidos:
- Hoje
- Esta semana
- Este mês
- Últimos 7 dias
- Últimos 30 dias

Calendário de range ao lado (seleção de data início–fim visual, dias destacados em roxo)

---

## Paginação
- Seletor "25 por página" (dropdown)
- Navegação: « < 1 > »

---

## Comparação com Alicerce

| Feature | ClinicaExperts | Alicerce |
|---------|---------------|----------|
| Listagem tabular de agendamentos | ✅ | ✅ (admin tem lista) |
| Tabs de status com contagem | ✅ | ❌ |
| Avatar paciente + profissional na linha | ✅ | ❌ |
| Coluna Duração | ✅ | ❌ |
| Colunas ordenáveis | ✅ | ❌ |
| Checkbox + ações em lote | ✅ | ❌ |
| Exportar | ✅ | ❌ |
| Filtros como chips | ✅ | ❌ |
| Paginação com itens/página | ✅ | ❌ (scroll infinito?) |

---

## O que trazer para o Alicerce

### Alta prioridade
1. **Tabs de status com contagem** — UX excelente, fácil de implementar
2. **Exportar CSV/Excel** — recepção usa muito, dados já existem
3. **Coluna Duração** — calcular `horario_fim - horario_inicio`
4. **Filtro de período com atalhos** (Hoje / Esta semana / Últimos 7 dias) — muito prático

### Média prioridade
5. **Configurador de colunas** ⚙️ — ocultar/exibir colunas por preferência
6. **Colunas ordenáveis** — sort por data, profissional, status
7. **Ações em lote** — confirmar/cancelar vários de uma vez
8. **Painel de filtros 2 colunas** (categoria + opções) — mais limpo que dropdowns

### Baixa prioridade
9. **Avatars** na tabela — depende de foto de perfil cadastrada
10. **Paginação** com controle de itens por página
