# Insight: Configurações > Modelos de Atestados e Prescrições

## Lista
- Colunas: Nome | Tipo | Ativo | ⋮
- 1 registro no demo: "Atestado" / Tipo: Atestado
- Filtros: **Tipo** (Atestados / Prescrições) | Status

## Editor de modelo
Mesmo rich text editor dos outros templates (B/I/U, alinhamentos, {x} variáveis).
Sem seletor de fonte — mais simples que o editor de documentos.

## Template padrão "ATESTADO MÉDICO"
```
ATESTADO MÉDICO

Atesto, para os devidos fins, que o paciente [Nome completo], esteve 
sob cuidados médicos na [Nome da clínica].
Local: [Endereço da clínica]
[Data de hoje]

[Nome do profissional]
[Conselho do profissional]
```

## Variáveis
| Variável | Fonte |
|----------|-------|
| `Nome completo` | perfil do paciente |
| `Nome da clínica` | configurações da clínica |
| `Endereço da clínica` | configurações da clínica |
| `Data de hoje` | gerado automaticamente |
| `Nome do profissional` | perfil do profissional |
| **`Conselho do profissional`** | **campo novo** — ex: CRP 12345, CREFITO 67890 |

## Para o Alicerce

### `Conselho do profissional` — campo faltante em `profiles`
Cada terapeuta tem número de registro no conselho profissional:
- Psicólogo → CRP (Conselho Regional de Psicologia)
- Fisioterapeuta → CREFITO
- Fonoaudiólogo → CRFa
- Terapeuta Ocupacional → COFFITO / CREFITO
- Neuropsicólogo → CRP (especialidade)

Adicionar campo `conselho_profissional` (ex: "CRP 04/12345") em `profiles` ou em tabela de profissionais.

### Tipos a implementar
| Tipo | Relevância terapia | Complexidade |
|------|-------------------|--------------|
| **Atestado** | ✅ Alta — justificar faltas, licenças | Baixa |
| **Prescrição** | ✅ Média — psiquiatras/médicos | Média (numeração sequencial, dados ANVISA) |

### Implementação
Mesma estrutura de templates de documentos (insight 25):
- Tabela `modelos_atestados_prescricoes` com schema rich text + variáveis
- Geração de PDF = substituir tokens + renderizar HTML → PDF
- Fluxo: ficha de atendimento → bloco "Atestado" → seleciona modelo → gera PDF → disponibiliza para paciente / envia por e-mail

### Conexão com form builder (insight 30)
Bloco especializado "Atestado" no form builder usa estes modelos.
Bloco "Prescrição" e "Prescrição Memed" idem.
