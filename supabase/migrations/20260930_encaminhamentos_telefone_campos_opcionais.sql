-- Encaminhamentos — Fase 4.1: escopo corrigido com a dona da clínica.
-- O médico que encaminhou tem CRM, nome completo e telefone, e NENHUM dos três é
-- obrigatório. A versão anterior exigia o nome e não tinha telefone.
--
-- Não mexe em RLS: coluna nova e CHECK nova não mudam quem pode ler ou escrever.
-- A tabela tinha 0 linhas na hora de aplicar (conferido), então as CHECKs novas
-- não têm dado antigo para rejeitar.

alter table public.encaminhamentos
  add column medico_telefone text;

alter table public.encaminhamentos
  alter column medico_nome drop not null;

alter table public.encaminhamentos
  drop constraint encaminhamentos_medico_nome_check;

-- Telefone é guardado só com dígitos (DDD + número); a tela formata.
alter table public.encaminhamentos
  add constraint encaminhamentos_medico_telefone_check
  check (medico_telefone is null or medico_telefone ~ '^[0-9]{10,11}$');

-- "Nenhum campo é obrigatório" não significa "pode gravar em branco": exige ao menos
-- um entre nome, CRM e telefone, para não entrar linha vazia no prontuário.
alter table public.encaminhamentos
  add constraint encaminhamentos_ao_menos_um_check
  check (
    length(btrim(coalesce(medico_nome, ''))) > 0
    or length(btrim(coalesce(medico_crm, ''))) > 0
    or medico_telefone is not null
  );
