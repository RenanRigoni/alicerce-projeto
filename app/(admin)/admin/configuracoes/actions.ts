'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { validarCep } from '@/lib/endereco/cep'

export interface ResultadoSalvarClinica {
  erro?: string
}

export async function salvarDadosClinica(formData: FormData): Promise<ResultadoSalvarClinica> {
  // CEP vazio vale; com dígitos, exatamente 8. Devolve o erro em vez de lançar:
  // um throw aqui derrubaria a tela inteira por causa de um campo.
  const cep = validarCep(formData.get('cep'))
  if (!cep.valido) return { erro: cep.mensagem }

  const supabase = await createClient()
  const { error } = await supabase
    .from('configuracoes_clinica')
    .update({
      nome_fantasia: formData.get('nome_fantasia') || null,
      razao_social:  formData.get('razao_social')  || null,
      tipo_pessoa:   formData.get('tipo_pessoa')   || 'PJ',
      cpf_cnpj:      formData.get('cpf_cnpj')      || null,
      email:         formData.get('email')          || null,
      telefone:      formData.get('telefone')       || null,
      cep:           cep.cep,
      logradouro:    formData.get('logradouro')     || null,
      numero:        formData.get('numero')         || null,
      complemento:   formData.get('complemento')   || null,
      bairro:        formData.get('bairro')         || null,
      cidade:        formData.get('cidade')         || null,
      estado:        formData.get('estado')         || null,
      updated_at:    new Date().toISOString(),
    })
    .eq('singleton', 'default')

  if (error) {
    console.error('Falha ao salvar dados da clínica:', error.message)
    return { erro: 'Não foi possível salvar os dados da clínica. Tente novamente.' }
  }
  revalidatePath('/admin/configuracoes')
  return {}
}

export async function salvarPreferencias(formData: FormData) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('configuracoes_clinica')
    .update({
      intervalo_agenda:    parseInt(formData.get('intervalo_agenda') as string) || 50,
      primeiro_dia_semana: parseInt(formData.get('primeiro_dia_semana') as string) ?? 1,
      bloquear_feriados:   formData.get('bloquear_feriados') === 'true',
      updated_at:          new Date().toISOString(),
    })
    .eq('singleton', 'default')

  if (error) throw new Error(error.message)
  revalidatePath('/admin/configuracoes')
}

export async function salvarHorarios(
  horarios: Array<{ dia_semana: number; hora_inicio: string; hora_fim: string }>
) {
  const supabase = await createClient()

  const { error: delErr } = await supabase
    .from('horarios_funcionamento')
    .delete()
    .gte('dia_semana', 0)

  if (delErr) throw new Error(delErr.message)

  if (horarios.length > 0) {
    const { error: insErr } = await supabase
      .from('horarios_funcionamento')
      .insert(horarios)
    if (insErr) throw new Error(insErr.message)
  }

  revalidatePath('/admin/configuracoes')
}
