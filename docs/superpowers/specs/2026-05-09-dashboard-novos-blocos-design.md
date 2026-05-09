# Dashboard — Novos blocos: Agenda de Hoje, Resumo da Semana e Campanha do Mês

**Data:** 2026-05-09
**Escopo:** Adição de 3 novos blocos ao dashboard. Zero alteração no visual existente (cores, fontes, cards atuais).

---

## 1. Visão geral

Adicionar 3 blocos informativos nos dashboards admin, recepcao e terapeuta:

| Bloco | Admin / Recepcao | Terapeuta | Responsável |
|---|---|---|---|
| Agenda de Hoje | Todas as sessões da clínica | Apenas seus pacientes | — |
| Esta Semana + Taxa | Toda a clínica | Apenas seus pacientes | — |
| Campanha do Mês | ✅ | ✅ | ✅ |

---

## 2. Bloco: Agenda de Hoje

### Posição
Entre as métricas (pacientes/famílias/terapeutas) e as altas recentes. Lado esquerdo de um grid 2 colunas junto com "Esta Semana".

### Dados
- **Sessões recorrentes**: geradas por `gerarSessoes()` com `dataInicio = hoje 00:00` e `dataFim = hoje 23:59`. Filtra canceladas via `sessao_confirmacoes`.
- **Agendamentos manuais**: query em `agendamentos` WHERE `data_hora` entre início e fim do dia atual.
- Ambos combinados, ordenados por hora.

### Admin/Recepcao
- Sessões recorrentes: todos os pacientes ativos (`status = 'ativo'`).
- Agendamentos: sem filtro de `terapeuta_id`.

### Terapeuta
- Sessões recorrentes: apenas pacientes vinculados via `paciente_terapeutas`.
- Agendamentos: apenas `terapeuta_id = user.id`.

### Exibição por item
- Hora (HH:MM)
- Nome do paciente (ou título se for agendamento manual)
- Badge de status: ✅ confirmada · ⏳ pendente · — sem envio · tag cinza para tipo (devolutiva, reunião, etc.)

### Estado vazio
Card exibe "Nenhuma sessão hoje." sem quebrar o layout.

---

## 3. Bloco: Esta Semana + Taxa de Presença

### Posição
Lado direito do mesmo grid 2 colunas, ao lado da Agenda de Hoje.

### Dados — Esta semana
Conta registros em `sessao_confirmacoes` WHERE `data_hora` entre segunda-feira e domingo da semana atual (BRT).
- `status IN ('confirmada', 'expirada')` → **realizadas**
- `status = 'cancelada'` → **canceladas**

### Dados — Taxa do mês
Conta registros em `sessao_confirmacoes` WHERE `data_hora` entre 1º e último dia do mês atual.
- Taxa = realizadas / (realizadas + canceladas) × 100
- Exibida como barra de progresso + percentual.

### Escopo Admin vs Terapeuta
Mesma lógica do bloco anterior: admin vê tudo, terapeuta vê apenas seus pacientes.

### Estado vazio
Se não há confirmações ainda (início de semana), exibe os contadores zerados normalmente.

---

## 4. Bloco: Campanha do Mês

### Posição
Último bloco antes das Ações Rápidas (após Comunicados Recentes), em todos os dashboards que o exibem.

### Implementação
Objeto hardcoded em `lib/campanhas-saude.ts`:

```typescript
export const CAMPANHAS: Record<number, { titulo: string; descricao: string; cor: string; bg: string; border: string }> = {
  0:  { titulo: 'Janeiro Branco',   descricao: 'Mês de conscientização sobre saúde mental e bem-estar emocional.', cor: '#374151', bg: '#F9FAFB', border: '#E5E7EB' },
  1:  { titulo: 'Fevereiro Roxo',   descricao: 'Conscientização sobre doenças raras, lúpus e fibromialgia.', cor: '#7C3AED', bg: '#F5F3FF', border: '#DDD6FE' },
  2:  { titulo: 'Março Lilás',      descricao: 'Mês de conscientização sobre endometriose.', cor: '#9333EA', bg: '#FAF5FF', border: '#E9D5FF' },
  3:  { titulo: 'Abril Azul',       descricao: 'Mês mundial de conscientização sobre o autismo. Acolha, inclua e respeite.', cor: '#1D4ED8', bg: '#EFF6FF', border: '#BFDBFE' },
  4:  { titulo: 'Maio Laranja',     descricao: 'Prevenção ao abuso e exploração sexual infantil. Proteja as crianças.', cor: '#C2410C', bg: '#FFF7ED', border: '#FED7AA' },
  5:  { titulo: 'Junho Vermelho',   descricao: 'Mês do doador de sangue. Doe sangue, doe vida.', cor: '#B91C1C', bg: '#FEF2F2', border: '#FECACA' },
  6:  { titulo: 'Julho Amarelo',    descricao: 'Mês de prevenção às hepatites virais.', cor: '#A16207', bg: '#FEFCE8', border: '#FEF08A' },
  7:  { titulo: 'Agosto Dourado',   descricao: 'Mês do aleitamento materno e do desenvolvimento infantil saudável.', cor: '#92400E', bg: '#FFFBEB', border: '#FDE68A' },
  8:  { titulo: 'Setembro Amarelo', descricao: 'Prevenção ao suicídio. Fale sobre saúde mental — isso salva vidas.', cor: '#A16207', bg: '#FEFCE8', border: '#FEF08A' },
  9:  { titulo: 'Outubro Rosa',     descricao: 'Mês de prevenção ao câncer de mama. Cuide-se, faça o exame.', cor: '#BE185D', bg: '#FDF2F8', border: '#FBCFE8' },
  10: { titulo: 'Novembro Azul',    descricao: 'Mês de prevenção ao câncer de próstata.', cor: '#1D4ED8', bg: '#EFF6FF', border: '#BFDBFE' },
  11: { titulo: 'Dezembro Laranja', descricao: 'Mês de conscientização sobre leucemia e cânceres infantis.', cor: '#C2410C', bg: '#FFF7ED', border: '#FED7AA' },
}
```

`new Date().getMonth()` seleciona a entrada. Sem banco, sem admin, sem config.

### Exibição
Usa as cores `cor`/`bg`/`border` do mês para estilizar o banner — mesma estrutura visual do banner de altas pendentes já existente.

---

## 5. Arquivos alterados

| Arquivo | Mudança |
|---|---|
| `lib/campanhas-saude.ts` | Novo — mapa hardcoded das 12 campanhas |
| `app/(admin)/admin/dashboard/page.tsx` | Adiciona queries de hoje/semana, renderiza 2 novos blocos |
| `app/(terapia)/terapia/dashboard/page.tsx` | Idem, escopo filtrado por terapeuta |
| `app/(portal)/portal/dashboard/page.tsx` | Adiciona apenas o bloco de campanha |

---

## 6. O que NÃO muda

- Nenhuma alteração em componentes existentes (`Card`, `Navbar`, etc.)
- Nenhuma alteração em CSS global ou variáveis de cor
- Nenhuma nova tabela no banco
- Nenhum novo endpoint de API
- Ordem dos blocos existentes inalterada
