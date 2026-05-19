'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function salvarMeuPerfil(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Não autenticado')

  const { error } = await supabase
    .from('profiles')
    .update({
      nome:     (formData.get('nome') as string)?.trim() || null,
      telefone: (formData.get('telefone') as string)?.trim() || null,
    })
    .eq('id', user.id)

  if (error) throw new Error(error.message)

  revalidatePath('/admin/meu-perfil')
  revalidatePath('/terapia/meu-perfil')
}
