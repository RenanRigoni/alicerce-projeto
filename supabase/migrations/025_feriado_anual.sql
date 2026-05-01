-- Migration 025 — Campo anual em feriados
-- Feriados marcados como anuais se repetem todo ano na mesma data (mês/dia).

ALTER TABLE feriados
  ADD COLUMN IF NOT EXISTS anual boolean NOT NULL DEFAULT false;
