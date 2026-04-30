import * as XLSX from 'xlsx'

const HEADER = [
  'Perfil', 'Área', 'ID', 'Funcionalidade', 'Pré-requisito',
  'Passos', 'Resultado Esperado', 'Status', 'Observações'
]

const rows = [
  // ── ADMIN ──────────────────────────────────────────────────────────────────
  ['ADMIN','Auth','A-01','Login com credenciais válidas','Usuário admin existente','1. Acessar /login\n2. Inserir e-mail e senha\n3. Clicar Entrar','Redireciona para /admin/pacientes','',''],
  ['ADMIN','Auth','A-02','Logout','Estar logado como admin','1. Clicar menu superior\n2. Clicar Sair','Redireciona para /login; sessão encerrada','',''],
  ['ADMIN','Auth','A-03','Acesso bloqueado sem login','Nenhum','1. Acessar /admin/pacientes sem login','Redireciona para /login','',''],
  ['ADMIN','Pacientes','A-04','Listar pacientes','Login admin','1. Acessar /admin/pacientes','Lista com nome, status, código interno aparece','',''],
  ['ADMIN','Pacientes','A-05','Buscar paciente por nome','Lista com pacientes','1. Digitar nome no campo de busca','Filtra lista em tempo real','',''],
  ['ADMIN','Pacientes','A-06','Criar paciente (mínimo)','Login admin','1. Clicar Novo Paciente\n2. Preencher Nome\n3. Salvar','Paciente criado; redireciona para perfil','',''],
  ['ADMIN','Pacientes','A-07','Criar paciente (completo)','Login admin','1. Preencher Nome, data_nasc, sexo, CPF, frequência, turno, convênio, horários, terapeutas, responsável\n2. Salvar','Todos os dados salvos corretamente','',''],
  ['ADMIN','Pacientes','A-08','CPF criptografado no banco','A-07 com CPF','1. Após criar paciente com CPF\n2. Verificar no Supabase que cpf_cifrado está preenchido e coluna cpf NÃO existe','cpf_cifrado com bytes; coluna cpf ausente','',''],
  ['ADMIN','Pacientes','A-09','Ver perfil do paciente','A-06','1. Clicar no paciente na lista','Exibe dados pessoais, terapeutas, responsáveis','',''],
  ['ADMIN','Pacientes','A-10','Aba Dados Clínicos (leitura)','A-09','1. Clicar aba Dados Clínicos','Exibe campos clínicos (ou vazio)','',''],
  ['ADMIN','Pacientes','A-11','Aba Relatórios (leitura)','A-09','1. Clicar aba Relatórios','Lista relatórios publicados','',''],
  ['ADMIN','Pacientes','A-12','Aba Documentos (leitura)','A-09','1. Clicar aba Documentos','Lista documentos do paciente','',''],
  ['ADMIN','Pacientes','A-13','Aba Orientações (leitura)','A-09','1. Clicar aba Orientações','Lista orientações do paciente','',''],
  ['ADMIN','Pacientes','A-14','Aba Altas (leitura)','A-09','1. Clicar aba Altas','Lista histórico de solicitações de alta','',''],
  ['ADMIN','Pacientes','A-15','Editar paciente','A-09','1. Clicar Editar\n2. Alterar campos\n3. Salvar','Dados atualizados refletem na tela','',''],
  ['ADMIN','Pacientes','A-16','Editar CPF','A-09','1. Entrar em Editar\n2. Modificar CPF\n3. Salvar','CPF pré-populado (decifrado); salvo criptografado','',''],
  ['ADMIN','Pacientes','A-17','Desativar paciente','A-09 — paciente ativo','1. Clicar Desativar\n2. Informar motivo\n3. Confirmar','Status muda para Desativado','',''],
  ['ADMIN','Pacientes','A-18','Reativar paciente','A-17','1. Clicar Reativar','Status volta para Ativo','',''],
  ['ADMIN','Pacientes','A-19','Deletar paciente','A-09','1. Clicar Deletar\n2. Confirmar','Paciente removido da lista e do banco','',''],
  ['ADMIN','Pacientes','A-20','Edição bloqueada após alta','Paciente status = alta','1. Tentar editar dados clínicos ou relatórios','Formulário bloqueado ou erro 409 da API','',''],
  ['ADMIN','Usuários','A-21','Listar usuários','Login admin','1. Acessar /admin/usuarios','Lista com nome, role, status aparece','',''],
  ['ADMIN','Usuários','A-22','Criar usuário Admin','Login admin','1. Clicar Novo Usuário\n2. Preencher nome, e-mail, senha, role=admin\n3. Salvar','Usuário criado aparece na lista','',''],
  ['ADMIN','Usuários','A-23','Criar usuário Recepção','Login admin','1. Criar com role=recepcao','Usuário criado com role recepcao','',''],
  ['ADMIN','Usuários','A-24','Criar usuário Terapeuta','Login admin','1. Criar com role=terapeuta\n2. Preencher CREFITO','CREFITO obrigatório validado','',''],
  ['ADMIN','Usuários','A-25','Criar usuário Responsável (Pai)','Login admin','1. Criar com role=pai\n2. Vincular a paciente existente','Usuário criado e vinculado ao paciente','',''],
  ['ADMIN','Usuários','A-26','Desativar usuário','A-21','1. Clicar toggle Ativo do usuário','Usuário desativado não consegue mais logar','',''],
  ['ADMIN','Usuários','A-27','Deletar usuário','A-21','1. Clicar Deletar usuário\n2. Confirmar','Usuário removido da lista','',''],
  ['ADMIN','Usuários','A-28','Alterar permissões de usuário','A-21','1. Acessar permissões do usuário\n2. Alterar role\n3. Salvar','Role atualizada reflete no acesso','',''],
  ['ADMIN','Terapeutas','A-29','Listar terapeutas','Login admin','1. Acessar /admin/terapeutas','Lista com nome, CREFITO, pacientes vinculados','',''],
  ['ADMIN','Terapeutas','A-30','Ver perfil terapeuta','A-29','1. Clicar no terapeuta','Exibe dados e lista de pacientes','',''],
  ['ADMIN','Responsáveis','A-31','Listar responsáveis','Login admin','1. Acessar /admin/responsaveis','Lista responsáveis com pacientes vinculados','',''],
  ['ADMIN','Responsáveis','A-32','Ver perfil responsável','A-31','1. Clicar no responsável','Exibe nome, endereço, telefone, pacientes','',''],
  ['ADMIN','Agendamentos','A-33','Ver agendamentos','Login admin','1. Acessar /admin/agendamentos','Grade de agendamentos da semana aparece','',''],
  ['ADMIN','Agendamentos','A-34','Agendamentos apagados após alta','Paciente com alta (T-25)','1. Verificar grade após registrar alta','Agendamentos futuros do paciente ausentes','',''],
  ['ADMIN','Feriados','A-35','Criar feriado','Login admin','1. Acessar /admin/feriados\n2. Inserir data e descrição\n3. Salvar','Feriado aparece na lista','',''],
  ['ADMIN','Feriados','A-36','Bloquear data duplicada','A-35','1. Criar feriado na mesma data','Erro: Já existe feriado nesta data','',''],
  ['ADMIN','Comunicados','A-37','Listar comunicados','Login admin','1. Acessar /admin/comunicados','Lista comunicados criados','',''],
  ['ADMIN','Comunicados','A-38','Criar comunicado','Login admin','1. Clicar Novo Comunicado\n2. Preencher título e conteúdo\n3. Publicar','Comunicado aparece na lista','',''],
  ['ADMIN','Comunicados','A-39','Deletar comunicado','A-38','1. Clicar Deletar no comunicado','Comunicado removido da lista','',''],
  ['ADMIN','Auditoria','A-40','Ver log de auditoria','Login admin','1. Acessar /admin/auditoria','Listagem de ações com usuário, recurso, timestamp','',''],
  ['ADMIN','CPF','A-41','CPF ausente no portal da família','Paciente com CPF (A-07)','1. Logar como pai vinculado\n2. Ver portal do paciente','Campo CPF ausente na exibição do responsável','',''],

  // ── RECEPÇÃO ───────────────────────────────────────────────────────────────
  ['RECEPÇÃO','Auth','R-01','Login com credenciais válidas','Usuário recepcao existente','1. Acessar /login\n2. Inserir credenciais','Redireciona para /admin/pacientes','',''],
  ['RECEPÇÃO','Auth','R-02','Acesso negado a rotas exclusivas admin','Login recepcao','1. Tentar acessar /admin/auditoria','Redireciona ou sem opção de ação sensível','',''],
  ['RECEPÇÃO','Pacientes','R-03','Listar pacientes','Login recepcao','1. Acessar /admin/pacientes','Lista aparece igual ao admin','',''],
  ['RECEPÇÃO','Pacientes','R-04','Criar paciente','Login recepcao','1. Criar novo paciente completo','Paciente criado com sucesso','',''],
  ['RECEPÇÃO','Pacientes','R-05','Editar paciente','Login recepcao','1. Editar campos do paciente','Dados atualizados','',''],
  ['RECEPÇÃO','Pacientes','R-06','Ver perfil do paciente','Login recepcao','1. Clicar no paciente','Dados visíveis igual admin','',''],
  ['RECEPÇÃO','Agendamentos','R-07','Ver agendamentos','Login recepcao','1. Acessar /admin/agendamentos','Grade aparece igual admin','',''],

  // ── TERAPEUTA ──────────────────────────────────────────────────────────────
  ['TERAPEUTA','Auth','T-01','Login com credenciais válidas','Usuário terapeuta existente','1. Acessar /login\n2. Inserir credenciais','Redireciona para /terapia/pacientes','',''],
  ['TERAPEUTA','Auth','T-02','Acesso negado à área admin','Login terapeuta','1. Tentar acessar /admin/pacientes','Redireciona para /login ou /terapia','',''],
  ['TERAPEUTA','Pacientes','T-03','Ver somente pacientes vinculados','Login terapeuta vinculado a ≥1 paciente','1. Acessar /terapia/pacientes','Somente pacientes vinculados aparecem','',''],
  ['TERAPEUTA','Pacientes','T-04','Ver perfil do paciente vinculado','T-03','1. Clicar no paciente','Exibe dados pessoais, terapeutas, responsáveis','',''],
  ['TERAPEUTA','Pacientes','T-05','CPF decifrado visível no perfil','Paciente com CPF cadastrado','1. Ver aba de dados do paciente','CPF aparece em texto claro (somente terapeuta/admin)','',''],
  ['TERAPEUTA','Dados Clínicos','T-06','Ver dados clínicos','T-04','1. Clicar aba Dados Clínicos','Formulário com campos clínicos aparece','',''],
  ['TERAPEUTA','Dados Clínicos','T-07','Preencher dados clínicos (1ª vez)','T-04 sem dados clínicos','1. Preencher hipótese diagnóstica, objetivo, plano\n2. Salvar','Dados salvos e exibidos','',''],
  ['TERAPEUTA','Dados Clínicos','T-08','Editar dados clínicos existentes','T-07','1. Alterar campos\n2. Salvar','Dados atualizados corretamente','',''],
  ['TERAPEUTA','Dados Clínicos','T-09','Bloqueio de edição após alta','Paciente status = alta','1. Tentar salvar dados clínicos','Botão desabilitado ou erro 409','',''],
  ['TERAPEUTA','Relatórios','T-10','Criar rascunho (sem PDF)','T-04','1. Clicar Novo Relatório\n2. Preencher título e prévia\n3. Salvar rascunho','Rascunho criado; redirecionado para perfil','',''],
  ['TERAPEUTA','Relatórios','T-11','Criar rascunho (com PDF)','T-04','1. Preencher título\n2. Anexar PDF ≤15 MB\n3. Salvar rascunho','PDF em relatorios-pdf; path salvo no banco','',''],
  ['TERAPEUTA','Relatórios','T-12','Publicar relatório (sem PDF)','T-10','1. Clicar Publicar\n2. Aceitar declaração COFFITO\n3. Digitar nome no modal\n4. Confirmar','Relatório publicado com assinatura digital e hash','',''],
  ['TERAPEUTA','Relatórios','T-13','Publicar relatório (com PDF)','T-04','1. Preencher título\n2. Anexar PDF\n3. Aceitar declaração\n4. Publicar','PDF no bucket relatorios-pdf; pdf_url = path','',''],
  ['TERAPEUTA','Relatórios','T-14','Nome errado bloqueia publicação','T-04','1. No modal digitar nome errado\n2. Confirmar','Erro: nome não confere','',''],
  ['TERAPEUTA','Relatórios','T-15','Download PDF gerado por sistema','T-12','1. Na lista de relatórios clicar no PDF','PDF gerado via template Alicerce baixado','',''],
  ['TERAPEUTA','Relatórios','T-16','Download PDF anexado','T-13','1. Clicar no PDF do relatório','PDF original do terapeuta baixado','',''],
  ['TERAPEUTA','Relatórios','T-17','Relatório publicado não editável','T-12','1. Tentar editar relatório publicado','Botão desabilitado ou erro 409','',''],
  ['TERAPEUTA','Relatórios','T-18','Relatórios de outros pacientes invisíveis','T-03','1. Verificar se relatórios de outros pacientes aparecem','Somente relatórios de pacientes vinculados','',''],
  ['TERAPEUTA','Documentos','T-19','Upload de documento','T-04','1. Clicar Upload na aba Documentos\n2. Selecionar arquivo\n3. Preencher tipo e descrição\n4. Salvar','Documento na lista; URL acessível','',''],
  ['TERAPEUTA','Documentos','T-20','Documento visível para pais','T-19','1. Marcar visivel_pais = true no upload','Pai vinculado vê documento no portal','',''],
  ['TERAPEUTA','Documentos','T-21','Documento invisível para pais','T-19','1. Marcar visivel_pais = false','Pai NÃO vê documento no portal','',''],
  ['TERAPEUTA','Orientações','T-22','Criar orientação (texto)','T-04','1. Aba Orientações\n2. Nova Orientação\n3. Preencher título e conteúdo\n4. Salvar','Orientação na lista e visível no portal da família','',''],
  ['TERAPEUTA','Orientações','T-23','Criar orientação (vídeo/PDF/imagem)','T-04','1. Criar orientação com URL de mídia','Link aparece na orientação','',''],
  ['TERAPEUTA','Orientações','T-24','Bloquear orientação após alta','Paciente status = alta','1. Tentar criar orientação','Erro 409: prontuário encerrado','',''],
  ['TERAPEUTA','Alta','T-25','Registrar alta direta','T-04 — paciente ativo','1. Clicar Registrar Alta\n2. Preencher motivo\n3. Confirmar','status=registrada; paciente vira alta; agendamentos futuros apagados; família notificada','',''],
  ['TERAPEUTA','Alta','T-26','Confirmar alta solicitada pela família','Pai solicitou alta (P-14)','1. Ver botão Confirmar Alta na tela do paciente\n2. Confirmar','status=confirmada; paciente vira alta; família notificada','',''],
  ['TERAPEUTA','Alta','T-27','Recusar alta solicitada pela família','Pai solicitou alta (P-14)','1. Clicar Recusar\n2. Preencher argumentação','status=recusada; paciente continua ativo; família notificada','',''],
  ['TERAPEUTA','Alta','T-28','Botão de alta ausente para paciente inativo','Paciente status = alta','1. Acessar tela do paciente inativo','Botão Registrar Alta NÃO aparece','',''],
  ['TERAPEUTA','Responsáveis','T-29','Editar dados do responsável vinculado','T-04 com responsável','1. Ver dados do responsável\n2. Editar nome, telefone, endereço\n3. Salvar','Dados atualizados visíveis','',''],
  ['TERAPEUTA','Notificações','T-30','Receber notificação de solicitação de alta','Pai solicitou alta (P-14)','1. Verificar área de notificações','Notificação alta_solicitada_responsavel aparece','',''],

  // ── PAI / RESPONSÁVEL ──────────────────────────────────────────────────────
  ['PAI','Auth','P-01','Login com credenciais válidas','Usuário pai vinculado a paciente','1. Acessar /login\n2. Inserir credenciais','Redireciona para portal','',''],
  ['PAI','Auth','P-02','Consentimento LGPD obrigatório no 1º acesso','Pai sem consentimento registrado','1. Fazer login pela 1ª vez','Modal de consentimento LGPD aparece bloqueando acesso','',''],
  ['PAI','Auth','P-03','Aceitar consentimento desbloqueia portal','P-02','1. Ler e aceitar consentimento','Modal fecha; acesso ao portal liberado','',''],
  ['PAI','Auth','P-04','Consentimento salvo no banco','P-03','1. Verificar no Supabase: profiles.consentimento_aceito_em e consentimento_policy_versao','Ambos os campos preenchidos','',''],
  ['PAI','Auth','P-05','Acesso negado ao painel admin','Login pai','1. Tentar acessar /admin/pacientes','Redireciona para /login ou /portal','',''],
  ['PAI','Portal','P-06','Ver portal do paciente vinculado','Login pai','1. Acessar /portal/paciente/[id]','Dados do paciente visíveis (sem CPF)','',''],
  ['PAI','Portal','P-07','CPF ausente no portal do responsável','Paciente com CPF','1. Ver dados do paciente no portal','Campo CPF ausente na exibição','',''],
  ['PAI','Portal','P-08','Ver relatórios publicados','T-12','1. Clicar aba Relatórios no portal','Somente relatórios publicados aparecem','',''],
  ['PAI','Portal','P-09','Download PDF de relatório publicado','T-12','1. Clicar no botão PDF do relatório','URL assinada gerada; PDF baixado','',''],
  ['PAI','Portal','P-10','Não ver rascunho de relatório','T-10','1. Verificar aba Relatórios no portal','Rascunho NÃO aparece para o pai','',''],
  ['PAI','Portal','P-11','Ver documentos visíveis','T-20','1. Clicar aba Documentos','Somente documentos com visivel_pais = true','',''],
  ['PAI','Portal','P-12','Não ver documentos invisíveis','T-21','1. Verificar aba Documentos','Documento com visivel_pais = false ausente','',''],
  ['PAI','Portal','P-13','Ver orientações','T-22','1. Clicar aba Orientações','Orientações do terapeuta aparecem','',''],
  ['PAI','Alta','P-14','Solicitar alta','Login pai — paciente ativo','1. Clicar Solicitar Alta\n2. Preencher motivo\n3. Confirmar','status=pendente_confirmacao; terapeuta notificado','',''],
  ['PAI','Alta','P-15','Bloquear solicitação duplicada','P-14','1. Tentar solicitar alta novamente com uma pendente','Erro 409: já existe solicitação pendente','',''],
  ['PAI','Alta','P-16','Ver histórico de altas','P-14','1. Ver aba Altas no portal','Lista com status de cada solicitação','',''],
  ['PAI','Notificações','P-17','Receber notificação de alta confirmada','T-26','1. Verificar notificações após terapeuta confirmar','Notificação alta_confirmada aparece','',''],
  ['PAI','Notificações','P-18','Receber notificação de alta recusada','T-27','1. Verificar notificações após terapeuta recusar','Notificação alta_recusada com argumentação aparece','',''],
  ['PAI','Notificações','P-19','Receber notificação de novo relatório','T-12','1. Verificar notificações após publicação','Notificação relatorio_publicado aparece','',''],
  ['PAI','Notificações','P-20','Receber notificação de nova orientação','T-22','1. Verificar notificações após terapeuta criar orientação','Notificação orientacao_nova aparece','',''],
  ['PAI','LGPD','P-21','Exportar dados pessoais (Art. 18 LGPD)','Login pai','1. Acionar exportação de dados','JSON com dados pessoais do responsável baixado','',''],
  ['PAI','LGPD','P-22','Ver meus dados','Login pai','1. Acessar tela de perfil / meus dados','Dados pessoais visíveis','',''],

  // ── GERAL ──────────────────────────────────────────────────────────────────
  ['GERAL','Segurança','G-01','RLS bloqueia leitura cruzada entre terapeutas','Dois terapeutas com pacientes diferentes','1. Logar como terapeuta A\n2. Acessar URL direta do paciente vinculado só ao terapeuta B','Retorna 404 ou acesso negado','',''],
  ['GERAL','Segurança','G-02','Prontuário somente leitura após alta','Paciente status = alta','1. Terapeuta tentar criar relatório para paciente com alta','Erro 409: prontuário encerrado','',''],
  ['GERAL','Segurança','G-03','Service role não exposto no client','Nenhum','1. Inspecionar requests no DevTools do browser','SUPABASE_SERVICE_ROLE_KEY nunca aparece em requests','',''],
  ['GERAL','Segurança','G-04','Middleware bloqueia rotas sem auth','Nenhum','1. Acessar /admin/pacientes, /terapia/pacientes, /portal/paciente/x sem cookie de sessão','Todos redirecionam para /login','',''],
  ['GERAL','Integridade','G-05','Hash SHA-256 no relatório publicado','T-12','1. Verificar coluna hash_integridade no banco após publicação','Campo preenchido com hash SHA-256','',''],
  ['GERAL','Integridade','G-06','Hash SHA-256 na solicitação de alta','T-25','1. Verificar coluna hash_integridade na solicitação','Campo preenchido','',''],
  ['GERAL','Integridade','G-07','Assinatura digital com CREFITO','T-12 — terapeuta com CREFITO','1. Ver coluna assinatura_digital no banco','Formato: Nome — CREFITO XXXXX — data/hora','',''],
  ['GERAL','Integridade','G-08','Log de auditoria em ações clínicas','Login admin','1. Executar ação clínica (criar relatório, doc, orientação)\n2. Acessar /admin/auditoria','Ação registrada com usuario_id, recurso, timestamp','',''],
]

const wb = XLSX.utils.book_new()
const ws = XLSX.utils.aoa_to_sheet([HEADER, ...rows])

// Larguras das colunas
ws['!cols'] = [
  { wch: 12 }, // Perfil
  { wch: 14 }, // Área
  { wch: 6  }, // ID
  { wch: 38 }, // Funcionalidade
  { wch: 28 }, // Pré-requisito
  { wch: 48 }, // Passos
  { wch: 52 }, // Resultado Esperado
  { wch: 10 }, // Status
  { wch: 30 }, // Observações
]

// Congela header
ws['!freeze'] = { xSplit: 0, ySplit: 1 }

XLSX.utils.book_append_sheet(wb, ws, 'Checklist')
XLSX.writeFile(wb, 'docs/checklist-testes.xlsx')
console.log('✓ docs/checklist-testes.xlsx gerado')
