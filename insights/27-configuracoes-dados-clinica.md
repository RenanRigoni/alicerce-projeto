# Insight: Configurações > Dados da Clínica

## Seções

### Dados da clínica
- Tipo de pessoa: **Física | Jurídica** (toggle — muda CPF↔CNPJ)
- CNPJ / CPF
- Nome fantasia
- Razão social
- Logotipo (upload JPG/PNG/JPEG drag & drop) — usado em templates de documentos e e-mails

### Endereço e contato comercial
- Telefone com seletor de DDI (🇧🇷 +55)
- E-mail
- País → Estado → Cidade (cascade)
- Código postal, Bairro, Rua, Número, Complemento

### Endereço e contato de cobrança
- Checkbox **"Igual ao endereço comercial"** — copia campos automaticamente
- Mesmos campos de endereço
- Descrição: "utilizado para emissão de nota fiscal"

## Para o Alicerce

### Dados já presumivelmente existentes
Verificar se tabela `clinicas` / `organizacoes` já tem: nome, CNPJ, telefone, email.

### O que adiciona valor
| Campo | Motivo |
|-------|--------|
| **Logotipo** | Aparece em PDFs gerados, e-mails, templates de documentos |
| **Endereço de cobrança separado** | Necessário para emissão de NFS-e (nota fiscal) |
| **Checkbox "igual ao comercial"** | UX — evita digitar 2x |
| **Tipo de pessoa PF/PJ** | Clínicas com terapeuta autônomo usam CPF, não CNPJ |
| **DDI no telefone** | Internacionalização mínima |

### Esquema sugerido (extensão da tabela da clínica)
```sql
-- extensão de configuracoes_clinica ou tabela separada
logotipo_url            text
tipo_pessoa             text check (tipo_pessoa in ('fisica', 'juridica'))
cpf_cnpj                text
nome_fantasia           text
razao_social            text

-- endereço comercial
tel_comercial           text
email_comercial         text
cep_comercial           text
estado_comercial        text
cidade_comercial        text
bairro_comercial        text
rua_comercial           text
numero_comercial        text
complemento_comercial   text

-- endereço de cobrança
cobranca_igual_comercial boolean default true
tel_cobranca            text
email_cobranca          text
-- ... mesmos campos de endereço
```
