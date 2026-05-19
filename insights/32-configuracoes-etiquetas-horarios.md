# Insight: Configurações > Etiquetas + Horários de Funcionamento

---

## Etiquetas

### Layout
- Lista vazia no demo
- Botão "+ Adicionar etiqueta"
- Ações em lote

### Modal "Nova tag"
- Nome*
- Cor (seletor — padrão: Cinza)

### Para o Alicerce
Etiquetas já referenciadas em insight 07 (coluna "Etiquetas" em Contatos/Pacientes) e insight 09 (Frequência).
Feature = tags coloridas para segmentar pacientes (ex: "Alta complexidade", "Convênio X", "Lista de espera").

```sql
etiquetas (
  id uuid PK,
  clinica_id uuid FK,
  nome text,
  cor text default '#6B7280',
  ativo boolean default true
)

paciente_etiquetas (
  paciente_id uuid FK pacientes,
  etiqueta_id uuid FK etiquetas,
  PRIMARY KEY (paciente_id, etiqueta_id)
)
```

---

## Horários de Funcionamento

### Layout
- Uma linha por dia da semana (Domingo → Sábado)
- Toggle ON/OFF por dia
- Quando ON: [hora início] — [hora fim] — [🗑️] + [+ Adicionar]
- "+ Adicionar" = adiciona segundo range no mesmo dia (ex: 08:00-12:00 + 14:00-18:00 para intervalo de almoço)

### Configuração no demo
| Dia | Status | Horário |
|-----|--------|---------|
| Domingo | OFF | — |
| Segunda-feira | ON | 08:00 – 18:00 |
| Terça-feira | ON | 08:00 – 18:00 |
| Quarta-feira | ON | 08:00 – 18:00 |
| Quinta-feira | ON | 08:00 – 18:00 |
| Sexta-feira | ON | 08:00 – 18:00 |
| Sábado | OFF | — |

### Para o Alicerce

**Uso:**
- Grade de agendamentos só exibe slots dentro do horário de funcionamento
- Bloqueio de agendamentos fora do horário
- Conecta com "Bloquear feriados" (insight 26) — feriados sobrepõem horário normal

**Schema:**
```sql
horarios_funcionamento (
  id uuid PK,
  clinica_id uuid FK,
  dia_semana integer,  -- 0=domingo, 1=segunda, ..., 6=sábado
  hora_inicio time not null,
  hora_fim time not null
  -- múltiplas linhas por dia = múltiplos turnos
)
```
Exemplo com intervalo de almoço:
```
dia_semana=1, hora_inicio=08:00, hora_fim=12:00
dia_semana=1, hora_inicio=14:00, hora_fim=18:00
```

**UX note:** Horário por profissional pode ser diferente do horário da clínica.
ClinicaExperts provavelmente tem horário por profissional também (não capturado aqui).
