import type { EnderecoResponsavel } from '@/lib/endereco/formatar'

export interface Responsavel extends EnderecoResponsavel {
  id: string
  nome: string
  tipo: 'principal' | 'secundario'
  telefone_principal: string | null
}

/** Usado pelas páginas de paciente do admin e da terapeuta, para as duas lerem o mesmo. */
export const SELECT_RESPONSAVEIS_DO_PACIENTE =
  'tipo, profiles(id, nome, responsaveis_detalhes(endereco, numero, complemento, bairro, cidade, estado, cep, telefone_principal))'

type Detalhes = Partial<Record<keyof EnderecoResponsavel | 'telefone_principal', string | null>>

/**
 * `responsaveis_detalhes` é 1-para-1 com `profiles`; o PostgREST devolve objeto
 * ou array conforme enxerga a FK. Aceita os dois. Responsável sem linha nessa
 * tabela (existem) vem null e sai com todos os campos nulos.
 */
export function mapearResponsaveisVinculo(vinculos: unknown[] | null | undefined): Responsavel[] {
  return (vinculos ?? [])
    .map(v => v as { tipo: Responsavel['tipo']; profiles: { id: string; nome: string; responsaveis_detalhes: Detalhes | Detalhes[] | null } | null })
    .filter(v => v.profiles)
    .map(v => {
      const perfil = v.profiles!
      const bruto = perfil.responsaveis_detalhes
      const d: Detalhes = (Array.isArray(bruto) ? bruto[0] : bruto) ?? {}
      return {
        id: perfil.id,
        nome: perfil.nome,
        tipo: v.tipo,
        endereco: d.endereco ?? null,
        numero: d.numero ?? null,
        complemento: d.complemento ?? null,
        bairro: d.bairro ?? null,
        cidade: d.cidade ?? null,
        estado: d.estado ?? null,
        cep: d.cep ?? null,
        telefone_principal: d.telefone_principal ?? null,
      }
    })
}
