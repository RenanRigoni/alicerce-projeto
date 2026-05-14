export const PERMISSOES = [
  // Acesso a dados
  'ver_todos_pacientes',
  'ver_relatorios_todos',
  'ver_auditoria',
  // Pacientes
  'cadastrar_pacientes',
  'editar_pacientes',
  'desativar_reativar_paciente',
  'gerenciar_responsaveis',
  'vincular_terapeutas',
  // Agenda e clínica
  'criar_agendamentos',
  'editar_agendamentos_alheios',
  'gerenciar_feriados',
  'criar_comunicados',
  // Alta
  'registrar_alta',
  // Sistema
  'gerenciar_usuarios',
  'bloquear_acesso_portal',
] as const

export type Permissao = (typeof PERMISSOES)[number]

export const LABELS: Record<Permissao, string> = {
  ver_todos_pacientes:         'Ver todos os pacientes',
  ver_relatorios_todos:        'Ver relatórios de todos os pacientes',
  ver_auditoria:               'Ver log de auditoria',
  cadastrar_pacientes:         'Cadastrar pacientes',
  editar_pacientes:            'Editar dados dos pacientes',
  desativar_reativar_paciente: 'Desativar / reativar pacientes',
  gerenciar_responsaveis:      'Gerenciar responsáveis',
  vincular_terapeutas:         'Vincular profissionais a pacientes',
  criar_agendamentos:          'Criar agendamentos',
  editar_agendamentos_alheios: 'Editar agendamentos de outros profissionais',
  gerenciar_feriados:          'Gerenciar feriados da clínica',
  criar_comunicados:           'Criar comunicados',
  registrar_alta:              'Registrar alta de pacientes',
  gerenciar_usuarios:          'Gerenciar usuários do sistema',
  bloquear_acesso_portal:      'Bloquear acesso ao portal da família',
}

export const GRUPOS: Array<{ titulo: string; permissoes: Permissao[] }> = [
  {
    titulo: 'Acesso a dados',
    permissoes: ['ver_todos_pacientes', 'ver_relatorios_todos', 'ver_auditoria'],
  },
  {
    titulo: 'Pacientes',
    permissoes: [
      'cadastrar_pacientes',
      'editar_pacientes',
      'desativar_reativar_paciente',
      'gerenciar_responsaveis',
      'vincular_terapeutas',
    ],
  },
  {
    titulo: 'Agenda e clínica',
    permissoes: [
      'criar_agendamentos',
      'editar_agendamentos_alheios',
      'gerenciar_feriados',
      'criar_comunicados',
    ],
  },
  {
    titulo: 'Alta',
    permissoes: ['registrar_alta'],
  },
  {
    titulo: 'Sistema',
    permissoes: ['gerenciar_usuarios', 'bloquear_acesso_portal'],
  },
]

export const PERMISSOES_APLICAVEIS_POR_ROLE: Record<string, readonly Permissao[]> = {
  admin: PERMISSOES,
  recepcao: [
    'ver_todos_pacientes',
    'ver_relatorios_todos',
    'ver_auditoria',
    'cadastrar_pacientes',
    'editar_pacientes',
    'desativar_reativar_paciente',
    'gerenciar_responsaveis',
    'vincular_terapeutas',
    'criar_agendamentos',
    'gerenciar_feriados',
    'criar_comunicados',
    'gerenciar_usuarios',
  ],
  terapeuta: [
    'ver_todos_pacientes',
    'ver_relatorios_todos',
    'cadastrar_pacientes',
    'editar_pacientes',
    'desativar_reativar_paciente',
    'gerenciar_responsaveis',
    'vincular_terapeutas',
    'registrar_alta',
  ],
  pai: [
    'bloquear_acesso_portal',
  ],
}

export function permissoesAplicaveis(role: string): readonly Permissao[] {
  return PERMISSOES_APLICAVEIS_POR_ROLE[role] ?? []
}

export function permissaoAplicavel(role: string, chave: Permissao): boolean {
  return permissoesAplicaveis(role).includes(chave)
}

export function gruposPorRole(role: string): Array<{ titulo: string; permissoes: Permissao[] }> {
  const aplicaveis = new Set(permissoesAplicaveis(role))
  return GRUPOS
    .map(grupo => ({
      titulo: grupo.titulo,
      permissoes: grupo.permissoes.filter(chave => aplicaveis.has(chave)),
    }))
    .filter(grupo => grupo.permissoes.length > 0)
}

// Permissões padrão por role — o que cada role tem SEM override explícito.
// Chaves ausentes = false.
export const DEFAULTS_POR_ROLE: Record<string, Partial<Record<Permissao, boolean>>> = {
  admin: Object.fromEntries(PERMISSOES.map(p => [p, true])) as Record<Permissao, boolean>,

  recepcao: {
    ver_todos_pacientes:         true,
    cadastrar_pacientes:         true,
    editar_pacientes:            true,
    desativar_reativar_paciente: true,
    gerenciar_responsaveis:      true,
    vincular_terapeutas:         true,
    criar_agendamentos:          true,
    gerenciar_feriados:          true,
    criar_comunicados:           true,
    gerenciar_usuarios:          true,
  },

  terapeuta: {
    registrar_alta: true,
  },

  pai: {},
}

/**
 * Retorna se um usuário tem uma permissão.
 * `permissoes` = conteúdo da coluna jsonb do profiles.
 * Chaves presentes no jsonb sobrescrevem o padrão do role.
 */
export function temPermissao(
  role: string,
  permissoes: Record<string, boolean>,
  chave: Permissao,
): boolean {
  if (!permissaoAplicavel(role, chave)) return false
  if (role === 'admin') return true
  if (chave in permissoes) return Boolean(permissoes[chave])
  return Boolean(DEFAULTS_POR_ROLE[role]?.[chave] ?? false)
}

/**
 * Retorna o estado efetivo de todas as permissões para um usuário.
 */
export function todasPermissoes(
  role: string,
  permissoes: Record<string, boolean>,
): Record<Permissao, boolean> {
  return Object.fromEntries(
    PERMISSOES.map(p => [p, temPermissao(role, permissoes, p)])
  ) as Record<Permissao, boolean>
}

/**
 * Calcula quais permissões diferem do padrão do role.
 * Usado para salvar apenas os overrides reais.
 */
export function calcularOverrides(
  role: string,
  estadoAtual: Record<Permissao, boolean>,
): Record<string, boolean> {
  if (role === 'admin') return {}
  const overrides: Record<string, boolean> = {}
  const aplicaveis = new Set(permissoesAplicaveis(role))
  for (const p of PERMISSOES) {
    if (!aplicaveis.has(p)) continue
    const padrao = Boolean(DEFAULTS_POR_ROLE[role]?.[p] ?? false)
    if (estadoAtual[p] !== padrao) {
      overrides[p] = estadoAtual[p]
    }
  }
  return overrides
}
