'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { validarTelefone } from '@/lib/telefone'

export interface ResultadoSalvarPerfil {
  erro?: string
}

export async function salvarMeuPerfil(formData: FormData): Promise<ResultadoSalvarPerfil> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Não autenticado')

  const str = (k: string) => (formData.get(k) as string | null)?.trim() || null
  const role = formData.get('role') as string | null

  // Devolve o erro em vez de lançar: em produção o Next esconde a mensagem de um throw.
  const telefone = validarTelefone(formData.get('telefone'))
  if (!telefone.valido) return { erro: telefone.mensagem }

  const payload: Record<string, unknown> = {
    nome:            str('nome'),
    telefone:        telefone.telefone,
    data_nascimento: str('data_nascimento') || null,
    rg:              str('rg'),
    sexo:            str('sexo') || null,
  }

  if (role === 'terapeuta') {
    payload.conselho_numero = str('conselho_numero')
    payload.conselho_uf     = str('conselho_uf') || null
    payload.cbo_codigo      = str('cbo_codigo') || null
    payload.especialidade   = str('especialidade')
    payload.biografia       = str('biografia')
  }

  const { error } = await supabase
    .from('profiles')
    .update(payload)
    .eq('id', user.id)

  if (error) throw new Error(error.message)

  revalidatePath('/admin/meu-perfil')
  revalidatePath('/terapia/meu-perfil')
  return {}
}
