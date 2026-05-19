# Insight: Financeiro > Métodos de Pagamento + Integração Maquininha

## Métodos de Pagamento (8 registros pré-cadastrados)

| Descrição | Tipo | Marca/Bandeira | Ativo padrão |
|-----------|------|----------------|--------------|
| Boleto | Boleto | Boleto | ✅ |
| Cartão de crédito | Cartão de crédito | Outro | ✅ |
| Cartão de débito | Cartão de débito | Outro | ✅ |
| Depósito | Depósito | Depósito | ❌ |
| Dinheiro | Dinheiro | Dinheiro | ❌ |
| Máquina de cartão | Máquina de cartão | Outro | ✅ |
| PIX | PIX | PIX | ✅ |
| Transferência | Transferência | Transferência | ❌ |

- Toggle ativo/inativo por método — desativado = não aparece nas opções de lançamento
- Linhas desativadas ficam visualmente acinzentadas (ícone ⋮ também acinzentado)
- Sistema pré-popula os 8 métodos, clínica desativa os que não usa

---

## Integração Maquininha

Dois cards de integração (ambos **Inativa** no demo):

| Integração | Descrição |
|-----------|-----------|
| **Stone** | Cobrar via maquininha Stone diretamente pelo sistema |
| **Infinite Tap (InfinitePay)** | Cobrar pelo celular (tap-to-pay via InfinitePay) |

Ambos têm botão "Configurar" que abre fluxo de autenticação com a operadora.

---

## Para o Alicerce

### Métodos de pagamento
Tabela simples `metodos_pagamento`:
```sql
id, nome, tipo, icone, ativo
```
Pré-popular com: PIX, Cartão de crédito, Cartão de débito, Boleto, Dinheiro, Transferência.

PIX é o mais relevante para clínica de terapia — recepção confirma pagamento manualmente após comprovante.

### Integração maquininha
Baixa prioridade — requer parceria com Stone/InfinitePay.
Mais relevante para clínicas com alto volume de atendimentos presenciais com pagamento no local.
