# RIPD — Relatório de Impacto à Proteção de Dados Pessoais
**Alicerce Espaço Terapêutico Infantil**
CNPJ: 49.273.342/0001-74
Encarregada (DPO): Isabella Alvarenga de Oliveira — (34) 9 9290-0583
Data de elaboração: 2026-04-25
Revisão prevista: 2027-04-25

> Base legal: LGPD Art. 38 — a autoridade nacional pode determinar ao controlador que elabore relatório de impacto à proteção de dados pessoais, especialmente quando o tratamento tiver como fundamento o legítimo interesse.

---

## 1. Descrição do Tratamento

**Sistema avaliado:** Portal Alicerce — sistema de gestão clínica e comunicação com famílias para clínica de terapia ocupacional infantil.

**Operações de tratamento:**
- Coleta e armazenamento de dados cadastrais de crianças e responsáveis
- Registro e acesso a prontuários eletrônicos (dados sensíveis de saúde)
- Comunicação entre equipe clínica e família via portal digital
- Agendamento de sessões
- Upload e download de documentos médicos e relatórios

**Titular dos dados:** Crianças e adolescentes em tratamento + seus responsáveis legais.

---

## 2. Necessidade e Proporcionalidade

| Critério | Avaliação |
|---|---|
| **Adequação** | Os dados tratados são adequados à finalidade clínica e ao cumprimento das obrigações do COFFITO |
| **Necessidade** | Apenas os dados estritamente necessários são coletados. CPF do paciente é obrigatório para identificação; dados clínicos são obrigatórios por lei |
| **Proporcionalidade** | Volume de dados justificado pela obrigação de guarda de 20 anos do prontuário. Sem coleta além do necessário |

---

## 3. Identificação de Riscos

### 3.1 Acesso não autorizado ao banco de dados

| Item | Detalhe |
|---|---|
| **Probabilidade** | Baixa — Supabase com RLS ativo, credenciais de service_role fora do cliente |
| **Impacto** | Alto — dados sensíveis de saúde de crianças |
| **Risco residual** | Médio |
| **Mitigação** | RLS por role, criptografia de disco AES-256 (Supabase), variáveis de ambiente fora do código-fonte, hash de integridade em todas as entidades clínicas |

### 3.2 Acesso indevido por funcionário da clínica

| Item | Detalhe |
|---|---|
| **Probabilidade** | Baixa — equipe pequena, cada terapeuta acessa somente seus pacientes |
| **Impacto** | Alto |
| **Risco residual** | Baixo |
| **Mitigação** | RLS por vínculo (`paciente_terapeutas`), log de auditoria de todas as visualizações, sistema de permissões granulares por usuário |

### 3.3 Vazamento por injeção SQL / vulnerabilidade na aplicação

| Item | Detalhe |
|---|---|
| **Probabilidade** | Baixa — uso de Supabase SDK com queries parametrizadas, sem SQL raw no código |
| **Impacto** | Alto |
| **Risco residual** | Baixo |
| **Mitigação** | Queries via Supabase client (paramétrico), validação de inputs, RLS como última linha de defesa |

### 3.4 Exposição de dados por acesso de familiar a relatório de outra família

| Item | Detalhe |
|---|---|
| **Probabilidade** | Muito baixa — RLS garante que pai só acessa pacientes vinculados |
| **Impacto** | Alto |
| **Risco residual** | Muito baixo |
| **Mitigação** | RLS com `paciente_responsaveis`, verificação de vínculo em toda query do portal |

### 3.5 Acesso após alta do paciente

| Item | Detalhe |
|---|---|
| **Probabilidade** | Baixa |
| **Impacto** | Médio |
| **Risco residual** | Muito baixo |
| **Mitigação** | `bloquear_acesso_portal` via permissões, status do paciente visível no portal, agendamentos futuros removidos na alta |

### 3.6 Dados de crianças sem consentimento parental

| Item | Detalhe |
|---|---|
| **Probabilidade** | Muito baixa — cadastro feito pela clínica com contrato físico assinado |
| **Impacto** | Alto (LGPD Art. 14) |
| **Risco residual** | Baixo |
| **Mitigação** | Contrato físico com consentimento específico para menores, ConsentimentoModal no primeiro acesso do responsável ao portal |

### 3.7 Perda de dados (ausência de backup)

| Item | Detalhe |
|---|---|
| **Probabilidade** | Baixa — Supabase realiza backups automáticos diários |
| **Impacto** | Alto — prontuários são obrigação legal |
| **Risco residual** | Baixo |
| **Mitigação** | Backups automáticos Supabase (PITR no plano Pro), política de não-deleção de prontuários no sistema |

---

## 4. Medidas de Proteção Implementadas

| Categoria | Medida |
|---|---|
| **Autenticação** | E-mail + senha via Supabase Auth, sem acesso anônimo a dados |
| **Autorização** | Row Level Security em todas as tabelas, sistema de permissões granulares por usuário |
| **Integridade** | Hash SHA-256 em relatórios, orientações, documentos, dados clínicos, alta |
| **Auditoria** | Log de todas as visualizações de prontuário, registros imutáveis |
| **Retenção** | Bloqueio de deleção de prontuários com registros clínicos, proteção pós-alta via RLS RESTRICTIVE |
| **Transparência** | Política de Privacidade pública, ConsentimentoModal com timestamp, DPO identificada no portal |
| **Criptografia em trânsito** | HTTPS (TLS 1.3) em toda a aplicação via Vercel |
| **Criptografia em repouso** | AES-256 no disco (Supabase); CPF cifrado em coluna dedicada via `pgcrypto` (migrations 017/021/022), chave armazenada em `_app_config` com REVOKE para `anon`/`authenticated`, leitura via função SECURITY DEFINER `get_paciente_cpf` |

---

## 5. Conclusão e Nível de Risco Global

**Nível de risco:** **MODERADO → BAIXO** após implementação das medidas

A clínica é de pequeno porte, com equipe restrita e acesso controlado por role. Os dados tratados são sensíveis (saúde de crianças), mas o volume é limitado e a infraestrutura técnica implementa múltiplas camadas de proteção. O risco elevado do LGPD Art. 38 (que tornaria o RIPD obrigatório) **não se aplica** ao contexto atual.

**Recomendações pendentes:**
1. CPF cifrado já implantado (migrations 017, 021, 022 aplicadas; chave em `_app_config`). **Pendência residual:** concluir Fase 3 — drop da coluna `pacientes.cpf` em texto-claro após período de validação em produção.
2. Habilitar PITR (Point-in-Time Recovery) no plano Supabase Pro.
3. Revisar este documento anualmente ou em caso de mudança significativa no tratamento.

---

## 6. Aprovação

| | |
|---|---|
| **Controladora** | Isabella Alvarenga de Oliveira |
| **CREFITO** | 4/23934-TO |
| **Data** | 2026-04-25 |
| **Próxima revisão** | 2027-04-25 |
