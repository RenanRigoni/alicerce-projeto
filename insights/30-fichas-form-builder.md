# Insight: Fichas de Atendimento — Form Builder

## Layout
- Coluna esquerda: paleta de tipos de campo ("Adicionar novo campo" — arraste ou clique duplo)
- Área principal: canvas com campos existentes (ordem via drag & drop)
- Header: Nome da ficha | toggle Ativo | toggle **"Formulário de pré-atendimento"**
- Rodapé: Cancelar | Salvar

## Toggle "Formulário de pré-atendimento"
Quando ativo: ficha é enviada automaticamente ao paciente **antes** do agendamento.
Conecta diretamente com o template "Formulário de pré-atendimento" do módulo de mensagens (insight 23).

---

## Tipos de campo disponíveis (paleta — 15 tipos)

| Tipo | Descrição |
|------|-----------|
| Seleção única | Radio buttons (Sim/Não/Outro, etc.) |
| Seleção múltipla | Checkboxes |
| Seleção de imagem | Picker visual com imagens |
| Data | Date picker |
| Editor de texto | Rich text (Bold/Italic/alinhamentos) |
| Envio de arquivos | Upload qualquer arquivo |
| Envio de imagens | Upload imagens |
| Lista de itens | Bullet list editável |
| Lista única | Dropdown select |
| Lista múltipla | Multi-select |
| Número | Input numérico |
| Texto | Input texto curto |
| Texto longo | Textarea |
| Rótulo | Label/cabeçalho (sem input — separador visual) |
| Tabela | Tabela customizável |

---

## Campos pré-criados na ficha "Anamnese" (demo — estética)

| Campo | Tipo |
|-------|------|
| Queixa Principal | Editor de texto |
| Tratamentos anteriores | Editor de texto |
| Gestante? | Seleção única (Sim/Não/Outro) |
| Tabagista? | Seleção única (Sim/Não/Outro) |
| Possui diabetes? | Seleção única |
| Possui hipertensão? | Seleção única |
| Utiliza marcapasso? | Seleção única |
| Possui alterações hormonais ou na tireóide? | Seleção única |
| Possui doença hepática? | Seleção única |
| Utiliza filtro solar diariamente? | Seleção única |
| Utiliza medicamentos contínuos? | Seleção única |
| Realiza atividade física regular? | Seleção única |
| Já fez cirurgia? | Seleção única |
| Patologias cutâneas? | Seleção múltipla (Psoríase/Vitiligo/Lúpus/Rosácea/Outro) |
| Alterações pigmentares cutâneas? | Seleção múltipla (Sardas/Manchas senis/Melasma/Manchas por sequela/Outro) |
| Observações | Editor de texto |

> Demo é de clínica estética — campos específicos não relevantes para terapia, mas estrutura é igual.

---

## Blocos especializados (botão ✨ FAB)
Blocos pré-construídos para avaliações clínicas específicas:

| Bloco | Descrição |
|-------|-----------|
| **Atestado** | Permite enviar atestado médico ✅ relevante |
| **CID-11** | Inserir código CID-11 ✅ relevante |
| **Prescrição** | Prescrição médica ✅ relevante |
| **Prescrição Memed** | Integração com sistema Memed |
| **Editor de texto com modelo** | Texto com modelos pré-definidos ✅ |
| **Cálculo de IMC** | Avaliação de índice de massa corporal |
| **Curva de crescimento** | Avaliação pediátrica ✅ (TO infantil) |
| **Escala da percepção da imagem pessoal** | ✅ psicologia |
| **Orçamento** | Selecionar procedimentos/produtos para orçamento |
| Adipometria | estética |
| Alopecia areata | estética/dermatologia |
| Análise facial com IA | estética |
| Cicatrizes de acne | estética |
| Escala de Glogau / Fitzpatrick | dermatologia |
| Escala de Bristol / cor de urina | nutrição/medicina |
| Formato corporal / Somatótipo | estética/nutrição |
| Termografia | estética |
| Perimetria | estética/fisioterapia |
| Odontograma | odontologia |
| Grau de celulite / Estrias | estética |
| (vários outros de estética) | estética |

---

## Para o Alicerce

### Arquitetura do form builder

Schema da ficha (JSON):
```json
{
  "fields": [
    {
      "id": "uuid",
      "type": "rich_text",
      "label": "Queixa Principal",
      "required": false,
      "order": 1
    },
    {
      "id": "uuid",
      "type": "single_select",
      "label": "Gestante?",
      "options": ["Sim", "Não"],
      "has_other": true,
      "required": false,
      "order": 2
    }
  ]
}
```

Respostas do atendimento (JSON):
```json
{
  "field_uuid_1": "<p>Dificuldade de foco...</p>",
  "field_uuid_2": "Não"
}
```

Tabelas:
```sql
fichas_templates (
  id uuid, clinica_id uuid, nome text,
  schema jsonb,  -- definição dos campos
  ativo boolean, pre_atendimento boolean
)

fichas_respostas (
  id uuid, atendimento_id uuid, ficha_template_id uuid,
  respostas jsonb,  -- valores preenchidos
  preenchido_em timestamptz
)
```

### Implementação por fases

**Fase 1 — templates fixos (rápido):**
Anamnese e Plano de tratamento com campos pré-definidos hardcoded.
Sem form builder, sem JSON dinâmico.
Resposta = campos fixos na tabela.

**Fase 2 — form builder simples:**
JSON schema editável. Tipos: texto, texto longo, seleção única, seleção múltipla, número.
UI de drag & drop (react-beautiful-dnd ou dnd-kit).
Sem blocos especializados ainda.

**Fase 3 — blocos especializados:**
CID-11, Atestado, Prescrição, Curva de crescimento.
Cada bloco = componente customizado com lógica específica.

### Fichas relevantes para terapia (criar na Fase 1)
1. **Anamnese Terapêutica**
   - Queixa principal / motivo do encaminhamento (rich text)
   - Diagnóstico / hipótese diagnóstica (texto)
   - Histórico de saúde relevante (rich text)
   - Medicamentos em uso (texto)
   - Gestante? (sim/não)
   - Outros profissionais de saúde? (sim/não + qual)
   - Observações (rich text)

2. **Plano de Tratamento**
   - Objetivos terapêuticos (rich text)
   - Frequência semanal (número)
   - Número de sessões previstas (número)
   - Data de reavaliação (data)
   - Observações (rich text)

3. **Evolução de Sessão** (já existe via `relatorios` — migrar para ficha)
   - Atividades realizadas (rich text)
   - Observações clínicas (rich text)
   - Próximos objetivos (rich text)
