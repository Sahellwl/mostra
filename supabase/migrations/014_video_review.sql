-- ============================================================
-- MOSTRA — Sprint 14 : Video Review (phase Animation)
-- ============================================================
-- 1. Ajoute timecode_seconds + video_version à la table comments
-- 2. Augmente file_size_limit du bucket project-files à 500 MB
-- 3. Ajoute video/webm aux MIME types autorisés
-- ============================================================

-- ── 1. Colonnes vidéo sur comments ───────────────────────────────
ALTER TABLE comments
  ADD COLUMN IF NOT EXISTS timecode_seconds NUMERIC,
  ADD COLUMN IF NOT EXISTS video_version    INT;

-- Index pour les requêtes filtrées par phase + version
CREATE INDEX IF NOT EXISTS idx_comments_phase_version
  ON comments (phase_id, video_version)
  WHERE phase_id IS NOT NULL AND timecode_seconds IS NOT NULL;

-- ── 2. Bucket project-files : 500 MB + WebM ──────────────────────
UPDATE storage.buckets
SET
  file_size_limit    = 524288000,   -- 500 MB
  allowed_mime_types = ARRAY[
    -- Documents
    'application/pdf',
    -- Images
    'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
    -- Fichiers design (PSD, AI, Fig, XD, Sketch → octet-stream)
    'application/octet-stream',
    -- Archives
    'application/zip',
    -- Vidéo
    'video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm',
    -- Audio (Sprint 13)
    'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-wav',
    'audio/ogg', 'audio/mp4', 'audio/x-m4a', 'audio/m4a',
    'audio/aac', 'audio/x-aac'
  ]
WHERE id = 'project-files';
