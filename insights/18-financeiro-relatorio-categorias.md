# Insight: Financeiro > Relatório de Categorias (ClinicaExperts)

## Layout
- Navegação mês a mês (< Maio de 2026 >)
- Dois donuts lado a lado: **Receitas** (verde) | **Despesas** (rosa)
- Tooltip no hover: nome da categoria + % + R$
- Tabelas hierárquicas abaixo de cada donut

## Estrutura das tabelas
```
Receitas
├── Receitas (grupo pai, colapsável ∨)     100%  R$ 8.500,00
│   └── Receitas de serviços               100%  R$ 8.500,00
└── Total                                  100%  R$ 8.500,00 (verde)

Despesas
├── Outras despesas (grupo pai ∨)          100%  -R$ 7.269,00
│   └── Outras despesas                    100%  -R$ 7.269,00
└── Total                                  100%  -R$ 7.269,00 (vermelho)
```

**Categorias hierárquicas** — categoria pai agrupa subcategorias, cada uma com % do total.

## Para o Alicerce

### Categorias de receita relevantes (terapia)
- Terapia Ocupacional
- Fonoaudiologia
- Psicologia
- Fisioterapia
- Neuropsicologia
- Avaliação

### Categorias de despesa relevantes (clínica)
- Aluguel
- Folha de pagamento
- Material de consumo
- Software / Assinaturas
- Contabilidade
- Água / Energia / Internet
- Manutenção

### Implementação
Requer `categorias_financeiras` com campo `pai_id` (auto-referencial para hierarquia).
Relatório = `GROUP BY categoria_id` com JOIN na hierarquia.
Donut interativo com tooltip = biblioteca de charts (Recharts, Chart.js, etc.).
