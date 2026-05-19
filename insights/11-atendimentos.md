# Insight: Atendimentos (ClinicaExperts)

## Listagem de atendimentos

### Colunas
| Coluna | Detalhe |
|--------|---------|
| Data ↕ | Data do atendimento |
| Paciente ↕ | Nome (clicável) |
| Profissional ↕ | Terapeuta vinculado |
| **Fichas de atendimento** ↕ | Tipo de ficha clínica usada (ex: "Anamnese") |
| Status ↕ | Badge: "Em andamento" |
| ⚙️ / ⋮ | Config colunas / menu linha |

### Insight: Fichas de atendimento vinculadas ⭐
- Cada atendimento mostra **qual ficha clínica** foi preenchida
- "Anamnese" = ficha de avaliação inicial
- Outros tipos possíveis: Evolução, Alta, Avaliação motora, etc.
- Isso pressupõe "Fichas de atendimentos" configuráveis (visto em Configurações)

### Status "Em andamento"
- Atendimentos têm ciclo de vida próprio, separado do agendamento
- Provavelmente: Agendado → Em andamento → Concluído

---

## Guias SP/SADT — 🟡 Relevante se clínica atende convênio

Modal "Nova Guia SP/SADT":
- **Paciente*** — busca/seleciona
- **Convênio*** — plano de saúde (Unimed, SulAmérica, etc.)
- **Nº Carteirinha** + **Vencimento** — dados do beneficiário
- **Solicitante*** — profissional que solicita o procedimento
- **Executante** — profissional que executa (pode ser diferente)
- "Gerar guia" (split button — provavelmente gera PDF da guia)

> Guias SP/SADT são formulários obrigatórios para cobrar convênio médico.
> SP = Serviço Profissional (consulta/terapia), SADT = Serviço Auxiliar de Diagnóstico e Terapia.

### Para o Alicerce
Se a clínica atende convênio, isso é necessário. Requer:
1. Cadastro de convênios (nome, código ANS, tabela de valores)
2. Vínculo paciente → convênio + carteirinha
3. Geração do formulário SP/SADT em PDF no padrão TISS (ANS)
4. Controle de guias enviadas/aprovadas/negadas

**Esforço: alto** — padrão TISS tem formato específico regulado pela ANS.
Verificar com a clínica se atende convênio ou é 100% particular.

---

## O que trazer para o Alicerce

### Fichas de atendimento configuráveis ⭐
Conceito mais relevante desta seção:
- Templates de ficha clínica por especialidade (TO, Fono, Psico, etc.)
- Cada especialidade tem perguntas/campos específicos
- Ex: Ficha de Anamnese TO ≠ Ficha de Evolução Fonoaudiologia
- Vinculada a sessão/atendimento específico

Hoje no Alicerce temos `pacientes_dados_clinicos` (dados gerais) e `relatorios` (texto livre).
Fichas estruturadas por template seria evolução natural — formulário com campos definidos por especialidade.

**Esforço: alto** — requer:
1. Cadastro de templates de fichas (campos, tipos, ordem)
2. Preenchimento por sessão
3. Visualização histórica por paciente

**Prioridade: média** — útil mas não urgente dado que relatórios de texto livre já atendem.
