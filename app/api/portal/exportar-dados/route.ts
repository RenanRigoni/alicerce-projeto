import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// GET — exporta dados pessoais do responsável (LGPD Art. 18, VI — portabilidade)
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('nome, role, consentimento_aceito_em, consentimento_policy_versao, criado_em')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'pai') {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  const { data: detalhes } = await supabase
    .from('responsaveis_detalhes')
    .select('telefone_principal, contato_emergencia, endereco, cidade, cep')
    .eq('id', user.id)
    .maybeSingle()

  const { data: pacientes } = await supabase
    .from('paciente_responsaveis')
    .select('tipo, pacientes(nome, data_nascimento)')
    .eq('responsavel_id', user.id)

  const exportacao = {
    exportado_em: new Date().toISOString(),
    titular: {
      id: user.id,
      email: user.email,
      nome: profile.nome,
      telefone: detalhes?.telefone_principal ?? null,
      contato_emergencia: detalhes?.contato_emergencia ?? null,
      endereco: detalhes?.endereco ?? null,
      cidade: detalhes?.cidade ?? null,
      cep: detalhes?.cep ?? null,
      conta_criada_em: profile.criado_em ?? null,
    },
    consentimento: {
      aceito_em: profile.consentimento_aceito_em ?? null,
      versao_politica: profile.consentimento_policy_versao ?? null,
    },
    pacientes_vinculados: (pacientes ?? []).map((r: any) => ({
      nome: r.pacientes?.nome,
      data_nascimento: r.pacientes?.data_nascimento,
      tipo_vinculo: r.tipo,
    })),
    nota: 'Dados clínicos do paciente (relatórios, evoluções, diagnósticos) não são incluídos nesta exportação por constituírem prontuário médico com retenção obrigatória de 20 anos (COFFITO Res. 424/2013 + LGPD Art. 16, I).',
  }

  return new NextResponse(JSON.stringify(exportacao, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="meus-dados-alicerce-${new Date().toISOString().slice(0, 10)}.json"`,
    },
  })
}
