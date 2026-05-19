# Insight: Financeiro > Fluxo de Caixa Diário (ClinicaExperts)

## Layout
- Navegação por mês (< Maio 2026 >)
- Gráfico de barras (Entradas verde / Saídas vermelho) + linha de Saldo azul — um ponto por dia
- Tabela abaixo do gráfico: linha por dia do mês

## Tabela diária
| Coluna | Detalhe |
|--------|---------|
| Dia | 1 a 31 |
| Saldo inicial (R$) | Saldo que veio do dia anterior |
| Entrada (R$) ↓ | Receitas efetivadas no dia |
| Saída (R$) ↗ | Despesas pagas no dia |
| Lucro/Prejuízo (R$) | Entrada − Saída do dia |
| Saldo final (R$) | Saldo inicial + Lucro/Prejuízo |

## Drill-down por dia ⭐
- Clicar em linha de um dia abre **Extrato de movimentação** filtrado para aquela data
- Mostra todos os lançamentos (receitas + despesas) daquele dia específico
- "Saldo inicial da conta Caixa" e "Saldo inicial da conta Banco padrão" aparecem como lançamentos do tipo Transferência

## Filtros gerais (específicos desta tela)
| Filtro | Opções | Efeito |
|--------|--------|--------|
| Transferência | Sim/Não | Mostra/oculta transferências entre contas |
| Saldo inicial | Sim/Não | Mostra/oculta lançamentos de saldo inicial |
| Valor padrão | Líquido/Bruto | Exibe valor líquido ou bruto nas colunas |
| **Previsão** | Sim/Não | Mostra/oculta valores previstos (futuros) |

> "Previsão: Não" = só mostra dinheiro que já entrou/saiu. "Previsão: Sim" = inclui lançamentos futuros agendados (valor previsto).

## Total do período negativo
No extrato drill-down do dia 19/05: **Total = -R$ 920,00**
- Receitas realizadas: R$ 350,00
- Despesas realizadas: R$ 300,00
- Mas despesas em aberto = R$ 2.400,00 puxam o saldo negativo quando "previsão" ativada

---

## Fluxo de caixa mensal (variante)

Mesma estrutura, granularidade diferente:
- Navegação: **< 2026 >** (por ano, não por mês)
- Gráfico: barras por mês (Jan–Dez)
- Tabela: linhas por **mês** (Janeiro, Fevereiro... Dezembro)
- **Saldo carryforward**: saldo final de Maio = saldo inicial de Junho (carrega automaticamente)

Exemplo do demo:
| Mês | Entrada | Saída | Lucro/Prejuízo | Saldo final |
|-----|---------|-------|----------------|-------------|
| Maio | 6.320 | 3.889 | 2.431 | 2.431 |
| Junho | 0 | 0 | 0 | **2.431** (herdado) |
| Julho | 0 | 0 | 0 | **2.431** (herdado) |

### Variantes do fluxo de caixa
- **Diário**: navegação por mês, tabela dia a dia, drill-down por dia
- **Semanal**: (não capturado) provavelmente navegação por mês, agrupado por semana
- **Mensal**: navegação por ano, tabela mês a mês

---

## Para o Alicerce
Fluxo de caixa diário = relatório analítico sofisticado.
Requer todos os outros módulos financeiros primeiro.
Drill-down por dia é padrão de UX excelente — reutilizável em outros relatórios da plataforma.
