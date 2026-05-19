# Insight: Configurações > Preferências do Sistema

Tela longa com todas as configurações globais da clínica. Organizada por seção.

---

## Geral
| Configuração | Valor no demo | Relevância Alicerce |
|---|---|---|
| Fuso horário | GMT-03:00 São Paulo | ✅ já hardcoded |
| Moeda | BRL - R$ | ✅ já hardcoded |
| Exibir dados financeiros | Toggle | ⭐ controlar visibilidade do módulo financeiro por role |
| Usar DRE | Toggle (off) | baixa prioridade |
| Usar abertura de caixa | Toggle (off) | baixa prioridade |
| Conciliação bancária | Toggle (off) | baixa prioridade |
| Categoria de receitas padrão | "Receitas de serviços" | ⭐ agendamento usa categoria padrão automaticamente |
| Conta de receitas padrão | "Banco padrão" | ⭐ lançamento vai para conta padrão |
| Conta de despesas padrão | "Banco padrão" | ⭐ idem |
| Transferir troco para paciente | Toggle (off) | baixa |

---

## Agenda
| Configuração | Valor no demo | Relevância Alicerce |
|---|---|---|
| Agendar agendamentos automaticamente | ON | baixa |
| **Intervalo de tempo de agenda** | **30 minutos** | ⭐⭐ Alicerce hardcoded — deveria ser configurável (clínicas com sessões de 45/50/60min) |
| **Primeiro dia da semana** | **Domingo** | ⭐ afeta calendário semanal e relatórios |
| **Bloquear horários em feriados nacionais** | Toggle (off) | ⭐⭐ Alicerce JÁ TEM tabela `feriados` — conectar = feature imediata |
| Habilitar lista de espera | Toggle (off) | ⭐ feature não implementada no Alicerce |
| Habilitar sala de espera | Toggle (off) | ⭐ feature parcial no Alicerce |
| Habilitar comentários | Toggle (off) | baixa |
| Lembretes de agendamento | "Configurar" | ⭐ conecta com módulo de mensagens |
| Aviso de agendamento criado/alterado/cancelado/confirmado | "Configurar" | ⭐ idem |

---

## Atendimentos
| Configuração | Valor | Relevância |
|---|---|---|
| Concluir agendamentos recusados automaticamente | ON | média — atualiza status |
| **Habilitar CID** | Toggle (off) | ⭐⭐ CID-10 relevante para terapia e convênio |
| **Restringir acesso a prontuários** | ON | ⭐⭐ LGPD — só profissional responsável acessa ficha |
| Habilitar atendimento obrigatório | Toggle (off) | baixa |
| Campos personalizados | "Configurar" | ⭐ campos extras por contato ou comanda |
| Código CBOS | campo texto | médio — para convênio/NFS |

---

## Impressão
- Preferências de impressão: "Configurar" (não expandido)

---

## Comissões
| Configuração | Relevância |
|---|---|
| Comissionar atendimentos | ON — baixa prioridade para clínica de terapia |
| Forma de disponibilidade | baixa |
| Custo adicional de serviços | baixa |

---

## Segurança
- Logs de autenticação de dois fatores — toggle

---

## Vendas
- Cashback, forma de disponibilização de crédito — **fora do escopo Alicerce**

---

## Notificações
- Enviar mensagens pelo WhatsApp — toggle global

---

## Menu de usuário (avatar topo direito)
Popover com: avatar + nome | Perfil | Preferências | Segurança | Sair
Ícones no header: ❓ Ajuda | 🔔 Notificações | avatar

| Item | Conteúdo esperado |
|------|-------------------|
| Perfil | Dados pessoais do usuário (nome, foto, e-mail) |
| Preferências | Config pessoais (notificações, idioma) — diferente de Preferências do Sistema |
| Segurança | Senha, 2FA, sessões ativas |
| Sair | Logout |

Alicerce já tem logout. Gap: página de Segurança (senha + 2FA) e Preferências pessoais separadas das da clínica.

---

## Síntese: o que Alicerce deveria ter como configuração

### Alta prioridade
| Configuração | Motivo |
|---|---|
| **Intervalo de tempo de agenda** | Clínicas com sessões de 45, 50, 60min precisam de grade diferente |
| **Bloquear horários em feriados** | Tabela `feriados` já existe — fácil de conectar |
| **Primeiro dia da semana** | Afeta calendário e UX |
| **Restringir acesso a prontuários** | LGPD — profissional X só vê pacientes seus |
| **Habilitar CID** | Necessário para convênio e prontuário clínico |
| **Categoria de receita padrão** | Agendamentos precisam de categoria financeira padrão |

### Média prioridade
| Configuração | Motivo |
|---|---|
| Conta financeira padrão | Para lançamento automático |
| Código CBOS | Para NFS / convênio |
| Campos personalizados por contato | Flexibilidade sem migração |

### Arquitetura sugerida
Tabela `configuracoes_clinica` (uma linha por clínica, JSONB ou colunas):
```sql
intervalo_agenda_minutos   integer default 30
primeiro_dia_semana        integer default 0  -- 0=domingo, 1=segunda
bloquear_feriados          boolean default false
restringir_prontuarios     boolean default true
cid_habilitado             boolean default false
categoria_receita_padrao   uuid FK categorias_financeiras
conta_receita_padrao       uuid FK contas_financeiras
conta_despesa_padrao       uuid FK contas_financeiras
```
