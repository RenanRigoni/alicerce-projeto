# Insight: Financeiro > Extrato de Movimentação (ClinicaExperts)

## Conceito
Lista cronológica unificada de **todas** as transações — receitas e despesas misturadas por data.
Equivale a extrato bancário da clínica.

## Tabs (5 — diferente das outras telas)
| Tab | Cor | Valor exemplo |
|-----|-----|--------------|
| Receitas em aberto | 🟢 | R$ 2.180,00 |
| Receitas realizadas | 🟢 | R$ 6.320,00 |
| Despesas em aberto | 🔴 | R$ 3.380,00 |
| Despesas realizadas | 🔴 | R$ 3.889,00 |
| **Total do período** | 🔵 | R$ 1.231,00 (saldo líquido) |

> Total = receitas realizadas − despesas realizadas (saldo do período)

## Diferenças vs Contas a Receber/Pagar

| Aspecto | Contas a R/P | Extrato |
|---------|-------------|---------|
| Conteúdo | Só receitas OU só despesas | Ambos misturados |
| Coluna data | "Recebimento" ou "Pagamento" | **"Execução"** (unificado) |
| Cor do valor | sem cor diferencial | **Verde = receita / Vermelho = despesa** |
| Filtro extra | — | **Tipo de título** (Receita / Despesa) |
| Menu ⋮ | Desfazer / Editar vencimento / Visualizar lançamento | + **Visualizar parcela** |

## Colunas
Vencimento | **Execução** | Descrição | Categoria | Método | Situação | Valor líquido (R$)

## Cor dos valores na coluna
- Despesas (Software, Limpeza, Aluguel...): **vermelho**
- Receitas (Massagem, Peeling...): **verde**
- Fácil distinguir tipo sem ler categoria

---

## Para o Alicerce
Query simples sobre `lancamentos_financeiros` sem filtro de tipo, ordenado por data.
Cor do valor via `tipo: 'pagar' → vermelho | 'receber' → verde`.
Saldo do período = `SUM(valor WHERE tipo='receber' AND situacao='recebido') - SUM(valor WHERE tipo='pagar' AND situacao='pago')`.
