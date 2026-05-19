# Insight: Menu de Navegação — ClinicaExperts

## Menu principal deles vs nossa plataforma

| Módulo | ClinicaExperts | Alicerce | Relevante? |
|--------|---------------|----------|------------|
| Assinatura | ✅ | ❌ | ❌ Não |
| Onboarding de Boas-Vindas | ✅ | ❌ | 🟡 Talvez (passo-a-passo 1º acesso) |
| Início / Dashboard | ✅ | ✅ (admin) | ✅ Já temos |
| Agenda | ✅ | ✅ | ✅ Já temos |
| Contatos | ✅ | ✅ (parcial) | ✅ Ver submenus |
| Atendimentos | ✅ | ✅ (parcial) | 🟡 Parcial — ver análise |
| Vendas | ✅ | ❌ | ❌ Não |
| Financeiro | ✅ | ❌ | ✅ **GAP importante** |
| Comissões | ✅ | ❌ | ❌ Não |
| Estoque | ✅ | ❌ | ❌ Não |
| Comunicação | ✅ | ✅ (parcial) | ✅ Ver submenus |
| CliniDocs | ✅ | ✅ (parcial) | ✅ Ver submenus |
| Marketing | ✅ | ❌ | ❌ Não |
| Configurações | ✅ | ✅ (parcial) | ✅ Ver submenus |

---

## Submenus interessantes

### Agenda
- **Visão geral** — provavelmente uma view diferente (multi-terapeuta, por sala, etc.)
- **Relatório de agendamentos** — exportação/análise de sessões por período
- **Eventos** — agendamentos não-clínicos (reuniões, capacitações, etc.)

> Temos: CalendarioAgenda por terapeuta, admin vê todos. Falta: visão consolidada multi-terapeuta e relatório exportável.

### Contatos
- **Aniversariantes** — listagem de pacientes por data de aniversário
- **Frequência** — relatório de presença (temos lógica mas não tela dedicada)
- **Mesclar contatos** — deduplicação de cadastros duplicados
- **Leads** — prospecção de novos pacientes (fora do nosso escopo atual)
- **Fornecedores** — fora do escopo

> Temos: lista de pacientes, filtros básicos. Falta: aniversariantes, relatório de frequência visual.

### Financeiro ⭐ MAIOR GAP
- Visão geral financeira
- Contas a receber / Contas a pagar
- Extrato de movimentações
- Relatório de competência
- Fluxo de caixa (diário e mensal)
- Relatório de categorias
- Contas financeiras / Categorias / Métodos de pagamento

> Não temos nada de financeiro. Dependendo da demanda da clínica, poderia ser módulo futuro relevante.

### Atendimentos
- **Listagem** — histórico geral de atendimentos realizados (todos os terapeutas/pacientes)
- **Atestados e prescrições** — geração de atestados médicos e prescrições com templates
- **Guias SP/SADT** — formulários de convênio (SP = Serviço Profissional, SADT = Serviço Auxiliar de Diagnóstico e Terapia)

> Temos: sessões/agendamentos com status, relatórios clínicos. Falta: listagem histórica consolidada de atendimentos, geração de atestados. Guias SP/SADT = convênio, fora do escopo (Alicerce é particular).

### Comunicação
- **Modelos de mensagens** — templates reutilizáveis (WhatsApp, e-mail, SMS)
- **Central de notificações** — hub central de todas as notifs

> Temos: push notifications, comunicados (admin→família). Falta: modelos de mensagem reutilizáveis.

### CliniDocs
- **Documentos e assinaturas** — assinatura digital de documentos
- **Modelos de documentos** — templates de prontuário, atestado, prescrição

> Temos: relatórios com assinatura digital, documentos do paciente. Falta: modelos reutilizáveis de documentos/atestados.

### Configurações
- **Preferências do sistema** — configurações gerais da plataforma
- **Dados da clínica** — nome, logo, endereço, CNPJ
- **Procedimentos / Categorias de procedimentos** — catálogo de serviços (ligado ao financeiro)
- **Pacotes** — bundles de sessões (ex: pacote 10 sessões TO)
- **Salas de atendimento** — cadastro de salas físicas da clínica
- **Fichas de atendimentos** — templates de ficha clínica customizáveis por especialidade
- **Modelos de atestados e prescrições** — templates médicos reutilizáveis
- **Etiquetas** — tags para categorizar pacientes/atendimentos
- **Horários de funcionamento** — horário comercial da clínica

> Temos: configurações de usuários, permissões, feriados. Falta: dados da clínica (logo/CNPJ), salas, etiquetas, horários, modelos de fichas e atestados.

---

## Prioridades sugeridas (baixo esforço / alto valor)

1. **Etiquetas/tags** em pacientes — filtro rápido e categorização
2. **Relatório de frequência** — temos dados, falta a tela
3. **Aniversariantes** — simples, valor de relacionamento
4. **Dados da clínica** — logo, CNPJ, endereço (aparece nos PDFs gerados)
5. **Modelos de atestados** — templates reutilizáveis para terapeutas
6. **Salas de atendimento** — útil se a clínica crescer / múltiplas salas
7. **Listagem consolidada de atendimentos** — histórico por período
8. **Financeiro** — grande esforço, mas maior gap estratégico

## Fora do escopo Alicerce
- Leads / Marketing
- Vendas / Estoque / Comissões
- Assinatura SaaS

## Requer atenção — clínica atende convênio
- Guias SP/SADT — formulário obrigatório ANS (padrão TISS), esforço alto
- Convênio em filtros de pacientes/atendimentos — campo a adicionar
