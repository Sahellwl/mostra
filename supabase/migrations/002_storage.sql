-- ============================================================
-- MOSTRA — Storage : buckets & policies
-- Version: 1.0 — Sprint 1
-- Ref: MOSTRA_ARCHITECTURE.md section 7
-- ============================================================

-- ============================================
-- BUCKETS
-- ============================================

-- Fichiers de projet (privé — accès contrôlé par RLS)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'project-files',
  'project-files',
  false,
  104857600, -- 100 MB
  ARRAY[
    'application/pdf',
    'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
    'video/mp4', 'video/quicktime', 'video/x-msvideo',
    'application/zip',
    'application/octet-stream'
  ]
) ON CONFLICT (id) DO NOTHING;

-- Assets d'agences (public — logos, etc.)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'agency-assets',
  'agency-assets',
  true,
  10485760, -- 10 MB
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml']
) ON CONFLICT (id) DO NOTHING;

-- Avatars utilisateurs (public)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,
  5242880, -- 5 MB
  ARRAY['image/jpeg', 'image/png', 'image/webp']
) ON CONFLICT (id) DO NOTHING;

-- ============================================
-- POLICIES : project-files (privé)
-- Path : project-files/{project_id}/{phase_slug}/v{n}/{filename}
-- ============================================

-- SELECT : membres de l'agence + client du projet
CREATE POLICY "project_files_select"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'project-files'
    AND (
      -- Extraire le project_id du path (premier segment)
      (storage.foldername(name))[1] IN (
        SELECT id::TEXT FROM projects
        WHERE agency_id IN (SELECT get_user_agencies())
           OR client_id = auth.uid()
      )
    )
  );

-- INSERT : membres actifs non-client de l'agence
CREATE POLICY "project_files_insert"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'project-files'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] IN (
      SELECT id::TEXT FROM projects
      WHERE agency_id IN (SELECT get_user_agencies())
    )
    AND get_user_role(
      (SELECT agency_id FROM projects WHERE id::TEXT = (storage.foldername(name))[1])
    ) IN ('super_admin', 'agency_admin', 'creative')
  );

-- UPDATE : admin de l'agence seulement
CREATE POLICY "project_files_update"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'project-files'
    AND is_agency_admin(
      (SELECT agency_id FROM projects WHERE id::TEXT = (storage.foldername(name))[1])
    )
  );

-- DELETE : admin de l'agence seulement
CREATE POLICY "project_files_delete"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'project-files'
    AND is_agency_admin(
      (SELECT agency_id FROM projects WHERE id::TEXT = (storage.foldername(name))[1])
    )
  );

-- ============================================
-- POLICIES : agency-assets (public bucket)
-- Path : agency-assets/{agency_id}/{filename}
-- ============================================

-- SELECT : public (bucket est public, tout le monde peut lire)
CREATE POLICY "agency_assets_select_public"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'agency-assets');

-- INSERT : admins de l'agence uniquement
CREATE POLICY "agency_assets_insert"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'agency-assets'
    AND auth.uid() IS NOT NULL
    AND is_agency_admin(((storage.foldername(name))[1])::UUID)
  );

-- UPDATE : admins de l'agence
CREATE POLICY "agency_assets_update"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'agency-assets'
    AND is_agency_admin(((storage.foldername(name))[1])::UUID)
  );

-- DELETE : admins de l'agence
CREATE POLICY "agency_assets_delete"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'agency-assets'
    AND is_agency_admin(((storage.foldername(name))[1])::UUID)
  );

-- ============================================
-- POLICIES : avatars (public bucket)
-- Path : avatars/{user_id}.jpg
-- ============================================

-- SELECT : public
CREATE POLICY "avatars_select_public"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

-- INSERT : l'utilisateur upload son propre avatar
CREATE POLICY "avatars_insert_own"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars'
    AND auth.uid() IS NOT NULL
    AND (storage.filename(name) LIKE auth.uid()::TEXT || '%')
  );

-- UPDATE : l'utilisateur modifie son propre avatar
CREATE POLICY "avatars_update_own"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'avatars'
    AND (storage.filename(name) LIKE auth.uid()::TEXT || '%')
  );

-- DELETE : l'utilisateur supprime son propre avatar
CREATE POLICY "avatars_delete_own"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'avatars'
    AND (storage.filename(name) LIKE auth.uid()::TEXT || '%')
  );
