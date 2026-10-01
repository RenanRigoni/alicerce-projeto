import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { validarCep } from '@/lib/endereco/cep'
import { validarTelefone, validarTelefoneDoContatoEmergencia } from '@/lib/telefone'

// PATCH — responsável atualiza próprios dados (LGPD Art. 18, III — direito de correção)
export async function PATCH(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'pai') {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  const { nome, telefone_principal, contato_emergencia, endereco, cidade, cep } = await request.json()

  const erros: string[] = []
  if (nome !== undefined && !nome?.trim()) erros.push('Nome não pode estar vazio.')
  const cepValidado = cep !== undefined ? validarCep(cep) : null
  if (cepValidado && !cepValidado.valido) erros.push(cepValidado.mensagem)
  const telefonePrincipal = telefone_principal !== undefined ? validarTelefone(telefone_principal) : null
  if (telefonePrincipal && !telefonePrincipal.valido) erros.push(telefonePrincipal.mensagem)
  const telefoneEmergencia = validarTelefoneDoContatoEmergencia(contato_emergencia)
  if (!telefoneEmergencia.valido) erros.push(telefoneEmergencia.mensagem)
  if (erros.length > 0) return NextResponse.json({ error: erros.join(' ') }, { status: 400 })

  if (nome?.trim()) {
    const { error } = await supabase
      .from('profiles')
      .update({ nome: nome.trim() })
      .eq('id', user.id)
    if (error) return NextResponse.json({ error: 'Erro ao atualizar nome.' }, { status: 500 })
  }

  const detalhesUpdate: Record<string, string | null> = {}
  if (telefonePrincipal?.valido) detalhesUpdate.telefone_principal = telefonePrincipal.telefone
  if (contato_emergencia !== undefined) detalhesUpdate.contato_emergencia = contato_emergencia?.trim() || null
  if (endereco !== undefined)           detalhesUpdate.endereco = endereco?.trim() || null
  if (cidade !== undefined)             detalhesUpdate.cidade = cidade?.trim() || null
  if (cepValidado?.valido)              detalhesUpdate.cep = cepValidado.cep

  if (Object.keys(detalhesUpdate).length > 0) {
    const { error } = await supabase
      .from('responsaveis_detalhes')
      .update(detalhesUpdate)
      .eq('id', user.id)
    if (error) return NextResponse.json({ error: 'Erro ao atualizar dados de contato.' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
