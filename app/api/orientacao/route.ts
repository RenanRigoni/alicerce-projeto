import { createClient as createServerClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'terapeuta') {
    return NextResponse.json({ error: 'Apenas terapeutas podem criar orientações' }, { status: 403 })
  }

  const { paciente_id, titulo, tipo, url_midia, conteudo } = await request.json()

  if (!paciente_id || !titulo?.trim()) {
    return NextResponse.json({ error: 'Paciente e título são obrigatórios.' }, { status: 400 })
  }

  const tiposValidos = ['texto', 'video', 'pdf', 'imagem', 'guia']
  const tipoFinal = tiposValidos.includes(tipo) ? tipo : 'texto'

  const { error } = await supabase.from('orientacoes').insert({
    paciente_id,
    terapeuta_id: user.id,
    titulo: titulo.trim(),
    tipo: tipoFinal,
    url_midia: url_midia?.trim() || null,
    conteudo: conteudo?.trim() || null,
  })

  if (error) {
    return NextResponse.json({ error: 'Erro ao salvar orientação.' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
