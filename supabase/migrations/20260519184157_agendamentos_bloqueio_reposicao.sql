ALTER TABLE public.agendamentos
  DROP CONSTRAINT IF EXISTS agendamentos_tipo_check;

ALTER TABLE public.agendamentos
  ADD CONSTRAINT agendamentos_tipo_check
  CHECK (tipo IN ('sessao', 'devolutiva', 'reuniao', 'outro', 'bloqueio', 'reposicao'));

COMMENT ON COLUMN public.agendamentos.tipo IS
  'Tipo do agendamento: sessao, devolutiva, reuniao, outro, bloqueio ou reposicao.';
