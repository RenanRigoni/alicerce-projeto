-- Migration 027 — RLS DELETE para comunicados
-- Sem esta policy, admin/recepcao não conseguiam excluir comunicados
-- (RLS bloqueava silenciosamente, sem retornar erro).

CREATE POLICY "comunicados: exclusão admin" ON comunicados
  FOR DELETE USING (get_my_role() IN ('admin', 'recepcao'));
