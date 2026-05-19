# Insight: Financeiro > Contas Financeiras (ClinicaExperts)

## Layout
- Cards por conta (grid)
- Card footer separado: Saldo total consolidado

## Cada card
- Ícone por tipo (banco = coluna grega, caixa = caixa registradora)
- Nome + tipo (ex: "Banco padrão / Conta Corrente")
- Saldo atual
- Menu ⋮

## Menu ⋮ por conta
| Ação | Descrição |
|------|-----------|
| Visualizar extrato | Abre extrato filtrado por esta conta |
| Visualizar movimentações | Lista de lançamentos desta conta |
| Editar conta | Nome, tipo, dados bancários |
| **Alterar saldo inicial** | Define saldo de abertura (para contas existentes) |
| **Transferir** | Transferência entre contas internas (ex: Caixa → Banco) |
| Excluir | Remove conta |

## Contas padrão do demo
- **Banco padrão** — Conta Corrente — R$ 2.431,00
- **Caixa** — Caixa — R$ 0,00
- Saldo total: R$ 2.431,00

## Para o Alicerce
Tabela `contas_financeiras`:
```
id, nome, tipo (banco|caixa|outro), saldo_inicial, ativo
```
"Alterar saldo inicial" = ajuste de abertura quando clínica já tem saldo antes de usar o sistema.
"Transferir" = lançamento do tipo `transferencia` que debita uma conta e credita outra.
