# ROPA — Registro de Atividades de Tratamento de Dados
**Alicerce Espaço Terapêutico Infantil**
CNPJ: 49.273.342/0001-74
Encarregada (DPO): Isabella Alvarenga de Oliveira — (34) 9 9290-0583
Última atualização: 2026-05-12

> Base legal: LGPD Art. 37 — controladores e operadores devem manter registro das operações de tratamento de dados pessoais.

---

## 1. Cadastro de Pacientes

| Campo | Detalhe |
|---|---|
| **Finalidade** | Identificação do paciente, controle de atendimentos, emissão de prontuário eletrônico |
| **Base legal** | Art. 7, II (cumprimento de contrato) + Art. 11, II, a (tutela da saúde) |
| **Dados tratados** | Nome completo, data de nascimento, CPF, sexo, foto, endereço, histórico clínico |
| **Categoria** | Dados sensíveis de saúde (Art. 5, II) |
| **Titulares** | Crianças e adolescentes em tratamento (LGPD Art. 14) |
| **Destinatários** | Equipe clínica interna (profissionais vinculados), responsáveis legais |
| **Transferência internacional** | Não há |
| **Prazo de retenção** | 20 anos após encerramento do tratamento (COFFITO Res. 424/2013) |
| **Medidas de segurança** | RLS por role no Supabase, criptografia de disco AES-256, hash de integridade SHA-256, audit log |

---

## 2. Cadastro de Responsáveis (Família)

| Campo | Detalhe |
|---|---|
| **Finalidade** | Identificação do responsável legal, comunicação sobre tratamento, acesso ao portal |
| **Base legal** | Art. 7, II (contrato) + Art. 14, §1° (dados de crianças com consentimento do responsável) |
| **Dados tratados** | Nome, e-mail, telefone, endereço, CPF, contato de emergência |
| **Categoria** | Dados pessoais comuns |
| **Titulares** | Responsáveis legais (pais/tutores) |
| **Destinatários** | Equipe administrativa, profissional responsável |
| **Transferência internacional** | Não há |
| **Prazo de retenção** | Enquanto durar o vínculo contratual + 5 anos para fins fiscais |
| **Medidas de segurança** | Autenticação por e-mail/senha, RLS, consentimento registrado com timestamp |

---

## 3. Prontuário Eletrônico (Relatórios, Evoluções, Dados Clínicos)

| Campo | Detalhe |
|---|---|
| **Finalidade** | Registro do histórico clínico, continuidade do cuidado, obrigação legal/regulatória profissional |
| **Base legal** | Art. 11, II, a (tutela da saúde) + Art. 7, II (cumprimento de obrigação legal/regulatória profissional) |
| **Dados tratados** | Diagnóstico, hipótese diagnóstica, evolução clínica, plano terapêutico, observações, assinatura digital |
| **Categoria** | Dados sensíveis de saúde |
| **Titulares** | Pacientes (crianças/adolescentes) |
| **Destinatários** | Profissional responsável, responsável legal (relatórios publicados), equipe clínica autorizada |
| **Transferência internacional** | Não há |
| **Prazo de retenção** | 20 anos (COFFITO). **Não pode ser excluído a pedido do titular** (Art. 16, I) |
| **Medidas de segurança** | Hash SHA-256 por registro, assinatura digital com nome + timestamp, bloqueio de edição pós-alta (RLS), audit log de visualizações |

---

## 4. Agendamentos

| Campo | Detalhe |
|---|---|
| **Finalidade** | Gestão da agenda clínica, comunicação com família |
| **Base legal** | Art. 7, II (contrato de prestação de serviços) |
| **Dados tratados** | Data, horário, tipo de atendimento, paciente, profissional |
| **Categoria** | Dados pessoais comuns |
| **Titulares** | Pacientes |
| **Prazo de retenção** | 2 anos após a data do atendimento |
| **Medidas de segurança** | RLS por role |

---

## 5. Orientações Terapêuticas

| Campo | Detalhe |
|---|---|
| **Finalidade** | Suporte à família no cuidado domiciliar, extensão do tratamento |
| **Base legal** | Art. 11, II, a (tutela da saúde) |
| **Dados tratados** | Texto/vídeo/PDF de orientação clínica, vinculação ao paciente |
| **Categoria** | Dados sensíveis de saúde |
| **Titulares** | Pacientes e responsáveis |
| **Prazo de retenção** | 20 anos (segue prontuário) |
| **Medidas de segurança** | Hash SHA-256, bloqueio pós-alta |

---

## 6. Log de Auditoria

| Campo | Detalhe |
|---|---|
| **Finalidade** | Rastreabilidade de acessos e operações sobre dados de saúde (LGPD Art. 37) |
| **Base legal** | Art. 7, IX (legítimo interesse do controlador) |
| **Dados tratados** | ID do usuário, ação, tipo de recurso, ID do recurso, timestamp |
| **Categoria** | Metadados de acesso |
| **Destinatários** | Apenas administrador da clínica |
| **Prazo de retenção** | 5 anos |
| **Medidas de segurança** | Somente leitura para admin, sem deleção via aplicação |

---

## 7. Consentimento LGPD (Portal da Família)

| Campo | Detalhe |
|---|---|
| **Finalidade** | Registro da base legal de consentimento para tratamento de dados do responsável |
| **Base legal** | Art. 7, I (consentimento livre, informado e inequívoco) |
| **Dados tratados** | ID do usuário, timestamp do aceite |
| **Prazo de retenção** | Mesmo da conta do responsável |

---

## 8. Imagens / Câmeras de Segurança

| Campo | Detalhe |
|---|---|
| **Finalidade** | Segurança patrimonial e das crianças nas dependências da clínica |
| **Base legal** | Art. 7, IX (legítimo interesse) |
| **Dados tratados** | Imagens de vídeo das instalações físicas |
| **Prazo de retenção** | 30 dias (sobrescrição automática) |
| **Aviso** | Afixado na entrada da clínica e informado na política de privacidade digital |

---

## Suboperadores (terceiros que processam dados em nome da clínica)

| Fornecedor | Papel | Dados | País | Garantias |
|---|---|---|---|---|
| Supabase Inc. | Banco de dados e autenticação | Todos os dados listados | EUA (AWS) | SOC 2 Type II, DPA disponível |
| Vercel Inc. | Hospedagem da aplicação | Logs de acesso, metadados HTTP | EUA | DPA disponível |

---

*Este documento deve ser revisado anualmente ou sempre que houver nova operação de tratamento de dados.*
