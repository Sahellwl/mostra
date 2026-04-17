-- ============================================================
-- MOSTRA — Sprint 13 : ajout des types MIME audio au bucket project-files
-- La migration 002_storage.sql utilisait ON CONFLICT DO NOTHING,
-- donc allowed_mime_types n'a jamais été mis à jour pour l'audio.
-- ============================================================

UPDATE storage.buckets
SET allowed_mime_types = ARRAY[
  -- Documents
  'application/pdf',
  -- Images
  'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
  -- Fichiers design (PSD, AI, Fig, XD, Sketch → octet-stream)
  'application/octet-stream',
  -- Videos
  'video/mp4', 'video/quicktime', 'video/x-msvideo',
  -- Archives
  'application/zip',
  -- Audio (Sprint 13)
  'audio/mpeg',     -- MP3 (standard)
  'audio/mp3',      -- MP3 (alias navigateur)
  'audio/wav',      -- WAV
  'audio/x-wav',    -- WAV (alias)
  'audio/ogg',      -- OGG
  'audio/mp4',      -- M4A (conteneur MPEG-4 audio)
  'audio/x-m4a',    -- M4A (alias macOS)
  'audio/m4a',      -- M4A (alias)
  'audio/aac',      -- AAC
  'audio/x-aac'     -- AAC (alias)
]
WHERE id = 'project-files';
