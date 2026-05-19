# Insight: Configurações > Fichas de Atendimentos

## Lista (9 registros, todos ativos)
- Colunas: Nome | Ativo (toggle) | ⚙️ | ⋮
- Link no topo: **"Editar minhas fichas ↗"** — abre provavelmente um form builder (não capturado)

## Fichas disponíveis no demo
| Ficha | Relevância para terapia |
|-------|------------------------|
| Anamnese | ✅ Alta — ficha inicial de avaliação |
| Capilar | ❌ Estética |
| Corporal | ❌ Estética |
| Epilação | ❌ Estética |
| Facial | ❌ Estética |
| Fotos e anexos | ✅ Média — upload de arquivos por sessão |
| Injetáveis | ❌ Estética |
| Orçamento | ⚠️ Financeiro — orçamento integrado ao atendimento |
| Plano de tratamento | ✅ Alta — estrutura do plano terapêutico |

## Conexão com outros módulos
- Cada ficha = template de formulário estruturado
- Ao criar atendimento, profissional seleciona qual ficha preencher
- Na listagem de atendimentos (insight 11), coluna "Fichas de atendimento" mostra qual template foi usado

## Para o Alicerce

### Situação atual
Alicerce tem `relatorios` — texto livre por sessão. Sem templates estruturados de formulário.

### Fichas relevantes para terapia (a criar)
1. **Anamnese** — campos: queixa principal, histórico, medicamentos, objetivo terapêutico
2. **Plano de tratamento** — metas, frequência semanal, número de sessões previstas, reavaliação
3. **Evolução de sessão** — o que já existe via `relatorios` (texto livre)
4. **Fotos e anexos** — já coberto pelo módulo de `documentos`

### Dois modelos de implementação

**Simples (template fixo):**
- Campos pré-definidos por tipo de ficha (sem form builder)
- Ficha de Anamnese = formulário com campos específicos hardcoded
- Rápido de implementar, pouca flexibilidade

**Flexível (form builder):**
- Clínica cria campos customizados (texto, número, seleção, etc.)
- Armazenado como schema JSON + respostas JSON
- Alta complexidade, alto valor

### Recomendação
Curto prazo: fichas fixas (Anamnese + Plano de tratamento) com campos pre-definidos.
Médio prazo: form builder simples (arraste tipo/label/obrigatório, salva como JSON schema).

## "Editar minhas fichas" — modal de visibilidade e ordem

**NÃO é form builder.** Controla quais fichas aparecem no atendimento e em que ordem.

### Layout: dual-list com drag & drop
```
[Não mostrar | 9 registros]  >>  [Mostrar | 0 registros]
  ⠿ Anamnese               >
  ⠿ Corporal               <
  ⠿ Facial                 <<
  ⠿ Epilação
  ⠿ Capilar
  ⠿ Orçamento
  ⠿ Plano de tratamento
```
- `>>` move todos para "Mostrar"
- `>` move item selecionado
- `<` / `<<` revertem
- Drag & drop para reordenar dentro de cada coluna
- Demo: nenhuma ficha em "Mostrar" (clínica não configurou)

### Dois níveis de controle
1. **Toggle Ativo/Inativo** (lista de fichas) = ficha existe no sistema
2. **Mostrar/Não mostrar** (este modal) = ficha aparece na tela de atendimento

### UX pattern — dual-list (TransferList)
Padrão útil para qualquer configuração "habilitar/ordenar subset de N itens".
Reutilizável no Alicerce para: campos visíveis em relatórios, colunas padrão, etc.
