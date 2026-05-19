/**
 * Seed script — Alicerce Espaço Terapêutico
 * Cria: 4 terapeutas, 30 pacientes, 30 responsáveis (pais)
 * Roda com: npx tsx scripts/seed.ts
 */

import { createClient } from '@supabase/supabase-js'
import { loadEnvConfig } from '@next/env'

loadEnvConfig(process.cwd())

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const SENHA_PADRAO = 'alicerce'

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  throw new Error(
    'Variáveis do Supabase não configuradas. Verifique NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no .env.local.'
  )
}

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

// ─── Dados fictícios ──────────────────────────────────────────

const terapeutas = [
  { nome: 'Dra. Camila Ferreira',    email: 'camila.ferreira@alicerce.com' },
  { nome: 'Dr. Rafael Mendonça',     email: 'rafael.mendonca@alicerce.com' },
  { nome: 'Dra. Patrícia Andrade',   email: 'patricia.andrade@alicerce.com' },
  { nome: 'Dra. Juliana Costa',      email: 'juliana.costa@alicerce.com'   },
]

const responsaveis = [
  { nome: 'Ana Paula Souza',     email: 'ana.souza@email.com',      tel: '(11) 98765-4321', cidade: 'São Paulo',    cep: '01310-100' },
  { nome: 'Carlos Eduardo Lima', email: 'carlos.lima@email.com',    tel: '(11) 97654-3210', cidade: 'São Paulo',    cep: '04538-133' },
  { nome: 'Fernanda Oliveira',   email: 'fernanda.oliveira@email.com', tel: '(11) 96543-2109', cidade: 'Guarulhos', cep: '07012-030' },
  { nome: 'Marcos Pereira',      email: 'marcos.pereira@email.com', tel: '(11) 95432-1098', cidade: 'São Paulo',    cep: '02040-000' },
  { nome: 'Larissa Santos',      email: 'larissa.santos@email.com', tel: '(11) 94321-0987', cidade: 'Osasco',       cep: '06018-190' },
  { nome: 'Roberto Alves',       email: 'roberto.alves@email.com',  tel: '(11) 93210-9876', cidade: 'São Paulo',    cep: '05419-001' },
  { nome: 'Patrícia Nunes',      email: 'patricia.nunes@email.com', tel: '(11) 92109-8765', cidade: 'Santo André',  cep: '09020-000' },
  { nome: 'Diego Martins',       email: 'diego.martins@email.com',  tel: '(11) 91098-7654', cidade: 'São Bernardo', cep: '09721-400' },
  { nome: 'Juliana Rocha',       email: 'juliana.rocha@email.com',  tel: '(11) 90987-6543', cidade: 'São Paulo',    cep: '01414-001' },
  { nome: 'Thiago Carvalho',     email: 'thiago.carvalho@email.com', tel: '(11) 99876-5432', cidade: 'Mauá',       cep: '09370-000' },
  { nome: 'Simone Barbosa',      email: 'simone.barbosa@email.com', tel: '(11) 98765-1234', cidade: 'São Paulo',    cep: '04040-020' },
  { nome: 'Gustavo Ribeiro',     email: 'gustavo.ribeiro@email.com', tel: '(11) 97654-2345', cidade: 'Diadema',    cep: '09980-000' },
  { nome: 'Vanessa Correia',     email: 'vanessa.correia@email.com', tel: '(11) 96543-3456', cidade: 'São Paulo',  cep: '08210-170' },
  { nome: 'Leonardo Dias',       email: 'leonardo.dias@email.com',  tel: '(11) 95432-4567', cidade: 'São Caetano', cep: '09550-000' },
  { nome: 'Cristiane Moreira',   email: 'cristiane.moreira@email.com', tel: '(11) 94321-5678', cidade: 'São Paulo', cep: '03301-000' },
  { nome: 'André Nascimento',    email: 'andre.nascimento@email.com', tel: '(11) 93210-6789', cidade: 'Guarulhos', cep: '07090-010' },
  { nome: 'Renata Teixeira',     email: 'renata.teixeira@email.com', tel: '(11) 92109-7890', cidade: 'São Paulo',  cep: '04571-010' },
  { nome: 'Fábio Araújo',        email: 'fabio.araujo@email.com',   tel: '(11) 91098-8901', cidade: 'São Paulo',   cep: '05303-000' },
  { nome: 'Mônica Vieira',       email: 'monica.vieira@email.com',  tel: '(11) 90987-9012', cidade: 'Taboão da Serra', cep: '06766-000' },
  { nome: 'Paulo Gomes',         email: 'paulo.gomes@email.com',    tel: '(11) 99876-0123', cidade: 'São Paulo',   cep: '02117-020' },
  { nome: 'Débora Freitas',      email: 'debora.freitas@email.com', tel: '(11) 98765-9876', cidade: 'São Paulo',   cep: '04763-000' },
  { nome: 'Sandro Campos',       email: 'sandro.campos@email.com',  tel: '(11) 97654-8765', cidade: 'Barueri',     cep: '06401-175' },
  { nome: 'Aline Cardoso',       email: 'aline.cardoso@email.com',  tel: '(11) 96543-7654', cidade: 'São Paulo',   cep: '03002-000' },
  { nome: 'Henrique Monteiro',   email: 'henrique.monteiro@email.com', tel: '(11) 95432-6543', cidade: 'Cotia',   cep: '06700-000' },
  { nome: 'Tatiane Pinto',       email: 'tatiane.pinto@email.com',  tel: '(11) 94321-5432', cidade: 'São Paulo',   cep: '08090-090' },
  { nome: 'Rodrigo Fernandes',   email: 'rodrigo.fernandes@email.com', tel: '(11) 93210-4321', cidade: 'Embu das Artes', cep: '06803-000' },
  { nome: 'Cláudia Marques',     email: 'claudia.marques@email.com', tel: '(11) 92109-3210', cidade: 'São Paulo', cep: '01525-000' },
  { nome: 'Bruno Medeiros',      email: 'bruno.medeiros@email.com', tel: '(11) 91098-2109', cidade: 'São Paulo',   cep: '04552-050' },
  { nome: 'Eliane Cruz',         email: 'eliane.cruz@email.com',    tel: '(11) 90987-1098', cidade: 'Carapicuíba', cep: '06320-000' },
  { nome: 'Marcelo Azevedo',     email: 'marcelo.azevedo@email.com', tel: '(11) 99876-0987', cidade: 'São Paulo',  cep: '05641-001' },
]

const nomesInfantis = [
  'Miguel', 'Sofia', 'Arthur', 'Helena', 'Bernardo', 'Valentina', 'Heitor', 'Laura',
  'Davi', 'Isabella', 'Lorenzo', 'Manuela', 'Théo', 'Júlia', 'Pedro', 'Alice',
  'Gabriel', 'Luiza', 'Matheus', 'Maria Eduarda', 'Lucas', 'Beatriz', 'Nicolas',
  'Letícia', 'Guilherme', 'Ana Clara', 'Rafael', 'Mariana', 'Enzo', 'Yasmin',
]

const sobrenomes = [
  'Souza', 'Lima', 'Oliveira', 'Pereira', 'Santos', 'Alves', 'Nunes', 'Martins',
  'Rocha', 'Carvalho', 'Barbosa', 'Ribeiro', 'Correia', 'Dias', 'Moreira',
  'Nascimento', 'Teixeira', 'Araújo', 'Vieira', 'Gomes', 'Freitas', 'Campos',
  'Cardoso', 'Monteiro', 'Pinto', 'Fernandes', 'Marques', 'Medeiros', 'Cruz', 'Azevedo',
]

const diagnosticos = [
  'Transtorno do Espectro Autista (TEA) — Nível 1',
  'Transtorno do Espectro Autista (TEA) — Nível 2',
  'TDAH — Transtorno de Déficit de Atenção e Hiperatividade',
  'Transtorno de Ansiedade Generalizada',
  'Atraso no Desenvolvimento Neuropsicomotor',
  'Síndrome de Down',
  'Transtorno de Processamento Sensorial',
  'Transtorno de Linguagem',
  'Dificuldade de aprendizagem — suspeita de dislexia',
  'Transtorno Opositivo Desafiador (TOD)',
]

const planosTerapeuticos = [
  'Estimulação da comunicação funcional e habilidades sociais',
  'Regulação emocional e técnicas de atenção plena',
  'Desenvolvimento de autonomia nas atividades de vida diária',
  'Integração sensorial e processamento tátil/proprioceptivo',
  'Estimulação cognitiva e pré-requisitos acadêmicos',
  'Redução de comportamentos repetitivos e aumento de flexibilidade',
  'Fortalecimento do vínculo familiar e orientação parental',
  'Desenvolvimento motor fino e habilidades de escrita',
]

const frequencias = ['2x por semana', '1x por semana', '3x por semana']
const turnos = ['manha', 'tarde', 'qualquer'] as const
const convenios = ['convenio', 'particular'] as const
const sexos = ['masculino', 'feminino'] as const
const dias = ['segunda', 'terca', 'quarta', 'quinta', 'sexta'] as const
const horarios = ['08:00', '09:00', '10:00', '11:00', '13:00', '14:00', '15:00', '16:00', '17:00']

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function randomDate(startYear: number, endYear: number): string {
  const start = new Date(startYear, 0, 1).getTime()
  const end = new Date(endYear, 11, 31).getTime()
  const d = new Date(start + Math.random() * (end - start))
  return d.toISOString().split('T')[0]
}

function randomHorarios() {
  const shuffled = [...dias].sort(() => Math.random() - 0.5)
  const count = Math.floor(Math.random() * 2) + 1
  return shuffled.slice(0, count).map(dia => ({
    dia,
    hora: pick(horarios),
  }))
}

// ─── Main ─────────────────────────────────────────────────────

async function main() {
  console.log('🌱 Iniciando seed do Alicerce...\n')

  // 1. Criar terapeutas
  console.log('👩‍⚕️ Criando terapeutas...')
  const terapeutaIds: string[] = []

  for (const t of terapeutas) {
    const { data, error } = await admin.auth.admin.createUser({
      email: t.email,
      password: SENHA_PADRAO,
      email_confirm: true,
      user_metadata: { nome: t.nome, role: 'terapeuta' },
    })
    if (error) {
      if (error.message.includes('already been registered')) {
        console.log(`  ⚠️  ${t.nome} já existe, buscando ID...`)
        const { data: list } = await admin.auth.admin.listUsers()
        const existing = list?.users.find(u => u.email === t.email)
        if (existing) terapeutaIds.push(existing.id)
      } else {
        console.error(`  ❌ Erro ao criar ${t.nome}:`, error.message)
      }
    } else {
      terapeutaIds.push(data.user.id)
      console.log(`  ✅ ${t.nome}`)
    }
  }

  // 2. Criar responsáveis (pais)
  console.log('\n👨‍👩‍👦 Criando responsáveis...')
  const responsavelIds: string[] = []

  for (const r of responsaveis) {
    const { data, error } = await admin.auth.admin.createUser({
      email: r.email,
      password: SENHA_PADRAO,
      email_confirm: true,
      user_metadata: { nome: r.nome, role: 'pai' },
    })

    let uid: string | null = null

    if (error) {
      if (error.message.includes('already been registered')) {
        console.log(`  ⚠️  ${r.nome} já existe, buscando ID...`)
        const { data: list } = await admin.auth.admin.listUsers()
        const existing = list?.users.find(u => u.email === r.email)
        if (existing) uid = existing.id
      } else {
        console.error(`  ❌ Erro ao criar ${r.nome}:`, error.message)
        continue
      }
    } else {
      uid = data.user.id
      console.log(`  ✅ ${r.nome}`)
    }

    if (uid) {
      responsavelIds.push(uid)

      // Inserir detalhes do responsável
      const { error: detErr } = await admin.from('responsaveis_detalhes').upsert({
        id: uid,
        telefone_principal: r.tel,
        cidade: r.cidade,
        cep: r.cep,
        endereco: `Rua Fictícia, ${Math.floor(Math.random() * 999) + 1}`,
      })
      if (detErr) console.warn(`  ⚠️  Detalhe de ${r.nome}:`, detErr.message)
    }
  }

  // Aguarda triggers de criação de profile propagarem
  await new Promise(r => setTimeout(r, 2000))

  // 3. Criar pacientes
  console.log('\n🧒 Criando pacientes...')

  for (let i = 0; i < 30; i++) {
    const nome = `${nomesInfantis[i]} ${sobrenomes[i]}`
    const sexo = pick(sexos)
    const terapeutaId = terapeutaIds[i % terapeutaIds.length]
    const responsavelId = responsavelIds[i]

    const { data: pac, error: pacErr } = await admin
      .from('pacientes')
      .insert({
        nome,
        data_nascimento: randomDate(2011, 2020),
        sexo,
        status: i < 25 ? 'ativo' : i < 28 ? 'alta' : 'desativado',
        diagnostico: pick(diagnosticos),
        plano_terapeutico: pick(planosTerapeuticos),
        frequencia_atendimento: pick(frequencias),
        turno_preferencia: pick(turnos),
        convenio_ou_particular: pick(convenios),
        horarios_atendimento: randomHorarios(),
      })
      .select('id')
      .single()

    if (pacErr) {
      console.error(`  ❌ Erro ao criar paciente ${nome}:`, pacErr.message)
      continue
    }

    const pacienteId = pac.id
    console.log(`  ✅ ${nome}`)

    // Vincular terapeuta
    if (terapeutaId) {
      const { error: tErr } = await admin
        .from('paciente_terapeutas')
        .upsert({ paciente_id: pacienteId, terapeuta_id: terapeutaId })
      if (tErr) console.warn(`    ⚠️  Vínculo terapeuta:`, tErr.message)
    }

    // Vincular responsável
    if (responsavelId) {
      const { error: rErr } = await admin
        .from('paciente_responsaveis')
        .upsert({ paciente_id: pacienteId, responsavel_id: responsavelId, tipo: 'principal' })
      if (rErr) console.warn(`    ⚠️  Vínculo responsável:`, rErr.message)
    }

    // Dados clínicos iniciais
    const { error: dcErr } = await admin.from('pacientes_dados_clinicos').upsert({
      paciente_id: pacienteId,
      hipotese_diagnostica: pick(diagnosticos),
      objetivos_terapeuticos: 'Melhorar comunicação, habilidades sociais e autonomia nas AVDs.',
      obs_clinicas_gerais: 'Paciente demonstra boa receptividade às intervenções. Família engajada no processo terapêutico.',
      evolucao_resumida: 'Evolução gradual observada nas últimas sessões. Aumento da tolerância à frustração.',
      atualizado_por: terapeutaId ?? undefined,
      atualizado_em: new Date().toISOString(),
    })
    if (dcErr) console.warn(`    ⚠️  Dados clínicos:`, dcErr.message)
  }

  console.log('\n✅ Seed concluído!')
  console.log('\n📋 Credenciais de acesso (todos usam a mesma senha):')
  console.log(`   Senha: ${SENHA_PADRAO}\n`)
  console.log('   Terapeutas:')
  terapeutas.forEach(t => console.log(`     ${t.email}`))
  console.log('\n   Responsáveis (exemplo):')
  responsaveis.slice(0, 5).forEach(r => console.log(`     ${r.email}`))
  console.log('   ...')
}

main().catch(console.error)
