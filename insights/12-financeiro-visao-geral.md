# Insight: Financeiro > Visão Geral (ClinicaExperts)

## KPIs principais (4 cards)
| Card | Valor exemplo | Cor |
|------|--------------|-----|
| **Receitas** | R$ 6.320 | preto |
| **Despesas** | -R$ 3.889 | preto |
| **A receber** | R$ 2.180 | preto |
| **A pagar** | -R$ 3.380 | preto |

## Fluxo de caixa
- Mesmo gráfico do dashboard home (Entradas/Saídas real vs previsto + linha de saldo)
- Tabs: Diária / Semanal / Mensal / Anual
- Período: 30 dias no exemplo

## Contas financeiras (lateral direita)
- Lista de contas cadastradas: "Banco padrão (Conta Corrente)" + "Caixa"
- Saldo por conta + **Saldo total consolidado**
- "Ver todas" link

## A receber (6 métricas)
- Inadimplência (vencido não pago) — em vermelho
- Para hoje
- Para este mês
- Para este ano
- Recebidos no mês
- Recebidos no ano

## A pagar (6 métricas)
- Em atraso — em vermelho
- Para hoje
- Para este mês
- Para este ano
- Pagos no mês
- Pagos no ano

## Categorias (donut)
- Toggle Receita / Despesa
- Receitas de serviços + Outros (por categoria cadastrada)

---

## Análise para o Alicerce

### Módulo financeiro completo = grande esforço
Requer construir do zero:
1. Tabelas: `contas_financeiras`, `lancamentos`, `categorias_financeiras`, `metodos_pagamento`
2. Lógica de contas a receber (vincular sessão → cobrança)
3. Lógica de contas a pagar (despesas da clínica)
4. Fluxo de caixa (entradas/saídas reais vs previstas)
5. Dashboard com KPIs

### O que torna complexo para terapia infantil
- Pagamento geralmente mensal (pacote de sessões) ou por sessão
- Responsável paga, não o paciente
- Pode ter cobrança proporcional se faltou sessão
- Inadimplência precisa de notificação automática

### Partes mais valiosas (se implementar)
1. **Inadimplência** — quem está em atraso, fácil de visualizar
2. **A receber esta semana** — fluxo de caixa próximo
3. **Categorias de receita** — separar TO / Fono / Psico

### Decisão
Módulo financeiro é o **maior gap estratégico** mas também **maior esforço**.
Recomendado como fase 2 após consolidar as melhorias de menor esforço.
