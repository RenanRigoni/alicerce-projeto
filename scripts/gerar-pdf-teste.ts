// Gera um PDF de teste para visualizar o layout (logo + marca d'água)
// Uso: npx tsx --tsconfig tsconfig.json scripts/gerar-pdf-teste.ts

import { renderToBuffer } from '@react-pdf/renderer'
import { createElement } from 'react'
import { writeFileSync } from 'fs'
import { join } from 'path'
import { TemplateRelatorio } from '../lib/pdf/template-relatorio'

async function main() {
  console.log('Gerando PDF de teste...')

  const buffer = await renderToBuffer(
    createElement(TemplateRelatorio, {
      paciente: {
        nome: 'Maria Fernanda da Silva',
        data_nascimento: '2018-03-15',
        diagnostico: 'F84.0 — Transtorno do espectro autista',
        frequencia_atendimento: '3x por semana',
      },
      relatorio: {
        identificacao: 'Paciente do sexo feminino, 7 anos, encaminhada para acompanhamento multidisciplinar. Apresenta dificuldades na comunicação verbal e interação social desde os 3 anos de idade.',
        obs_clinicas: 'Durante as sessões, Maria demonstra progresso consistente na tolerância sensorial e na comunicação funcional. Utiliza PECS de forma independente para expressar necessidades básicas.',
        testes: 'Aplicadas escalas CARS-2 e Vineland-3 para avaliação do perfil funcional e adaptativo.',
        resultado_discussao: 'Os resultados indicam melhora significativa nas habilidades de vida diária e na interação social estruturada. Recomenda-se continuidade do plano terapêutico atual.',
        conclusao: 'Paciente apresenta evolução satisfatória. Mantém-se o acompanhamento semanal com reavaliação programada para os próximos três meses.',
        assinatura_digital: 'Alexandra Nascimento Carneiro Caixeta — CREFITO-4 123456-F',
        publicado_em: new Date().toISOString(),
        hash_integridade: 'a3f1b2c4d5e6f7890abc1234def56789abcdef01234567890abcdef01234567',
        autenticacao_em: new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }),
      },
      terapeuta: {
        nome: 'Alexandra Nascimento Carneiro Caixeta',
        tipo_profissional: 'terapeuta_ocupacional',
        conselho_tipo: 'CREFITO',
        conselho_numero: '123456-F',
      },
      documentoTitulo: 'Relatório Clínico',
    }) as any
  )

  const outPath = join(process.cwd(), 'pdf-teste.pdf')
  writeFileSync(outPath, buffer)
  console.log(`✅ PDF salvo em: ${outPath}`)
}

main().catch(err => {
  console.error('Erro:', err)
  process.exit(1)
})
