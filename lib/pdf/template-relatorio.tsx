import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
} from '@react-pdf/renderer'
import { readFileSync } from 'fs'
import { join } from 'path'
import { formatarConselhoProfissional } from '@/lib/profissionais'

function carregarLogoBase64(): string {
  try {
    const bytes = readFileSync(join(process.cwd(), 'public', 'logo_hor.png'))
    return `data:image/png;base64,${bytes.toString('base64')}`
  } catch {
    return ''
  }
}

const LOGO_SRC = carregarLogoBase64()

const styles = StyleSheet.create({
  page: {
    paddingTop: 48,
    paddingBottom: 56,
    paddingHorizontal: 52,
    fontFamily: 'Helvetica',
    fontSize: 10,
    color: '#1a1a1a',
    lineHeight: 1.5,
  },
  watermark: {
    position: 'absolute',
    top: '28%',
    left: '10%',
    width: '80%',
    opacity: 0.05,
  },
  header: {
    marginBottom: 24,
    borderBottomWidth: 2,
    borderBottomColor: '#f9a8b4',
    paddingBottom: 12,
  },
  headerLogo: {
    height: 52,
    objectFit: 'contain',
    objectPosition: 'left center',
  },
  titulo: {
    fontSize: 13,
    fontFamily: 'Helvetica-Bold',
    color: '#1a1a1a',
    marginTop: 20,
    marginBottom: 4,
  },
  pacienteBox: {
    backgroundColor: '#fff5f7',
    borderRadius: 4,
    padding: 10,
    marginBottom: 16,
  },
  pacienteNome: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    color: '#c0374d',
    marginBottom: 4,
  },
  pacienteMeta: {
    fontSize: 9,
    color: '#555',
    marginBottom: 2,
  },
  secaoTitulo: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: '#c0374d',
    marginTop: 14,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  secaoConteudo: {
    fontSize: 10,
    color: '#1a1a1a',
    lineHeight: 1.6,
  },
  divisor: {
    borderBottomWidth: 1,
    borderBottomColor: '#f0d0d5',
    marginTop: 10,
    marginBottom: 2,
  },
  rodape: {
    position: 'absolute',
    bottom: 28,
    left: 52,
    right: 52,
    borderTopWidth: 1,
    borderTopColor: '#f0d0d5',
    paddingTop: 8,
    alignItems: 'flex-end',
  },
  rodapeTexto: {
    fontSize: 8,
    color: '#999',
    textAlign: 'right',
  },
})

interface TemplateRelatorioProps {
  paciente: {
    nome: string
    diagnostico?: string | null
    data_nascimento?: string | null
    frequencia_atendimento?: string | null
  }
  relatorio: {
    identificacao?: string | null
    obs_clinicas?: string | null
    testes?: string | null
    resultado_discussao?: string | null
    conclusao?: string | null
    assinatura_digital?: string | null
    publicado_em?: string | null
    hash_integridade?: string | null
    autenticacao_em?: string | null
  }
  terapeuta: {
    nome: string
    crefito?: string | null
    tipo_profissional?: string | null
    conselho_tipo?: string | null
    conselho_numero?: string | null
  }
  documentoTitulo?: string
}

export function TemplateRelatorio({ paciente, relatorio, terapeuta, documentoTitulo = 'Relatório clínico' }: TemplateRelatorioProps) {
  const dataPublicacao = relatorio.publicado_em
    ? new Date(relatorio.publicado_em).toLocaleDateString('pt-BR', {
        day: '2-digit', month: 'long', year: 'numeric',
      })
    : ''

  const idadeTexto = paciente.data_nascimento
    ? (() => {
        const nasc = new Date(paciente.data_nascimento)
        const hoje = new Date()
        const anos = hoje.getFullYear() - nasc.getFullYear()
        return `${anos} anos`
      })()
    : null
  const conselhoProfissional = formatarConselhoProfissional({
    tipoProfissional: terapeuta.tipo_profissional,
    conselhoTipo: terapeuta.conselho_tipo,
    conselhoNumero: terapeuta.conselho_numero,
    crefitoLegado: terapeuta.crefito,
  })

  return (
    <Document>
      <Page size="A4" style={styles.page}>

        {/* Marca d'água — fixa em todas as páginas */}
        {LOGO_SRC && <Image src={LOGO_SRC} style={styles.watermark} fixed />}

        {/* Cabeçalho */}
        <View style={styles.header}>
          {LOGO_SRC
            ? <Image src={LOGO_SRC} style={styles.headerLogo} />
            : <Text style={{ fontSize: 18, fontFamily: 'Helvetica-Bold', color: '#e05a6e' }}>Alicerce — Espaço Terapêutico Infantil</Text>
          }
        </View>

        <Text style={styles.titulo}>{documentoTitulo}</Text>

        {/* Dados do paciente */}
        <View style={styles.pacienteBox}>
          <Text style={styles.pacienteNome}>{paciente.nome}</Text>
          {idadeTexto && <Text style={styles.pacienteMeta}>Idade: {idadeTexto}</Text>}
          {paciente.diagnostico && <Text style={styles.pacienteMeta}>Diagnóstico: {paciente.diagnostico}</Text>}
          <Text style={styles.pacienteMeta}>
            Profissional: {terapeuta.nome}{conselhoProfissional ? ` — ${conselhoProfissional}` : ''}
          </Text>
          {dataPublicacao && <Text style={styles.pacienteMeta}>Data: {dataPublicacao}</Text>}
        </View>

        {/* Seções do relatório */}
        {[
          { titulo: '1. Identificação',          conteudo: relatorio.identificacao },
          { titulo: '2. Observações Clínicas',   conteudo: relatorio.obs_clinicas },
          { titulo: '3. Testes Aplicados',        conteudo: relatorio.testes },
          { titulo: '4. Resultado e Discussão',  conteudo: relatorio.resultado_discussao },
          { titulo: '5. Conclusão',               conteudo: relatorio.conclusao },
        ].map(secao => secao.conteudo ? (
          <View key={secao.titulo}>
            <Text style={styles.secaoTitulo}>{secao.titulo}</Text>
            <Text style={styles.secaoConteudo}>{secao.conteudo}</Text>
            <View style={styles.divisor} />
          </View>
        ) : null)}

        {/* Rodapé */}
        <View style={styles.rodape} fixed>
          <Text style={styles.rodapeTexto}>
            Alicerce Espaço Terapêutico Infantil — Documento gerado eletronicamente
          </Text>
          {relatorio.hash_integridade && (() => {
            const partes: string[] = [terapeuta.nome]
            if (conselhoProfissional) partes.push(conselhoProfissional)
            if (relatorio.autenticacao_em) partes.push(`Autenticado em: ${relatorio.autenticacao_em}`)
            return (
              <>
                <Text style={styles.rodapeTexto}>{partes.join(' | ')}</Text>
                <Text style={styles.rodapeTexto}>
                  Autenticacao Alicerce SHA-256: {relatorio.hash_integridade}
                </Text>
              </>
            )
          })()}
        </View>

      </Page>
    </Document>
  )
}
