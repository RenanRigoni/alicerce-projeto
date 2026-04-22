-- ============================================================
-- Migration 007 — Campos extras no perfil (telefone, CREFITO)
-- Execute no SQL Editor do Supabase
-- ============================================================

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS telefone text,
  ADD COLUMN IF NOT EXISTS crefito  text;

-- Política: o próprio usuário pode atualizar seu telefone/crefito
-- (a política de UPDATE já existe: "profiles: atualização própria")
-- Admin/recepcao também podem via política de inserção existente.
-- Nenhuma política adicional necessária.
