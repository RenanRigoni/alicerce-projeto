# Roadmap Alicerce — revisado pós-análise codebase + feedback

Baseado em 33 insights ClinicaExperts + análise das migrations reais.
Fases sequenciais; cada uma entregável antes da próxima começar.

---

## Já existe no sistema (não implementar de novo)
- Busca CEP automática (ViaCEP) ✓
- Conselho profissional + Nº registro ✓ (migration 033)
- Especialidade do profissional ✓
- Confirmação de agendamento por link ✓
- Web Push / notificações push ✓ (migration 034)
- Evolução estruturada (não texto livre) ✓ — tabela `evolucoes` com 9 campos
- Dados clínicos extensos ✓ — tabela `pacientes_dados_clinicos` com 17 campos

## Descartado (futuro ou fora do escopo atual)
- Cor por profissional/procedimento na agenda — não solicitado
- Horário de atendimento próprio por profissional — não necessário
- Módulo financeiro — não solicitado pela clínica, oferecer futuramente
- Atestado médico — não solicitado agora
- WhatsApp Business API — clínica envia manualmente; automatizar futuramente
- Google Agenda sync — OAuth complexo, baixo impacto imediato
- Fluxo de caixa + relatórios financeiros — futuro
- Integração maquininha — futuro

---

## Fase 1 — Cadastros (fundação)
> **Por que primeiro:** dados ricos de paciente e profissional são pré-requisito para as fases seguintes.

### 1.1 Ficha do paciente expandida
- [ ] Verificar campos faltantes no formulário atual: RG, estado civil, profissão, endereço completo
- [ ] Cor de identificação do paciente (chip colorido na listagem e agenda)
- [ ] Etiquetas coloridas (ex: "Convênio X", "Alta complexidade", "Lista de espera")
      Schema: tabela `etiquetas` (nome, cor, clinica_id) + `paciente_etiquetas`
- [ ] Contatos adicionais por tipo (celular pessoal, responsável, comercial, etc.)
- [ ] Observações internas (nota privada da recepção — não visível ao responsável)
- [ ] **Estrutura em tabs no perfil:** Informações | Atendimentos | Documentos

### 1.2 Perfil do profissional — gaps restantes
- [x] UF do conselho (campo opcional — para atestados e NFS-e futuros) — #FEITO-NECESSARIO-REVISAR
- [x] Código CBO (opcional — convênio/NFS-e) — #FEITO-NECESSARIO-REVISAR
- [ ] Biografia (textarea — exibida no portal para responsáveis)

### 1.3 Configurações da clínica
- [ ] Logotipo (upload — necessário para PDF, e-mail e portal)
- [ ] Dados fiscais: CNPJ/CPF, razão social, nome fantasia, tipo PF/PJ
- [ ] Endereço comercial + endereço de cobrança separado (NFS-e futuro)
- [ ] Intervalo de tempo da agenda configurável (30 / 45 / 50 / 60 min)
- [x] Primeiro dia da semana (domingo ou segunda) — #FEITO-NECESSARIO-REVISAR
- [ ] Horários de funcionamento por dia + múltiplos turnos
      Schema: tabela `horarios_funcionamento` (clinica_id, dia_semana, hora_inicio, hora_fim)
- [x] Toggle: bloquear agenda em feriados nacionais (**opcional** — profissional pode usar o feriado para atividade diferente) — #FEITO-NECESSARIO-REVISAR

---

## Fase 2 — Agenda melhorada
> **Por que segundo:** com cadastros ricos, a agenda ganha configurações que impactam o dia a dia.

- [x] **Bloqueio de horário** como tipo separado (profissional bloqueia a agenda e pode cancelar ou remarcar atendimento conflitante) — #FEITO-NECESSARIO-REVISAR
- [ ] Grade respeita horários de funcionamento da clínica (slots fora do horário ficam cinza)
- [ ] Flag por usuário: permitir agendamentos fora do horário (admin/recepção)
- [ ] Intervalo de tempo da agenda respeita configuração da Fase 1
- [x] Bloquear feriados automaticamente quando toggle ativado (tabela `feriados` já existe) — #FEITO-NECESSARIO-REVISAR

---

## Fase 3 — Comunicação por e-mail
> **Por que terceiro:** com agenda funcionando bem, o próximo valor é automatizar comunicação.

### 3.1 Infraestrutura
- [ ] Configurar Resend (e-mail transacional)
- [ ] Template base com logotipo da clínica (React Email)
- [ ] Sistema de variáveis: `{{nome_paciente}}`, `{{data}}`, `{{hora}}`, `{{profissional}}`, `{{clinica}}`

### 3.2 Automações de agendamento
- [ ] **Lembrete de agendamento** — e-mail X horas antes (antecedência configurável)
- [ ] **Aviso de agendamento criado** — e-mail para paciente/responsável
- [ ] **Aviso de agendamento cancelado** — e-mail para paciente/responsável

### 3.3 Automações periódicas
- [ ] **Resumo diário** — cron às 7h → e-mail para cada terapeuta com agenda do dia
- [ ] **Aniversariantes** — e-mail automático no dia do aniversário do paciente

### 3.4 Log de notificações
- [ ] Tela de histórico de notificações (admin): canal, status, destinatário, data

---

## Fase 4 — Fichas de atendimento (prioridade real)
> **Por que quarto:** núcleo clínico. Prontuário compliant com CRP/COFFITO/CFFa.

### 4.1 Anamnese — campos faltantes em `pacientes_dados_clinicos`
A tabela já existe com 17 campos, mas faltam os campos universais exigidos por todos os conselhos:

**Adicionar à tabela:**
```sql
queixa_principal          text     -- CRÍTICO — obrigatório CRP/COFFITO/CFFa
motivo_encaminhamento     text     -- como chegou (encaminhamento médico, espontâneo)
historico_saude           text     -- antecedentes pessoais (doenças, cirurgias)
medicamentos_em_uso       text     -- medicações atuais (interações, contraindicações)
alergias                  text
historico_familiar        text     -- patologias em familiares próximos
outros_profissionais      text     -- equipe interdisciplinar envolvida
gestante                  boolean
frequencia_semanal        integer  -- sessões por semana (plano de tratamento)
numero_sessoes_previstas  integer  -- duração estimada
data_reavaliacao          date     -- quando reavaliar
prognostico               text     -- expectativa de resultado
```

### 4.2 UI — reorganizar aba "Dados Clínicos" em seções colapsáveis
Hoje: 17 campos em lista plana. Proposta: dividir em 3 seções dentro da mesma aba:

**Seção: Anamnese**
- Queixa principal ← novo
- Motivo do encaminhamento ← novo
- Histórico de saúde ← novo
- Medicamentos em uso ← novo
- Alergias ← novo
- Histórico familiar ← novo
- Outros profissionais de saúde ← novo
- Gestante ← novo
- Hipótese diagnóstica ← já existe
- Diagnóstico confirmado ← já existe
- Data da avaliação inicial ← já existe

**Seção: Plano de Tratamento**
- Demandas prioritárias ← já existe
- Objetivos terapêuticos ← já existe
- Estratégias utilizadas ← já existe
- Metas de curto prazo ← já existe
- Metas de médio prazo ← já existe
- Frequência semanal ← novo
- Nº sessões previstas ← novo
- Data de reavaliação ← novo
- Prognóstico ← novo
- Orientações para casa ← já existe

**Seção: Acompanhamento**
- Evolução resumida ← já existe
- Observações clínicas gerais ← já existe
- Sensibilidades e restrições ← já existe
- Nível de suporte ← já existe
- Comportamento e regulação ← já existe
- Informações escolares ← já existe
- Pontos de atenção para a equipe ← já existe

### 4.3 CID-10
- [ ] Campo CID-10 por atendimento/evolução (código + descrição)
- [ ] Necessário para convênio e prontuário clínico formal

### 4.4 Evolução de sessão — melhorias pontuais
- [ ] Campo CID por evolução (código aplicado naquela sessão específica)
- [ ] Procedimentos realizados na sessão
- [ ] Intercorrências

---

## Resumo executivo

| Fase | Foco | Impacto |
|------|------|---------|
| **1 — Cadastros** | Paciente rico, config da clínica | Fundação de tudo |
| **2 — Agenda** | Bloqueio, horários, feriados | Uso diário mais fluido |
| **3 — E-mail** | Lembretes, resumo diário | Reduz trabalho manual da recepção |
| **4 — Fichas** | Anamnese completa, Plano de Tratamento | Prontuário compliant com CRP/COFFITO/CFFa |

---

## Futuro (pós-Fase 4)
- Módulo financeiro básico (contas a receber)
- Atestado médico (template + PDF)
- WhatsApp automation (Business API)
- Documentos e assinaturas (TCLE, contratos)
- Cores na agenda por profissional/procedimento
- Google Agenda sync
