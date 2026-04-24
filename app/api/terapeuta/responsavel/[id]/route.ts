import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: responsavelId } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'terapeuta') {
    return NextResponse.json({ error: 'Apenas terapeutas podem usar esta rota' }, { status: 403 })
  }

  // Verifica se o responsável tem ao menos um paciente do terapeuta
  const { data: meusPacientes } = await supabase
    .from('paciente_terapeutas')
    .select('paciente_id')
    .eq('terapeuta_id', user.id)

  const meusIds = (meusPacientes ?? []).map((p: any) => p.paciente_id)

  const { data: vinculo } = await supabase
    .from('paciente_responsaveis')
    .select('responsavel_id')
    .eq('responsavel_id', responsavelId)
    .in('paciente_id', meusIds.length > 0 ? meusIds : [''])
    .maybeSingle()

  if (!vinculo) {
    return NextResponse.json({ error: 'Sem permissão para editar este responsável' }, { status: 403 })
  }

  const body = await request.json()
  const { nome, telefone_principal, endereco, cidade, cep, contato_emergencia } = body

  const nomeUpdates: Record<string, any> = {}
  if (nome !== undefined) nomeUpdates.nome = nome

  const detalhesUpdates: Record<string, any> = {}
  if (telefone_principal !== undefined) detalhesUpdates.telefone_principal = telefone_principal || null
  if (endereco !== undefined) detalhesUpdates.endereco = endereco || null
  if (cidade !== undefined) detalhesUpdates.cidade = cidade || null
  if (cep !== undefined) detalhesUpdates.cep = cep || null
  if (contato_emergencia !== undefined) detalhesUpdates.contato_emergencia = contato_emergencia || null

  if (Object.keys(nomeUpdates).length > 0) {
    const { error } = await supabase.from('profiles').update(nomeUpdates).eq('id', responsavelId)
    if (error) return NextResponse.json({ error: 'Erro ao atualizar nome' }, { status: 500 })
  }

  if (Object.keys(detalhesUpdates).length > 0) {
    const { error } = await supabase
      .from('responsaveis_detalhes')
      .upsert({ responsavel_id: responsavelId, ...detalhesUpdates }, { onConflict: 'responsavel_id' })
    if (error) return NextResponse.json({ error: 'Erro ao atualizar detalhes' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
