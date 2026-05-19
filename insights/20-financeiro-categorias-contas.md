# Insight: Financeiro > Categorias de Contas (ClinicaExperts)

## Estrutura
- Lista hierárquica: **Categoria pai** → subcategorias indentadas
- Toggle ativo/inativo por linha (pai e filho independentes)
- "+ Adicionar subcategoria" inline sob cada pai
- Menu ⋮ por item (editar/excluir)
- Busca + filtro

## Categorias visíveis no print (sistema pré-popula)

```
Aquisições de imobilizados
  ├── Computadores e Periféricos
  ├── Edifícios e Construções
  ├── Máquinas e Equipamentos
  ├── Móveis, Utensílios e Instalações
  ├── Terrenos
  └── Veículos

Aquisições de mercadorias
  ├── Compras de materiais de atendimento
  └── Compras de produtos para revenda

Comissões
  ├── Comissões de profissionais
  └── Comissões de vendedores
```

> Provavelmente há mais categorias abaixo (Despesas operacionais, Receitas de serviços, etc.)

## Categorias relevantes para clínica de terapia
Pré-popular no Alicerce com:

### Receitas
- Receitas de serviços
  - Terapia Ocupacional
  - Fonoaudiologia
  - Psicologia
  - Fisioterapia
  - Neuropsicologia
  - Avaliação/Triagem
- Convênios
  - (por operadora)

### Despesas
- Pessoal
  - Salários
  - Pró-labore
- Instalações
  - Aluguel
  - Água / Energia / Internet
- Operacional
  - Material de consumo
  - Software / Assinaturas
  - Contabilidade / Assessoria

## Para o Alicerce
Tabela `categorias_financeiras`:
```sql
id, nome, pai_id (FK self-referencial), tipo ('receita'|'despesa'), ativo, ordem
```
Sistema pré-popula categorias padrão. Clínica desativa as que não usa (toggle) e adiciona subcategorias customizadas.
