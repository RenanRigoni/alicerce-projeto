import { createClient as createServerClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'
import { temPermissao } from '@/lib/permissoes/definicoes'

const TAMANHO_MINIMO_BUSCA = 3
const LIMITE_RESULTADOS = 15

export interface ResponsavelBusca {
  id: string
  nome: string
  telefone: string | null
  cpf_mascarado: string | null
  total_pacientes: number
}

function semAcento(valor: string): string {
  return valor.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}

function soDigitos(valor: string | null | undefined): string {
  return (valor ?? '').replace(/\D/g, '')
}

function mascararCpf(cpf: string | null): string | null {
  const digitos = soDigitos(cpf)
  return digitos.length === 11 ? `***.***.***-${digitos.slice(9)}` : null
}

/**
 * Busca de responsáveis para vincular a um paciente.
 *
 * Passa pelo servidor porque a RLS de `profiles` só deixa a terapeuta ler os
 * responsáveis dos pacientes dela — e o caso de uso é justamente achar a mãe
 * que já está cadastrada por causa de OUTRO filho. Para não abrir a lista
 * inteira de contatos, exige um mínimo de caracteres, devolve poucos
 * resultados e mascara o CPF.
 */
export async function GET(request: NextRequest) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, permissoes')
    .eq('id', user.id)
    .single()

  const permissoes = (profile?.permissoes ?? {}) as Record<string, boolean>
  if (!profile || !temPermissao(profile.role, permissoes, 'gerenciar_responsaveis')) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  const termo = (request.nextUrl.searchParams.get('q') ?? '').trim()
  if (termo.length < TAMANHO_MINIMO_BUSCA) {
    return NextResponse.json({ resultados: [] })
  }

  const termoNormalizado = semAcento(termo)
  const termoDigitos = soDigitos(termo)
  // Só busca por número quando o termo é majoritariamente numérico; senão
  // "Ana 2" casaria com qualquer telefone que contenha o dígito 2.
  const buscaNumerica = termoDigitos.length >= TAMANHO_MINIMO_BUSCA && termoDigitos.length >= termo.replace(/[\s().-]/g, '').length

  const adminClient = createAdminClient()

  const [perfis, detalhes, vinculos] = await Promise.all([
    adminClient.from('profiles').select('id, nome, cpf_cnpj').eq('role', 'pai'),
    adminClient.from('responsaveis_detalhes').select('id, telefone_principal'),
    adminClient.from('paciente_responsaveis').select('responsavel_id'),
  ])

  if (perfis.error || detalhes.error || vinculos.error) {
    return NextResponse.json({ error: 'Erro ao buscar responsáveis.' }, { status: 500 })
  }

  const telefonePorId = new Map((detalhes.data ?? []).map(d => [d.id, d.telefone_principal as string | null]))
  const totalPorId = new Map<string, number>()
  for (const v of vinculos.data ?? []) {
    totalPorId.set(v.responsavel_id, (totalPorId.get(v.responsavel_id) ?? 0) + 1)
  }

  const resultados: ResponsavelBusca[] = (perfis.data ?? [])
    .filter(p => {
      if (semAcento(p.nome ?? '').includes(termoNormalizado)) return true
      if (!buscaNumerica) return false
      return soDigitos(p.cpf_cnpj).includes(termoDigitos)
        || soDigitos(telefonePorId.get(p.id)).includes(termoDigitos)
    })
    .sort((a, b) => (a.nome ?? '').localeCompare(b.nome ?? '', 'pt-BR'))
    .slice(0, LIMITE_RESULTADOS)
    .map(p => ({
      id: p.id,
      nome: p.nome ?? '',
      telefone: telefonePorId.get(p.id) ?? null,
      cpf_mascarado: mascararCpf(p.cpf_cnpj),
      total_pacientes: totalPorId.get(p.id) ?? 0,
    }))

  return NextResponse.json({ resultados })
}
