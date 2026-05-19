# Insight: Contatos > Frequência de Atendimentos (ClinicaExperts)

## Layout
- Listagem de pacientes com contagem de atendimentos no período
- Filtros pré-aplicados: Período + Número de atendimentos mínimo
- Exportar disponível

## Colunas
| Coluna | Detalhe |
|--------|---------|
| Nome ↕ | Avatar + nome do paciente |
| Etiquetas | Tags do paciente |
| Último atendimento ↕ | Data da sessão mais recente |
| Total ↕ | "X atendimentos" no período — ordenável |
| Telefone | Número + ícone WhatsApp clicável |
| ⚙️ | Configurador de colunas |

## Filtros ativos no exemplo
- **Período da consulta**: 19/04/2026 – 19/05/2026 (últimos 30 dias)
- **Número de atendimentos**: 1 (mostra quem teve ≥1 atendimento)

## Casos de uso da clínica
- **Pacientes mais frequentes** — ordenar Total decrescente
- **Pacientes inativos** — filtrar período recente com Total = 0 (ou ausentes da lista)
- **Alta frequência inesperada** — detectar paciente com muitas sessões extras
- **Comparar períodos** — mês atual vs mês anterior

---

## Para o Alicerce

### Dados já existem — implementação só de UI + query

```sql
SELECT
  p.id,
  p.nome,
  MAX(a.data_hora) AS ultimo_atendimento,
  COUNT(a.id) AS total_atendimentos
FROM pacientes p
JOIN agendamentos a ON a.paciente_id = p.id
WHERE a.data_hora BETWEEN :inicio AND :fim
  AND a.status IN ('realizado', 'concluido')
GROUP BY p.id, p.nome
HAVING COUNT(a.id) >= :minimo
ORDER BY total_atendimentos DESC;
```

### Onde encaixar no Alicerce
- `/admin/pacientes/frequencia` — página dedicada
- Ou aba extra dentro de `/admin/pacientes`

### Valor para a clínica
Alta — permite identificar pacientes que pararam de comparecer sem precisar verificar um por um. Recepção filtra "últimos 30 dias + 0 atendimentos" e já tem lista de quem ligar.

### Esforço
Baixo — dados em `agendamentos`, só query + tabela.
