-- O telefone do médico passa a aceitar 8, 9, 10 ou 11 dígitos.
--
-- A CHECK anterior exigia DDD (10 ou 11 dígitos). Isso brigava com o pedido da clínica
-- (nenhum dos três campos do médico é obrigatório e não há formato imposto) e com o DDD em
-- campo separado na tela: com o DDD vazio, o número sozinho tem 8 ou 9 dígitos e era recusado.
-- A recepção é local e disca sem DDD; 8/9 dígitos = número local, 10/11 = com DDD.
--
-- Continua recusando 12+ e tamanhos intermediários (1 a 7). A mesma regra vive em
-- validarTelefone(..., { aceitaSemDdd: true }) em lib/telefone.ts.
-- A tabela tinha 0 linhas na hora de aplicar (conferido): não há dado antigo para rejeitar.

alter table public.encaminhamentos
  drop constraint encaminhamentos_medico_telefone_check;

alter table public.encaminhamentos
  add constraint encaminhamentos_medico_telefone_check
  check (medico_telefone is null or medico_telefone ~ '^[0-9]{8,11}$');
