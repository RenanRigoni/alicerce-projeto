import type { createClient } from '@/lib/supabase/server'
import {
  contarProblemas, linhasDoPainel, pacientesAtivosSemResponsavel,
  type ContatoResponsavel, type LinhaDoPainel,
} from './responsaveis'

type ClienteServidor = Awaited<ReturnType<typeof createClient>>

/**
 * Linhas do painel de qualidade de dados da home. Roda no servidor com o cliente de quem está
 * logado: a RLS já deixa admin e recepção verem todos os responsáveis (são ~100 linhas; não
 * precisa de função nem de view no banco). Se qualquer leitura falhar devolve [] e o painel
 * some, em vez de derrubar a home por causa de um aviso.
 *
 * Com `incluirPacientes` falso a linha de pacientes sem responsável não é calculada: sem
 * `ver_todos_pacientes` a RLS devolveria só parte dos pacientes e a contagem sairia errada.
 */
export async function carregarLinhasQualidadeDados(
  supabase: ClienteServidor,
  { incluirPacientes }: { incluirPacientes: boolean },
): Promise<LinhaDoPainel[]> {
  const [perfis, detalhes, pacientes, vinculos] = await Promise.all([
    supabase.from('profiles').select('id, telefone').eq('role', 'pai'),
    supabase.from('responsaveis_detalhes').select('id, telefone_principal, cep'),
    incluirPacientes
      ? supabase.from('pacientes').select('id, status').eq('status', 'ativo')
      : Promise.resolve({ data: [], error: null }),
    incluirPacientes
      ? supabase.from('paciente_responsaveis').select('paciente_id')
      : Promise.resolve({ data: [], error: null }),
  ])

  const falha = [perfis, detalhes, pacientes, vinculos].find(r => r.error)
  if (falha?.error) {
    // Sem dado do paciente na mensagem: só a causa.
    console.error('Painel de qualidade de dados: leitura falhou:', falha.error.message)
    return []
  }

  const detalhePorId = new Map((detalhes.data ?? []).map(d => [d.id, d]))
  const contatos: ContatoResponsavel[] = (perfis.data ?? []).map(p => ({
    id: p.id,
    telefone_perfil: p.telefone,
    telefone_principal: detalhePorId.get(p.id)?.telefone_principal ?? null,
    cep: detalhePorId.get(p.id)?.cep ?? null,
  }))

  const semResponsavel = incluirPacientes
    ? pacientesAtivosSemResponsavel(pacientes.data ?? [], vinculos.data ?? []).length
    : null

  return linhasDoPainel(contarProblemas(contatos), semResponsavel)
}
