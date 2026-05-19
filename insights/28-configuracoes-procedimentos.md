# Insight: Configurações > Procedimentos

## Lista
| Campo | Visível por padrão | Notas |
|-------|-------------------|-------|
| Nome | ✅ | |
| Categoria | ✅ | |
| Duração | ✅ | em minutos |
| Valor | ✅ | R$ |
| Ativo | ✅ | toggle inline |
| **Cor** | ❌ (column config) | cor na agenda |
| **Tempo de reconsulta** | ❌ (column config) | dias até próxima sessão |

Filtros: Status / Profissionais / Categoria

## Procedimentos no demo
| Nome | Duração | Valor |
|------|---------|-------|
| Anamnese | 60 min | R$ 250,00 |
| Atendimento | 60 min | R$ 200,00 |
| Avaliação | 60 min | R$ 150,00 |
| Reconsulta | 60 min | R$ 200,00 |

## Modal de edição — campos completos
| Campo | Detalhe |
|-------|---------|
| Nome* | texto |
| Valor de venda | R$ + tipo (Fixo / provavelmente Variável) |
| Custo adicional | custo operacional do procedimento (≠ preço de venda) |
| Cor* | seletor de cor (ex: Cinza) — aparece na agenda |
| Duração | minutos (padrão preenchido no agendamento) |
| **Tempo de reconsulta** | dias — dispara "Lembrete de retorno" automaticamente |
| Categoria | select + "+ Adicionar" inline |
| Ativo | toggle |

### Seção: Materiais de atendimento
- Select de materiais consumidos no procedimento
- Custo total calculado automaticamente
- Conecta com módulo de estoque (fora do escopo Alicerce por ora)

### Seção: Informações adicionais
- Descrição para o CliniSite (site público da clínica — não aplicável ao Alicerce)

## Categoria de procedimento (modal "Nova categoria")
Simples: Nome + Ativo. Flat (sem hierarquia).
Diferente de `categorias_financeiras` — classifica tipo de serviço, não receita/despesa.

---

## Para o Alicerce

### Cruzamento com schema atual
Verificar se existe tabela `procedimentos` com todos esses campos.

### Campos ausentes / a adicionar
| Campo | Motivo |
|-------|--------|
| **Cor** | Eventos coloridos na agenda por tipo de procedimento — alto valor visual |
| **Tempo de reconsulta** | Trigger para lembrete de retorno automático (já documentado em insight 23) |
| **Custo adicional** | Margem por procedimento — necessário para relatório de lucratividade |
| **Tipo de valor** (Fixo/Variável) | Sessões com convênio podem ter valor negociado |
| **Duração padrão** | Preenche automaticamente ao criar agendamento — evita erro manual |

### Esquema sugerido
```sql
procedimentos (
  id uuid PK,
  clinica_id uuid FK,
  nome text not null,
  valor_venda numeric(10,2),
  tipo_valor text default 'fixo' check (tipo_valor in ('fixo', 'variavel')),
  custo_adicional numeric(10,2) default 0,
  cor text default '#6B7280',
  duracao_minutos integer default 60,
  tempo_reconsulta_dias integer default 0,
  categoria_id uuid FK categorias_procedimentos,
  ativo boolean default true,
  created_at timestamptz
)

categorias_procedimentos (
  id uuid PK,
  clinica_id uuid FK,
  nome text,
  ativo boolean default true
)
```

### Categorias de procedimentos (página dedicada)
Página separada de CRUD para categorias (além do modal "+ Adicionar" inline dentro do procedimento).
Demo vazio — os 4 procedimentos cadastrados não tinham categoria (campo "-").
Ações em lote + Exportar disponíveis.
Schema já documentado em `categorias_procedimentos` acima.

### Uso da cor na agenda
Evento do agendamento herda cor do procedimento.
Sem cor definida = cor padrão (cinza).
Profissional pode ter cor própria também (conflito a resolver: prioridade procedimento vs profissional).

### Tempo de reconsulta
`tempo_reconsulta_dias > 0` → ao marcar agendamento como "Realizado", sistema agenda envio de mensagem em `data_realizado + tempo_reconsulta_dias`.
Conecta diretamente com template "Lembrete de retorno" do módulo de mensagens.
