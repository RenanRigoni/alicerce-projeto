import * as XLSX from 'xlsx'
import path from 'node:path'
import os from 'node:os'

const HEADER = ['#', 'Área', 'O que testar', 'Resultado esperado', 'Status (OK / Falhou)', 'Observações']

function sheet(rows) {
  const data = [HEADER, ...rows.map((r, i) => [i + 1, ...r, '', ''])]
  const ws = XLSX.utils.aoa_to_sheet(data)
  ws['!cols'] = [
    { wch: 4 },   // #
    { wch: 22 },  // Área
    { wch: 60 },  // testar
    { wch: 50 },  // esperado
    { wch: 18 },  // status
    { wch: 32 },  // obs
  ]
  return ws
}

// === GERAL / ACESSO ===
const geral = [
  ['Login', 'Logar como cada role (admin, recepção, terapeuta, pai) com credenciais válidas', 'Redireciona para dashboard correto da role'],
  ['Login', 'Tentar logar com senha errada', 'Mensagem de erro, não autentica'],
  ['Login', 'Tentar logar com email inexistente', 'Mensagem de erro, não autentica'],
  ['Login', 'Recarregar página (F5) após login', 'Sessão persiste, continua logado'],
  ['Logout', 'Clicar logout em cada role', 'Volta para tela de login, sessão limpa'],
  ['Acesso', 'Deslogado, abrir URL protegida (ex: /admin/usuarios) direto', 'Redireciona para login'],
  ['Acesso', 'Pai tenta abrir URL de admin (/admin/usuarios)', 'Bloqueia (404 / acesso negado)'],
  ['Acesso', 'Terapeuta tenta abrir URL de admin', 'Bloqueia'],
  ['Acesso', 'Recepção tenta abrir URL de terapeuta (/terapia/dashboard)', 'Bloqueia'],
  ['Acesso', 'Pai tenta acessar paciente que não é seu filho (manipular ID na URL)', 'Bloqueia (403/404)'],
  ['Auth', 'Recuperar senha (esqueci minha senha) — se existir fluxo', 'Email enviado / fluxo funciona'],
  ['UI', 'Verificar responsividade mobile em todas dashboards', 'Layout adapta sem quebrar'],
]

// === ADMIN ===
const admin = [
  ['Dashboard', 'Abrir dashboard admin', 'Mostra métricas (usuários ativos, pacientes, etc.) sem erros'],
  ['Usuários', 'Listar todos usuários do sistema', 'Lista carrega com filtros funcionais (role, ativo)'],
  ['Usuários', 'Criar usuário admin', 'Conta criada, login funciona'],
  ['Usuários', 'Criar usuário recepção', 'Conta criada, login funciona'],
  ['Usuários', 'Criar usuário terapeuta', 'Conta criada, login funciona'],
  ['Usuários', 'Criar usuário pai/responsável', 'Conta criada, login funciona'],
  ['Usuários', 'Tentar criar usuário com role inválido (manipular request)', 'API retorna 400 "Role inválido"'],
  ['Usuários', 'Editar permissões de um usuário (toggle off em recurso)', 'Recurso some/desabilita ao logar com aquele usuário'],
  ['Usuários', 'Desativar usuário', 'Usuário não consegue mais logar'],
  ['Usuários', 'Reativar usuário', 'Login volta a funcionar'],
  ['Usuários', 'Tentar desativar a si mesmo (admin logado)', 'API bloqueia'],
  ['Vínculos', 'Vincular paciente a responsável (principal)', 'Vínculo criado, paciente aparece no portal do pai'],
  ['Vínculos', 'Vincular paciente a responsável secundário', 'Vínculo criado'],
  ['Vínculos', 'Vincular paciente a terapeuta', 'Terapeuta vê paciente no dashboard'],
  ['Vínculos', 'Desvincular', 'Acesso removido imediatamente'],
  ['Pacientes', 'Visualizar prontuário completo de qualquer paciente', 'Tudo visível: dados, sessões, relatórios, documentos, orientações, altas'],
  ['Documentos', 'Upload documento médico para paciente', 'Salvo no bucket privado, link via signed URL funciona'],
  ['Documentos', 'Tentar abrir signed URL após expiração (1h)', 'URL expira, retorna erro'],
  ['Altas', 'Listar todas solicitações de alta', 'Lista com status agrupados (aguardando / histórico)'],
  ['Altas', 'Ver detalhe de alta com documento anexado', 'Documento abre via /api/alta/:id/documento'],
  ['Permissões', 'Toggle "gerenciar usuários" em RECEPCAO → desligar', 'Recepção perde acesso ao módulo de usuários'],
  ['Sessões', 'Visualizar agenda de qualquer terapeuta', 'Agendas carregam corretamente'],
  ['Sistema', 'Editar configurações gerais (se existir)', 'Salva sem erros'],
]

// === RECEPÇÃO ===
const recepcao = [
  ['Dashboard', 'Abrir dashboard recepção', 'Mostra agenda do dia, próximos agendamentos, alertas'],
  ['Agenda', 'Visualizar agenda do dia (todos terapeutas)', 'Lista ordenada por horário com nome paciente'],
  ['Agenda', 'Botão WhatsApp ao lado de cada agendamento (feature pendente)', 'Abre wa.me com mensagem pré-pronta para responsável'],
  ['Agenda', 'Marcar como "mensagem enviada" após clicar WhatsApp (feature pendente)', 'Ícone visual indica envio'],
  ['Agenda', 'Pai confirmar agendamento via link → ver ícone verde de confirmação (feature pendente)', 'Ícone aparece para recepção'],
  ['Pacientes', 'Cadastrar novo paciente', 'Paciente criado, aparece na listagem'],
  ['Pacientes', 'Editar dados do paciente', 'Alterações salvas'],
  ['Usuários', 'Cadastrar terapeuta', 'Sucesso'],
  ['Usuários', 'Cadastrar responsável (pai)', 'Sucesso'],
  ['Usuários', 'Tentar cadastrar admin (manipular request)', 'API retorna 403 "Recepção só pode cadastrar terapeutas e responsáveis"'],
  ['Usuários', 'Tentar cadastrar recepção (manipular request)', 'API retorna 403'],
  ['Usuários', 'Toggle ativo em pai → desligar', 'Pai bloqueado, não loga mais'],
  ['Usuários', 'Tentar toggle ativo em terapeuta', 'Botão indisponível / API retorna 403'],
  ['Vínculos', 'Vincular paciente novo a responsável', 'Vínculo criado'],
  ['Permissões', 'Tentar acessar relatórios clínicos sem permissão', 'Bloqueado'],
  ['Agendamentos', 'Criar agendamento avulso (não-sessão)', 'Salvo, aparece na agenda'],
  ['Agendamentos', 'Cancelar agendamento', 'Sumiu da agenda'],
  ['Confirmações', 'Enviar lembrete WhatsApp manualmente', 'wa.me abre com texto correto'],
]

// === TERAPEUTA ===
const terapeuta = [
  ['Dashboard', 'Abrir dashboard terapeuta', 'Agenda do dia + alertas + atalhos'],
  ['Dashboard', 'Verificar agenda do dia (sessões + agendamentos avulsos)', 'Ordem cronológica BRT, sem cancelados'],
  ['Pacientes', 'Listar pacientes vinculados', 'Apenas pacientes vinculados aparecem'],
  ['Pacientes', 'Tentar abrir paciente não-vinculado (manipular ID na URL)', 'Bloqueado (403/404)'],
  ['Pacientes', 'Abrir prontuário de paciente vinculado', 'Tabs (relatórios, documentos, sessões, orientações, alta) carregam'],
  ['Relatórios', 'Criar novo relatório clínico', 'Salvo, aparece no histórico'],
  ['Relatórios', 'Marcar relatório como visível para pais', 'Pai consegue ver'],
  ['Relatórios', 'Tentar criar relatório para paciente não-vinculado (manipular)', 'API retorna 403'],
  ['Documentos', 'Upload documento (PDF/imagem) para paciente vinculado', 'Salvo no bucket privado, abre via /api/documento/:id/download'],
  ['Documentos', 'Tentar upload para paciente não-vinculado', 'API retorna 403'],
  ['Documentos', 'Marcar documento como visível para pais', 'Pai consegue baixar'],
  ['Orientações', 'Criar orientação para paciente vinculado', 'Salva, pai vê no portal'],
  ['Orientações', 'Tentar criar orientação para paciente não-vinculado', 'API retorna 403'],
  ['Comentários', 'Comentar em relatório próprio', 'Comentário salvo'],
  ['Comentários', 'Tentar comentar em relatório de outro terapeuta (paciente não-vinculado)', 'Bloqueado'],
  ['Sessões', 'Marcar sessão como concluída', 'Status atualizado'],
  ['Sessões', 'Visualizar histórico de sessões do paciente', 'Lista carrega'],
  ['Confirmações', 'Visualizar status de confirmação WhatsApp das sessões', 'Mostra confirmada/cancelada/sem envio'],
  ['Alta', 'Solicitar alta de paciente (registrada pela terapeuta)', 'Criada com status "registrada"'],
  ['Alta', 'Confirmar alta solicitada por responsável', 'Status vai para "confirmada"'],
  ['Alta', 'Recusar alta solicitada por responsável (com argumentação)', 'Status "recusada", argumentação salva'],
  ['Alta', 'Anexar documento médico à alta', 'PDF salvo, link funciona'],
  ['Perfil', 'Editar próprios dados', 'Salvo'],
]

// === PAI / RESPONSÁVEL ===
const pai = [
  ['Portal', 'Acessar portal e ver lista de filhos vinculados', 'Apenas filhos vinculados aparecem'],
  ['Portal', 'Tentar acessar /portal/paciente/:id de criança não-vinculada', 'Bloqueado (403/404)'],
  ['Prontuário', 'Abrir prontuário do filho', 'Carrega tabs permitidas'],
  ['Relatórios', 'Ver lista de relatórios visíveis aos pais', 'Apenas relatórios marcados como visíveis aparecem'],
  ['Relatórios', 'Tentar ver relatório não-visível (manipular ID)', 'Bloqueado'],
  ['Documentos', 'Ver documentos visíveis aos pais', 'Lista carrega'],
  ['Documentos', 'Baixar documento via /api/documento/:id/download', 'Signed URL gera, PDF abre'],
  ['Documentos', 'Tentar baixar documento de outro paciente (manipular ID)', 'Bloqueado'],
  ['Documentos', 'Tentar baixar documento marcado como não-visível', 'Bloqueado'],
  ['Orientações', 'Ver orientações enviadas pela terapeuta', 'Lista carrega'],
  ['Comentários', 'Comentar em relatório (se feature liberada)', 'Salvo'],
  ['Agendamento', 'Receber link WhatsApp e confirmar agendamento', 'Status muda para "confirmada", recepção e terapeuta vêem'],
  ['Agendamento', 'Cancelar agendamento via link WhatsApp', 'Status "cancelada", agenda atualiza'],
  ['Alta', 'Solicitar alta do filho com justificativa', 'Criada com status "pendente_confirmacao"'],
  ['Alta', 'Anexar documento à solicitação de alta (se houver fluxo)', 'PDF salvo'],
  ['Alta', 'Ver retorno da terapeuta (confirmada/recusada)', 'Status atualiza no portal'],
  ['Perfil', 'Editar dados pessoais (telefone, email)', 'Salvo'],
  ['Notificações', 'Receber notificação de novo relatório/orientação (se houver)', 'Notificação chega'],
]

const wb = XLSX.utils.book_new()
XLSX.utils.book_append_sheet(wb, sheet(geral),    'Geral - Acesso')
XLSX.utils.book_append_sheet(wb, sheet(admin),    'Admin')
XLSX.utils.book_append_sheet(wb, sheet(recepcao), 'Recepção')
XLSX.utils.book_append_sheet(wb, sheet(terapeuta),'Terapeuta')
XLSX.utils.book_append_sheet(wb, sheet(pai),      'Pai-Responsável')

const out = path.join(os.homedir(), 'Desktop', 'alicerce-checklist-testes.xls')
XLSX.writeFile(wb, out, { bookType: 'biff8' })
console.log('OK ->', out)
