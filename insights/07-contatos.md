# Insight: Contatos (ClinicaExperts)

## Observação importante
Breadcrumb diz "Contatos > Pacientes" mas a lista mostra 3 tipos misturados:
- **Paciente** — Clara Ribeiro
- **Fornecedor** — Fornecedor de exemplo
- **Profissional** — Renan Rigoni

Isso sugere que é a view "Todos os contatos" — lista unificada de todas as pessoas do sistema com tipo indicado abaixo do nome.

---

## Colunas da tabela

| Coluna | Detalhe |
|--------|---------|
| ☐ checkbox | Seleção em lote |
| Avatar | Foto real ou inicial colorida (ex: "F" roxo para Fornecedor) |
| Nome ↕ | Nome + **tipo em roxo** abaixo (Paciente / Fornecedor / Profissional) |
| **Etiquetas** | Tags coloridas do contato — vazio neste exemplo |
| **Identificador** | Telefone + ícone WhatsApp clicável (verde) |
| **Ativo** | Toggle on/off diretamente na lista |
| ⚙️ / ⋮ | Configurar colunas / menu por linha |

---

## Destaques de UX

### Etiquetas na listagem ⭐
- Coluna dedicada para tags — visualmente inline
- Permite filtrar/segmentar sem abrir o cadastro
- No print está vazia mas o espaço já existe

### Ícone WhatsApp no telefone ⭐
- Número de telefone clicável com ícone W verde ao lado
- Provavelmente abre `https://wa.me/55...` direto
- Muito prático para recepção contatar responsável

### Toggle "Ativo" inline
- Liga/desliga contato diretamente na lista sem abrir modal
- Profissional Renan aparece inativo (toggle cinza)

### Avatar com inicial
- Quando sem foto: gera avatar colorido com inicial do nome
- Padrão consistente — nunca fica sem representação visual

---

## Configurador de colunas ⚙️ — campos disponíveis

### Visíveis por padrão
- Nome, Etiquetas, Identificador, Ativo

### Ocultos (disponíveis via ⚙️)
| Campo | Alicerce tem? | Obs |
|-------|--------------|-----|
| Email | ✅ (via auth) | |
| Sexo | ❓ verificar schema | |
| Data de nascimento | ❓ verificar schema | Necessário para aniversariantes |
| Idade | ❓ (calculada de data_nasc) | |
| Estado civil | ❌ | |
| Profissão | ❌ | Seria do responsável, não do paciente |
| Endereço | ❌ | |
| CPF | ✅ (cifrado) | |
| RG | ❌ | |
| CNPJ | ❌ | Fora do escopo |
| Origem | ❌ | Como o paciente chegou à clínica (indicação, Google, etc.) |
| Convênio | ❌ | Clínica atende convênio — campo necessário |
| Cor | ❌ | Raça/etnia — dado sensível LGPD |
| Papéis | ❌ | Papel no sistema (Paciente, Responsável, etc.) |

> **"Origem"** é interessante: saber se veio por indicação, Instagram, Google, etc. Útil para a clínica medir canais de aquisição sem precisar de módulo de marketing.

---

## Filtros disponíveis ("+ Adicionar filtro")

| Filtro | Opções vistas | Alicerce tem? |
|--------|--------------|---------------|
| **Status** | Ativo / Inativo | ✅ (campo `status`) |
| **Tipos** | Paciente / Profissional / Fornecedor | ❌ (listas separadas) |
| **Data de nascimento** | range de datas | ❓ (depende de ter o campo) |
| **Data de cadastro** | range de datas | ✅ (`created_at` existe) |
| **Sexo** | M / F / Outro | ❓ verificar schema |
| **Estado civil** | — | ❌ |
| **Etiquetas** | multi-select de tags | ❌ não temos |
| **Origem** | indicação / Google / Instagram / etc. | ❌ |

> Filtro por **Etiquetas** + **Data de cadastro** + **Status** são os mais úteis para o Alicerce sem novos campos.

---

## Comparação com Alicerce

| Feature | ClinicaExperts | Alicerce |
|---------|---------------|----------|
| Lista de pacientes | ✅ | ✅ |
| Tipo de contato inline | ✅ | ❌ (listas separadas) |
| Etiquetas na lista | ✅ | ❌ não temos etiquetas |
| Telefone com link WhatsApp | ✅ | ❌ telefone é texto puro |
| Toggle ativo/inativo inline | ✅ | ❌ (status via ação separada) |
| Avatar com inicial fallback | ✅ | ❌ (verificar) |
| Exportar lista | ✅ | ❌ |
| Ações em lote | ✅ | ❌ |
| Busca por nome | ✅ | ✅ (parcial) |

---

## O que trazer para o Alicerce

### Alta prioridade
1. **Link WhatsApp** no telefone do responsável — trivial (`wa.me/55{telefone}`)
   - Aplicar em: lista de pacientes, perfil do paciente, portal admin
   - Responsáveis já têm `telefone` em `paciente_responsaveis`

2. **Etiquetas/tags** em pacientes — já identificado como prioridade
   - Coluna inline na lista + filtro por etiqueta

### Média prioridade
3. **Avatar com inicial** como fallback — quando sem foto mostra inicial colorida
4. **Toggle ativo/inativo** direto na lista de pacientes

### Baixa prioridade
5. **Exportar** lista de pacientes (CSV/Excel)
6. **Ações em lote** em pacientes (ex: alterar terapeuta responsável)
