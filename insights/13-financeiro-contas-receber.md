# Insight: Financeiro > Contas a Receber (ClinicaExperts)

## Tabs de status com valores acumulados ⭐
Diferente das outras telas (que mostram contagem), aqui cada tab mostra **valor em R$**:

| Tab | Cor | Valor exemplo |
|-----|-----|--------------|
| Vencidos | 🔴 | R$ 750,00 |
| Vencem hoje | 🟡 | R$ 1.430,00 |
| A vencer | 🔵 | R$ 0,00 |
| A receber | 🔵 | R$ 0,00 |
| Recebidos | 🟢 | R$ 6.320,00 |
| **Total do período** | 🔵 | R$ 8.500,00 (selecionado) |

## Colunas da tabela
| Coluna | Detalhe |
|--------|---------|
| Vencimento ↕ | Data de vencimento do título |
| Recebimento ↕ | Data em que foi efetivamente pago (+ ícone 🕐 se em atraso) |
| Descrição ↕ | Nome do serviço/produto |
| Categoria ↕ | Categoria financeira (ex: "Receitas de serviços") |
| Método ↕ | Ícone do método de pagamento (boleto = barras, pix/cartão = losango) |
| Situação | Badge: **Recebido** (verde) / **Em atraso** (rosa) / **Em aberto** (amarelo) |
| Valor líquido (R$) ↕ | Valor após descontos/taxas |

## Indicadores visuais de inadimplência
- Linha com "Em atraso" tem **borda vermelha na esquerda** — destaque visual imediato
- Ícone 🕐 na coluna Recebimento para itens não pagos no prazo
- Fácil de escanear sem ler cada status badge

## Observação sobre dados de demonstração
A clínica demo é estética (Massagem, Preenchimento Facial, Toxina Botulínica). Os serviços reais do Alicerce seriam TO, Fono, Psicologia, Fisio. Estrutura é a mesma.

---

## Para o Alicerce

### Estrutura de dados necessária
```
lancamentos_financeiros:
  - id
  - tipo: 'receber' | 'pagar'
  - descricao
  - valor
  - data_vencimento
  - data_recebimento (null = pendente)
  - situacao: 'em_aberto' | 'recebido' | 'em_atraso' | 'cancelado'
  - categoria_id → categorias_financeiras
  - metodo_pagamento_id → metodos_pagamento
  - paciente_id (opcional, para vincular ao paciente)
  - agendamento_id (opcional, para vincular à sessão)
```

### Lógica de "Em atraso"
```sql
-- Considera em atraso se: data_vencimento < hoje AND data_recebimento IS NULL
UPDATE lancamentos SET situacao = 'em_atraso'
WHERE data_vencimento < CURRENT_DATE AND data_recebimento IS NULL;
```

---

## Modal: Detalhes da parcela

### Seção 1 — Informações da receita
- **Receita**: nome do serviço (link clicável)
- **Valor total**: valor bruto
- **Data de competência**: data de referência do lançamento
- **Cliente**: avatar + nome + tipo ("Cliente")

### Seção 2 — Detalhes do recebimento
- **Parcela X/Y** — suporta parcelamento (ex: 2/3 = segunda de três parcelas)
- **Valor da parcela**: valor desta parcela específica
- **Situação**: badge por parcela

Tabela de linha de pagamento:
| Campo | Detalhe |
|-------|---------|
| Método | Boleto / Pix / Cartão / etc. |
| Conta | Conta financeira de destino |
| Valor (R$) | Valor efetivo |
| Desc./Acr. | Desconto ou acréscimo aplicado |
| Vencimento | Data limite de pagamento |
| Pagamento | Data que o cliente pagou |
| Receb. | Data que entrou na conta |
| Situação | Badge por linha |
| Ações | ⋮ menu: **Desfazer pagamento** / **Editar vencimento** (desabilitado se já pago) / **Visualizar lançamento** |

### Seção 3 — Resumo financeiro (3 colunas)
| Item | Valor recebido | Valor a receber | Valor em aberto |
|------|---------------|----------------|----------------|
| Uso de saldo | | | |
| Desconto | | | |
| Juros | | | |
| Multa | | | |
| Tarifas | | | |
| **Total** | verde | azul | laranja |

> Suporta: saldo de crédito do paciente, descontos, juros por atraso, multa, tarifas de gateway de pagamento.

### Conceitos importantes para o Alicerce
- **Parcelamento** — sessões podem ser pagas em parcelas (ex: 10 sessões, paga em 3×)
- **Data de competência ≠ Data de pagamento ≠ Data de recebimento** — três momentos distintos
- **Uso de saldo** — paciente pode ter crédito (pagou a mais, ou pacote com sessões sobrando)
- **Juros/Multa** — aplicados automaticamente após vencimento

---

---

## Filtros disponíveis ("+ Adicionar filtro")

| Filtro | Uso |
|--------|-----|
| **Período de liquidação** | Range de datas + atalhos (Hoje / Esta semana / Este mês / Últimos 7 dias / Últimos 30 dias) |
| **Contato** | Filtrar por paciente/cliente específico |
| **Categorias** | Filtrar por categoria financeira |
| **Método de pagamento** | Boleto / Pix / Cartão / etc. |
| **Conta financeira** | Banco padrão / Caixa / etc. |
| **Situação da parcela** | Recebido / Em atraso / Em aberto |

> Mesmo padrão de filtros que toda a plataforma — 2 colunas: categorias + opções.

---

### UX a replicar
1. Tabs com valor acumulado por situação — muito mais útil que tabs com contagem
2. Borda vermelha na linha para inadimplência — escaneabilidade
3. Duas datas (vencimento vs recebimento efetivo) — essencial para controle real
