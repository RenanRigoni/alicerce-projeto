import type { AvisoCep as AvisoCepDados } from '@/lib/endereco/aviso-cep'

/** Mensagem sob o campo de CEP. Erro em vermelho (impede salvar); aviso em âmbar (deixa salvar). */
export function AvisoCep({ aviso, buscando }: { aviso: AvisoCepDados | null; buscando: boolean }) {
  if (buscando) {
    return <p className="text-xs mt-1" style={{ color: 'var(--color-ink-faint)' }}>Consultando CEP...</p>
  }
  if (!aviso) return null
  return (
    <p
      role={aviso.tipo === 'erro' ? 'alert' : 'status'}
      className="text-xs mt-1"
      style={{ color: aviso.tipo === 'erro' ? '#B91C1C' : 'var(--color-amber-deep)' }}
    >
      {aviso.mensagem}
    </p>
  )
}
