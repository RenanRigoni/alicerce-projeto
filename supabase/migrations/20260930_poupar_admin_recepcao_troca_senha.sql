-- Admin e recepcao usam o sistema todo dia e ja definiram a propria senha.
-- Poupa as duas contas da tela de troca obrigatoria.
update public.profiles
set senha_definida_em = now()
where role in ('admin', 'recepcao')
  and senha_definida_em is null;
