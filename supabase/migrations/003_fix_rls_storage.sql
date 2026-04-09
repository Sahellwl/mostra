-- ============================================================
-- MOSTRA — Fix RLS : storage policies + phase_files INSERT
-- Problème : les fonctions SECURITY DEFINER (get_user_role,
-- get_user_agencies) ne sont pas fiables dans le contexte RLS
-- de Supabase Storage. Remplacement par des JOIN directs.
-- ============================================================

-- ============================================
-- DROP des anciennes policies storage
-- ============================================

DROP POLICY IF EXISTS "project_files_select" ON storage.objects;
DROP POLICY IF EXISTS "project_files_insert" ON storage.objects;
DROP POLICY IF EXISTS "project_files_update" ON storage.objects;
DROP POLICY IF EXISTS "project_files_delete" ON storage.objects;

-- ============================================
-- SELECT : membres de l'agence + client du projet
-- ============================================

CREATE POLICY "project_files_select"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'project-files'
    AND (
      -- Membre actif de l'agence propriétaire du projet
      EXISTS (
        SELECT 1
        FROM projects p
        JOIN agency_members am ON am.agency_id = p.agency_id
        WHERE p.id::TEXT = (storage.foldername(name))[1]
          AND am.user_id  = auth.uid()
          AND am.is_active = true
      )
      OR
      -- Client directement assigné au projet
      EXISTS (
        SELECT 1 FROM projects p
        WHERE p.id::TEXT = (storage.foldername(name))[1]
          AND p.client_id = auth.uid()
      )
    )
  );

-- ============================================
-- INSERT : admin ou creative de l'agence
-- ============================================

CREATE POLICY "project_files_insert"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'project-files'
    AND auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM projects p
      JOIN agency_members am ON am.agency_id = p.agency_id
      WHERE p.id::TEXT = (storage.foldername(name))[1]
        AND am.user_id  = auth.uid()
        AND am.is_active = true
        AND am.role IN ('super_admin', 'agency_admin', 'creative')
    )
  );

-- ============================================
-- UPDATE : admin de l'agence seulement
-- ============================================

CREATE POLICY "project_files_update"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'project-files'
    AND EXISTS (
      SELECT 1
      FROM projects p
      JOIN agency_members am ON am.agency_id = p.agency_id
      WHERE p.id::TEXT = (storage.foldername(name))[1]
        AND am.user_id  = auth.uid()
        AND am.is_active = true
        AND am.role IN ('super_admin', 'agency_admin')
    )
  );

-- ============================================
-- DELETE : admin de l'agence seulement
-- ============================================

CREATE POLICY "project_files_delete"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'project-files'
    AND EXISTS (
      SELECT 1
      FROM projects p
      JOIN agency_members am ON am.agency_id = p.agency_id
      WHERE p.id::TEXT = (storage.foldername(name))[1]
        AND am.user_id  = auth.uid()
        AND am.is_active = true
        AND am.role IN ('super_admin', 'agency_admin')
    )
  );

-- ============================================
-- Fix phase_files INSERT
-- Même approche : JOIN direct, pas de fonctions custom
-- ============================================

DROP POLICY IF EXISTS "phase_files_insert_non_client" ON phase_files;

CREATE POLICY "phase_files_insert_non_client"
  ON phase_files FOR INSERT
  WITH CHECK (
    uploaded_by = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM project_phases pp
      JOIN projects p       ON p.id = pp.project_id
      JOIN agency_members am ON am.agency_id = p.agency_id
      WHERE pp.id           = phase_id
        AND am.user_id      = auth.uid()
        AND am.is_active    = true
        AND am.role IN ('super_admin', 'agency_admin', 'creative')
    )
  );

-- ============================================
-- Fix phase_files UPDATE
-- Permet à tout membre non-client de l'agence de mettre
-- à jour is_current (nécessaire pour le versioning)
-- ============================================

DROP POLICY IF EXISTS "phase_files_update" ON phase_files;

CREATE POLICY "phase_files_update"
  ON phase_files FOR UPDATE
  USING (
    -- L'uploader peut modifier son propre fichier
    uploaded_by = auth.uid()
    OR
    -- Tout admin OU creative de l'agence peut modifier (pour is_current)
    EXISTS (
      SELECT 1
      FROM project_phases pp
      JOIN projects p       ON p.id = pp.project_id
      JOIN agency_members am ON am.agency_id = p.agency_id
      WHERE pp.id           = phase_id
        AND am.user_id      = auth.uid()
        AND am.is_active    = true
        AND am.role IN ('super_admin', 'agency_admin', 'creative')
    )
  );
