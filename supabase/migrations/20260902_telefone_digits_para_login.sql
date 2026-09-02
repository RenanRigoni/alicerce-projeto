-- Login por telefone comparava o valor digitado (só dígitos) com
-- responsaveis_detalhes.telefone_principal, que em 16 registros está gravado
-- formatado ("(34) 98435-0745"). Resultado: esses responsáveis nunca conseguiam
-- entrar pelo telefone. Coluna gerada normaliza a comparação sem alterar o
-- valor exibido nas telas nem as rotas que gravam o telefone.
ALTER TABLE public.responsaveis_detalhes
  ADD COLUMN IF NOT EXISTS telefone_digits text
  GENERATED ALWAYS AS (
    NULLIF(regexp_replace(COALESCE(telefone_principal, ''), '\D', '', 'g'), '')
  ) STORED;

CREATE INDEX IF NOT EXISTS responsaveis_detalhes_telefone_digits_idx
  ON public.responsaveis_detalhes (telefone_digits);
