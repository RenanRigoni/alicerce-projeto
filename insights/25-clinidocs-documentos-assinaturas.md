# Insight: CliniDocs > Documentos e Assinaturas

## Layout
- Status tabs com contagem:
  - **Rascunho** (cinza) | **Cancelado** (vermelho) | **Aguardando assinatura** (amarelo) | **Assinado** (verde) | **Tudo** (azul)
- Ações em lote + Exportar
- Filtros: Signatários (busca por pessoa) + Período de criação

## Fluxo de status
```
Rascunho → Aguardando assinatura → Assinado
                                 ↘ Cancelado
```

## Criar novo documento — modal "Novo documento"

### Modo 1: Utilizar modelo
- Pessoa* (quem vai assinar — paciente, profissional, fornecedor)
- Modelo* (templates pré-criados pela clínica):
  - "Contrato de prestação de serviço"
  - "Termo de consentimento para procedimentos..." (truncado)
- Nome do documento* (texto livre)
- Botão: "Gerar documento" (dropdown → provavelmente "Gerar rascunho" vs "Gerar e enviar")

### Modo 2: Enviar PDF
- Pessoa*
- Arquivo (drag & drop, .PDF, máx 10.49 MB)
- Nome do documento*
- Mesmo botão "Gerar documento"

## UX: Confirmação ao fechar modal com dados preenchidos
Dialog de alerta ao tentar fechar/cancelar modal com campos já preenchidos:
- Ícone ⚠️ amarelo
- Texto: "Cancelar as alterações do documento?"
- Botões: **Voltar** (neutro) | **Sim, cancelar** (amarelo/destrutivo)

Padrão guard-before-close: evita perda acidental de dados. Aplicável a qualquer modal com formulário longo.
Disparar quando: usuário clica no X ou fora do modal E ao menos 1 campo preenchido.

## Modelos de documentos (lista)
- Colunas: Nome | Ativo (toggle) | ⚙️ column configurator | ⋮ (Editar / Excluir)
- Filtro único: Status (Ativo/Inativo)
- 2 modelos no demo (ambos ativos)

## Editor de modelo (modal "Editar modelo de documento")
- Nome* + toggle Ativo no topo
- Rich text editor completo: fonte, tamanho, Bold/Italic/Underline/Strike, tabela, espaçamento, alinhamentos, listas, **{x} variáveis**, tela cheia

## Template 1: Contrato de Prestação de Serviços – Consulta de Avaliação

### Variáveis usadas
| Variável | Fonte |
|----------|-------|
| `Nome completo` | perfil do paciente |
| `Estado Civil` | perfil do paciente |
| `Profissão` | perfil do paciente |
| `CPF` | perfil do paciente |
| `RG` | perfil do paciente |
| `Endereço completo` | perfil do paciente |
| `Nome da clínica` | configurações da clínica |
| `CNPJ da clínica` | configurações da clínica |
| `Endereço da clínica` | configurações da clínica |
| `Itens da venda` | **módulo financeiro / agendamento** |
| `Condições de pagamento da venda` | **módulo financeiro** |
| `Data de hoje` | gerado automaticamente |

### Cláusulas (9)
1. Objeto do contrato
2. Valor e forma de pagamento ← usa `Itens da venda` + `Condições de pagamento`
3. Prazo para realização
4. Rescisão — multa 30%, aviso prévio **12 horas** ✅ (confirma regra de negócio do Alicerce)
5. Reagendamento — solicitação com mínimo **12 horas** ✅
6. Responsabilidades das partes
7. Limitações
8. Privacidade e segurança (câmeras)
9. Disposições gerais — assinatura eletrônica válida (MP 2.200-2/2001, art. 10 §2º)

## Template 2: Termo de Consentimento Informado para Procedimentos Estéticos

### Variáveis
- `Nome completo`, `Data de Nascimento`, `CPF`, `Endereço completo`, `Data de hoje`

### Seções
- Descrição do Procedimento (texto livre)
- Riscos Associados
- Benefícios Esperados
- Alternativas
- Consentimento com assinatura do paciente + assinatura do profissional responsável

> Template demo é para estética — para terapia seria TCLE (Termo de Consentimento Livre e Esclarecido)

---

## Para o Alicerce

### Cruzamento com existente
- `documentos` table já existe — mas sem assinatura digital
- Funcionalidade atual = upload/storage de PDFs avulsos

### Tipos de documento relevantes para terapia
- **TCLE** — Termo de Consentimento Livre e Esclarecido (obrigatório para terapia/pesquisa)
- **Contrato de prestação de serviços** — assinado no início do tratamento
- **Termo de consentimento para procedimentos** — visível no demo
- **Autorização de uso de imagem** (para menores)

### Abordagens por complexidade

**Simples (baixa complexidade, faz agora):**
- Upload de PDF assinado manualmente pelo paciente (já funciona com storage atual)
- Campo `assinado_em` + upload de comprovante (foto/scan da assinatura física)

**Média complexidade:**
- Geração de PDF a partir de template (Puppeteer/PDFKit + variáveis substituídas)
- Envio por e-mail com link para download/confirmação simples

**Alta complexidade (baixa prioridade):**
- Assinatura digital com validade jurídica (ITI/ICP-Brasil)
- Integração com D4Sign, ZapSign, ou Clicksign
- Coleta de assinatura eletrônica com prova de identidade

### Recomendação
Curto prazo: template → geração de PDF → envio por e-mail → paciente assina físico + clínica faz upload do scan.
Médio prazo: ZapSign ou D4Sign para assinatura eletrônica com validade jurídica (ambos têm API REST).
