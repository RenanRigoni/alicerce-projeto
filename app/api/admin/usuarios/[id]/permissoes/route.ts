import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import {
  PERMISSOES,
  calcularOverrides,
  permissaoAplicavel,
  todasPermissoes,
  type Permissao,
} from '@/lib/permissoes/definicoes'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { data: meProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (meProfile?.role !== 'admin') {
    return NextResponse.json({ error: 'Apenas admin pode alterar permissões' }, { status: 403 })
  }

  const { permissoes: estadoRecebido } = await request.json() as {
    permissoes: Record<Permissao, boolean>
  }

  // Validar chaves — rejeitar qualquer chave desconhecida
  const chavesInvalidas = Object.keys(estadoRecebido).filter(k => !PERMISSOES.includes(k as Permissao))
  if (chavesInvalidas.length > 0) {
    return NextResponse.json({ error: `Permissões inválidas: ${chavesInvalidas.join(', ')}` }, { status: 400 })
  }

  const { data: alvo } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', id)
    .single()

  if (!alvo) return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })

  const padraoRole = todasPermissoes(alvo.role, {})
  const chavesNaoAplicaveis = Object.keys(estadoRecebido)
    .filter(k => PERMISSOES.includes(k as Permissao))
    .filter(k => estadoRecebido[k as Permissao] !== padraoRole[k as Permissao])
    .filter(k => !permissaoAplicavel(alvo.role, k as Permissao))

  if (chavesNaoAplicaveis.length > 0) {
    return NextResponse.json(
      { error: `Permissões não aplicáveis para este perfil: ${chavesNaoAplicaveis.join(', ')}` },
      { status: 400 }
    )
  }

  // Não permite alterar permissões do próprio admin
  if (id === user.id && alvo.role === 'admin') {
    return NextResponse.json({ error: 'Admin não pode alterar as próprias permissões' }, { status: 403 })
  }

  // Salva apenas os overrides (diferenças do padrão do role)
  const overrides = calcularOverrides(alvo.role, estadoRecebido)

  const { error } = await supabase
    .from('profiles')
    .update({ permissoes: overrides })
    .eq('id', id)

  if (error) return NextResponse.json({ error: 'Erro ao salvar permissões' }, { status: 500 })

  return NextResponse.json({ success: true, overrides })
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { data: meProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (meProfile?.role !== 'admin') {
    return NextResponse.json({ error: 'Apenas admin pode ver permissões' }, { status: 403 })
  }

  const { data: alvo } = await supabase
    .from('profiles')
    .select('role, permissoes')
    .eq('id', id)
    .single()

  if (!alvo) return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })

  const efetivas = todasPermissoes(alvo.role, alvo.permissoes ?? {})

  return NextResponse.json({ role: alvo.role, overrides: alvo.permissoes ?? {}, efetivas })
}
