-- Duplo clique no formulario de agendamento criava duas linhas identicas.
-- Aconteceu de verdade: 4 pares criados com 2 a 8 segundos de diferenca, em
-- 18/09/2026, porque a tela nao mostrava o agendamento depois de salvar.
--
-- Mesmo paciente, mesma profissional, mesmo instante e mesmo tipo e sempre engano.
-- Eventos sem paciente ficam de fora do indice: varios podem coexistir no
-- mesmo horario (reunioes, bloqueios, eventos gerais da clinica).
--
-- As rotas que inserem tratam o erro 23505 e devolvem 409 com mensagem propria.

create unique index if not exists agendamentos_sem_duplicata_idx
  on public.agendamentos (paciente_id, terapeuta_id, data_hora, tipo)
  where paciente_id is not null;
