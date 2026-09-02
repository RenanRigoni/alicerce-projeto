-- O formulário de cadastro tornou todos os campos opcionais (commit de8c2d5),
-- mas esta constraint ainda exigia conselho_numero/crefito para role='terapeuta'.
-- Resultado: createUser falhava com "Database error creating new user" e nenhum
-- usuário era criado — nem o e-mail de definição de senha era enviado.
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_profissional_conselho_check;
