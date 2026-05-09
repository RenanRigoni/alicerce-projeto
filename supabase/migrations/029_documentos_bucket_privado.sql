-- ============================================================
-- Migration 029 — documentos bucket privado
-- LGPD/COFFITO: documentos clínicos não devem ser acessíveis via URL pública.
-- Adiciona arquivo_path, torna bucket privado, novo endpoint usa signed URL.
-- ============================================================

-- 1) Coluna nova para guardar apenas o path no storage
ALTER TABLE documentos
  ADD COLUMN IF NOT EXISTS arquivo_path text;

-- 2) Backfill: extrai path da URL pública existente
-- URL atual: https://<host>/storage/v1/object/public/documentos/<path>
UPDATE documentos
SET arquivo_path = regexp_replace(arquivo_url, '^.*?/documentos/', '')
WHERE arquivo_path IS NULL
  AND arquivo_url IS NOT NULL;

-- 3) Bucket documentos passa a privado
UPDATE storage.buckets
SET public = false
WHERE id = 'documentos';

-- 4) Storage policies — leitura via tabela documentos (que tem RLS própria)
DROP POLICY IF EXISTS "documentos_storage_read" ON storage.objects;
CREATE POLICY "documentos_storage_read"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'documentos'
    AND EXISTS (
      SELECT 1 FROM public.documentos d
      WHERE d.arquivo_path = storage.objects.name
    )
  );

-- 5) Storage policy — escrita feita pela rota (service role bypassa policies de qualquer forma)
DROP POLICY IF EXISTS "documentos_storage_write" ON storage.objects;
CREATE POLICY "documentos_storage_write"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'documentos');

-- 6) Idem para solicitacoes_alta.documento_url (apoio do pai à alta)
ALTER TABLE solicitacoes_alta
  ADD COLUMN IF NOT EXISTS documento_path text;

UPDATE solicitacoes_alta
SET documento_path = regexp_replace(documento_url, '^.*?/documentos/', '')
WHERE documento_path IS NULL
  AND documento_url IS NOT NULL;
