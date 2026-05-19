# Insight: Financeiro > Contas a Pagar (ClinicaExperts)

## Estrutura idêntica a Contas a Receber — diferenças anotadas

### Tabs (valores em R$)
| Tab | Cor |
|-----|-----|
| Vencidos | 🔴 |
| Vencem hoje | 🟡 |
| A vencer | 🔵 |
| **Pagos** | 🟢 (≠ "Recebidos" de contas a receber) |
| Total do período | 🔵 |

### Colunas padrão
Vencimento | Pagamento | Descrição | Categoria | Método | Situação | Valor líquido

### Colunas opcionais (⚙️ off por padrão)
Conta financeira, Valor bruto, Tarifas, **Descontos**, **Multa**, **Juros**, **Uso de saldo**

### Situação badges
- **Pago** — verde
- **Em atraso** — rosa/vermelho + borda esquerda vermelha na linha
- **Em aberto** — amarelo

---

## Despesas reais da clínica (dados de demonstração)
Útil como referência de categorias de despesa para uma clínica:
- Software de Gestão (R$ 239)
- Limpeza (R$ 300)
- Assessoria Jurídica (R$ 980) — em atraso
- Manutenção de Equipamentos (R$ 800)
- Material de Escritório (R$ 150)
- **Aluguel da Clínica (R$ 1.200)**
- Água (R$ 400)
- Energia Elétrica (R$ 500)
- Internet (R$ 300)
- Serviços Contábeis (R$ 750) — em aberto
- Telefone Fixo (R$ 150) — em aberto

> Categorias relevantes pro Alicerce: Aluguel, Água, Energia, Internet, Software, Contabilidade, Manutenção, Material.

---

## Modal Detalhes da parcela — diferenças vs Contas a Receber

| Aspecto | Contas a Receber | Contas a Pagar |
|---------|-----------------|----------------|
| Título seção | "Informações da receita" | "Informações da despesa" |
| Colunas do resumo | 3 (Recebido / A receber / Em aberto) | 2 (Valor pago / Valor em aberto) |
| Botões rodapé | nenhum visível | **Imprimir** + **Editar** |

---

## Para o Alicerce

Mesma tabela `lancamentos_financeiros` com campo `tipo: 'receber' | 'pagar'`.
Despesas da clínica (aluguel, contas, etc.) são lançamentos do tipo `pagar` sem vínculo com paciente.
Despesas vinculadas a paciente (reembolso, etc.) teriam `paciente_id` preenchido.
