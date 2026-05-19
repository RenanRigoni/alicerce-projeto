# Insight: Financeiro > Relatório de Competência (ClinicaExperts)

## Conceito contábil: Competência vs Caixa
- **Extrato (regime de caixa)**: agrupa por data que o dinheiro entrou/saiu
- **Competência**: agrupa por data que o serviço foi prestado (independente de quando pagou)

> Exemplo: sessão de 30/04 paga em 05/05 → aparece em **abril** no relatório de competência, mas em **maio** no extrato.

Ambos os relatórios são obrigatórios para contabilidade correta.

---

## Diferenças vs Extrato

| Aspecto | Extrato | Relatório de Competência |
|---------|---------|--------------------------|
| Agrupamento | Data de liquidação/pagamento | Data de competência (serviço prestado) |
| Seletor de período | Range de datas (chips) | **Navegação mês a mês (< Maio 2026 >)** |
| Tabs | 5 (receitas abertas/realizadas, despesas abertas/realizadas, total) | **3** (Receitas, Despesas, Total do período) |
| Filtros | Período, Contato, Categorias, Método, Conta, Tipo | Contato, Categorias, Tipo de título |
| Coluna data | Vencimento + Execução | **Competência** (só uma data) |
| Ações ⋮ | Desfazer / Editar vencimento / Visualizar parcela / Visualizar lançamento | Apenas **Visualizar lançamento** |

---

## Modal "Detalhes da receita" — campos novos

Vs modal de Contas a Receber, adiciona:
- **Parcelamento**: "1x" (número de parcelas)
- **Observação**: campo de texto livre ("Título de exemplo")
- Coluna **Recebido (R$)** e **Em aberto (R$)** separadas na tabela de parcelas
- **Botão $ (cifrão)** na linha = **ação rápida de dar baixa** sem abrir outro modal
- Situação "Em aberto" com badge amarelo (ainda não pago)

---

## Para o Alicerce
Dois relatórios financeiros distintos = mesmos dados, query diferente:
- Extrato: `GROUP BY DATE(data_liquidacao)`
- Competência: `GROUP BY DATE(data_competencia)` + navegação por mês

Botão $ para dar baixa rápida é excelente UX — marca parcela como paga com um clique.
