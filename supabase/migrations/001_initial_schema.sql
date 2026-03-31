-- ============================================================
-- MOSTRA — Schema initial
-- Version: 1.0 — Sprint 1
-- Ref: MOSTRA_ARCHITECTURE.md sections 3.1, 3.2, 3.3
-- ============================================================

-- ============================================
-- EXTENSIONS
-- ============================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- TABLE : agencies
-- ============================================

CREATE TABLE agencies (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT        NOT NULL,
  slug          TEXT        UNIQUE NOT NULL,
  logo_url      TEXT,
  primary_color TEXT        NOT NULL DEFAULT '#EF4444',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- TABLE : profiles  (extension auth.users)
-- ============================================

CREATE TABLE profiles (
  id             UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email          TEXT        NOT NULL,
  full_name      TEXT        NOT NULL,
  avatar_url     TEXT,
  phone          TEXT,
  contact_method TEXT        NOT NULL DEFAULT 'email' CHECK (contact_method IN ('email', 'whatsapp', 'phone')),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- TABLE : agency_members
-- ============================================

CREATE TABLE agency_members (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id   UUID        NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  user_id     UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role        TEXT        NOT NULL CHECK (role IN ('super_admin', 'agency_admin', 'creative', 'client')),
  invited_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  accepted_at TIMESTAMPTZ,
  is_active   BOOLEAN     NOT NULL DEFAULT true,
  UNIQUE (agency_id, user_id)
);

-- ============================================
-- TABLE : phase_templates
-- ============================================

CREATE TABLE phase_templates (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id   UUID        NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  name        TEXT        NOT NULL,
  slug        TEXT        NOT NULL,
  icon        TEXT,
  sort_order  INT         NOT NULL,
  is_default  BOOLEAN     NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (agency_id, slug)
);

-- ============================================
-- TABLE : projects
-- ============================================

CREATE TABLE projects (
  id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id          UUID        NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  name               TEXT        NOT NULL,
  description        TEXT,
  client_id          UUID        REFERENCES profiles(id),
  project_manager_id UUID        REFERENCES profiles(id),
  status             TEXT        NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'completed', 'archived', 'on_hold')),
  progress           INT         NOT NULL DEFAULT 0
    CHECK (progress >= 0 AND progress <= 100),
  share_token        TEXT        UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- TABLE : project_phases
-- ============================================

CREATE TABLE project_phases (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id        UUID        NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  phase_template_id UUID        REFERENCES phase_templates(id),
  name              TEXT        NOT NULL,
  slug              TEXT        NOT NULL,
  sort_order        INT         NOT NULL,
  status            TEXT        NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'in_progress', 'in_review', 'approved', 'completed')),
  started_at        TIMESTAMPTZ,
  completed_at      TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- TABLE : phase_files
-- ============================================

CREATE TABLE phase_files (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  phase_id    UUID        NOT NULL REFERENCES project_phases(id) ON DELETE CASCADE,
  uploaded_by UUID        NOT NULL REFERENCES profiles(id),
  file_name   TEXT        NOT NULL,
  file_url    TEXT        NOT NULL,
  file_type   TEXT,
  file_size   BIGINT,
  version     INT         NOT NULL DEFAULT 1,
  is_current  BOOLEAN     NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- TABLE : comments
-- ============================================

CREATE TABLE comments (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  UUID        NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  phase_id    UUID        REFERENCES project_phases(id),
  user_id     UUID        NOT NULL REFERENCES profiles(id),
  content     TEXT        NOT NULL,
  is_resolved BOOLEAN     NOT NULL DEFAULT false,
  parent_id   UUID        REFERENCES comments(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- TABLE : activity_logs
-- ============================================

CREATE TABLE activity_logs (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID        NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id    UUID        REFERENCES profiles(id),
  action     TEXT        NOT NULL,
  details    JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- TABLE : invitations
-- ============================================

CREATE TABLE invitations (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id  UUID        NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  email      TEXT        NOT NULL,
  role       TEXT        NOT NULL DEFAULT 'client'
    CHECK (role IN ('agency_admin', 'creative', 'client')),
  invited_by UUID        NOT NULL REFERENCES profiles(id),
  token      TEXT        UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  accepted_at TIMESTAMPTZ,
  expires_at  TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '7 days'),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- INDEXES (section 3.3)
-- ============================================

CREATE INDEX idx_agency_members_user     ON agency_members(user_id);
CREATE INDEX idx_agency_members_agency   ON agency_members(agency_id);
CREATE INDEX idx_projects_agency         ON projects(agency_id);
CREATE INDEX idx_projects_client         ON projects(client_id);
CREATE INDEX idx_projects_status         ON projects(status);
CREATE INDEX idx_project_phases_project  ON project_phases(project_id);
CREATE INDEX idx_phase_files_phase       ON phase_files(phase_id);
CREATE INDEX idx_comments_project        ON comments(project_id);
CREATE INDEX idx_activity_logs_project   ON activity_logs(project_id);

-- ============================================
-- TRIGGER : updated_at auto-refresh
-- ============================================

CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at_agencies
  BEFORE UPDATE ON agencies
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_updated_at_profiles
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_updated_at_projects
  BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_updated_at_project_phases
  BEFORE UPDATE ON project_phases
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_updated_at_comments
  BEFORE UPDATE ON comments
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ============================================
-- TRIGGER : auto-create profile on signup
-- ============================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================
-- HELPER FUNCTIONS (section 3.2)
-- ============================================

-- Retourne les UUIDs des agences de l'utilisateur connecté
CREATE OR REPLACE FUNCTION get_user_agencies()
RETURNS SETOF UUID AS $$
  SELECT agency_id
  FROM   agency_members
  WHERE  user_id   = auth.uid()
  AND    is_active = true;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Retourne le rôle de l'utilisateur dans une agence donnée
CREATE OR REPLACE FUNCTION get_user_role(p_agency_id UUID)
RETURNS TEXT AS $$
  SELECT role
  FROM   agency_members
  WHERE  user_id   = auth.uid()
  AND    agency_id = p_agency_id
  AND    is_active = true
  LIMIT  1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Vérifie si l'utilisateur est admin (agency_admin ou super_admin) dans une agence
CREATE OR REPLACE FUNCTION is_agency_admin(p_agency_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM agency_members
    WHERE  user_id   = auth.uid()
    AND    agency_id = p_agency_id
    AND    role      IN ('agency_admin', 'super_admin')
    AND    is_active = true
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Vérifie si l'utilisateur est membre actif d'une agence
CREATE OR REPLACE FUNCTION is_agency_member(p_agency_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM agency_members
    WHERE  user_id   = auth.uid()
    AND    agency_id = p_agency_id
    AND    is_active = true
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

-- ------------------------------------------
-- agencies
-- ------------------------------------------
ALTER TABLE agencies ENABLE ROW LEVEL SECURITY;

-- Tout membre actif voit son agence
CREATE POLICY "agencies_select_members"
  ON agencies FOR SELECT
  USING (id IN (SELECT get_user_agencies()));

-- Seul un super_admin peut créer une agence
CREATE POLICY "agencies_insert_super_admin"
  ON agencies FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM agency_members
      WHERE user_id = auth.uid() AND role = 'super_admin' AND is_active = true
    )
  );

-- super_admin ou agency_admin de cette agence peut modifier
CREATE POLICY "agencies_update_admins"
  ON agencies FOR UPDATE
  USING (is_agency_admin(id));

-- Seul super_admin peut supprimer
CREATE POLICY "agencies_delete_super_admin"
  ON agencies FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM agency_members
      WHERE user_id = auth.uid() AND role = 'super_admin' AND is_active = true
    )
  );

-- ------------------------------------------
-- profiles
-- ------------------------------------------
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Un utilisateur voit son propre profil
CREATE POLICY "profiles_select_own"
  ON profiles FOR SELECT
  USING (id = auth.uid());

-- Un membre d'agence voit les profils des autres membres de la même agence
CREATE POLICY "profiles_select_same_agency"
  ON profiles FOR SELECT
  USING (
    id IN (
      SELECT am.user_id FROM agency_members am
      WHERE am.agency_id IN (SELECT get_user_agencies())
      AND   am.is_active = true
    )
  );

-- Insertion gérée par le trigger handle_new_user — pas de policy INSERT nécessaire
-- (service role insert uniquement)
CREATE POLICY "profiles_insert_service_role"
  ON profiles FOR INSERT
  WITH CHECK (id = auth.uid());

-- Mise à jour de son propre profil uniquement
CREATE POLICY "profiles_update_own"
  ON profiles FOR UPDATE
  USING (id = auth.uid());

-- Suppression de son propre profil (cascade via auth.users)
CREATE POLICY "profiles_delete_own"
  ON profiles FOR DELETE
  USING (id = auth.uid());

-- ------------------------------------------
-- agency_members
-- ------------------------------------------
ALTER TABLE agency_members ENABLE ROW LEVEL SECURITY;

-- Tout membre actif voit les membres de ses agences
CREATE POLICY "agency_members_select"
  ON agency_members FOR SELECT
  USING (agency_id IN (SELECT get_user_agencies()));

-- Seul un admin peut inviter / ajouter un membre
CREATE POLICY "agency_members_insert_admin"
  ON agency_members FOR INSERT
  WITH CHECK (is_agency_admin(agency_id));

-- Seul un admin peut modifier les membres (activer/désactiver, changer le rôle)
CREATE POLICY "agency_members_update_admin"
  ON agency_members FOR UPDATE
  USING (is_agency_admin(agency_id));

-- Seul un admin peut supprimer un membre
CREATE POLICY "agency_members_delete_admin"
  ON agency_members FOR DELETE
  USING (is_agency_admin(agency_id));

-- ------------------------------------------
-- phase_templates
-- ------------------------------------------
ALTER TABLE phase_templates ENABLE ROW LEVEL SECURITY;

-- Tous les membres de l'agence voient les templates
CREATE POLICY "phase_templates_select"
  ON phase_templates FOR SELECT
  USING (agency_id IN (SELECT get_user_agencies()));

-- Seuls les admins créent des templates
CREATE POLICY "phase_templates_insert_admin"
  ON phase_templates FOR INSERT
  WITH CHECK (is_agency_admin(agency_id));

-- Seuls les admins modifient des templates
CREATE POLICY "phase_templates_update_admin"
  ON phase_templates FOR UPDATE
  USING (is_agency_admin(agency_id));

-- Seuls les admins suppriment des templates
CREATE POLICY "phase_templates_delete_admin"
  ON phase_templates FOR DELETE
  USING (is_agency_admin(agency_id));

-- ------------------------------------------
-- projects
-- ------------------------------------------
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- Membres de l'agence OU client lié au projet
CREATE POLICY "projects_select"
  ON projects FOR SELECT
  USING (
    agency_id IN (SELECT get_user_agencies())
    OR client_id = auth.uid()
  );

-- Seuls les admins créent des projets
CREATE POLICY "projects_insert_admin"
  ON projects FOR INSERT
  WITH CHECK (is_agency_admin(agency_id));

-- Seuls les admins modifient les projets
CREATE POLICY "projects_update_admin"
  ON projects FOR UPDATE
  USING (is_agency_admin(agency_id));

-- Seuls les admins suppriment des projets
CREATE POLICY "projects_delete_admin"
  ON projects FOR DELETE
  USING (is_agency_admin(agency_id));

-- ------------------------------------------
-- project_phases
-- ------------------------------------------
ALTER TABLE project_phases ENABLE ROW LEVEL SECURITY;

-- Membres de l'agence + client voient les phases (via projet)
CREATE POLICY "project_phases_select"
  ON project_phases FOR SELECT
  USING (
    project_id IN (
      SELECT id FROM projects
      WHERE agency_id IN (SELECT get_user_agencies())
         OR client_id = auth.uid()
    )
  );

-- Membres actifs de l'agence (admin + creative) peuvent créer des phases
CREATE POLICY "project_phases_insert_members"
  ON project_phases FOR INSERT
  WITH CHECK (
    project_id IN (
      SELECT id FROM projects
      WHERE agency_id IN (SELECT get_user_agencies())
    )
    AND get_user_role(
      (SELECT agency_id FROM projects WHERE id = project_id)
    ) IN ('super_admin', 'agency_admin', 'creative')
  );

-- Admin ou créatif assigné peut modifier une phase
CREATE POLICY "project_phases_update_members"
  ON project_phases FOR UPDATE
  USING (
    project_id IN (
      SELECT id FROM projects
      WHERE agency_id IN (SELECT get_user_agencies())
    )
    AND get_user_role(
      (SELECT agency_id FROM projects WHERE id = project_id)
    ) IN ('super_admin', 'agency_admin', 'creative')
  );

-- Seuls les admins suppriment des phases
CREATE POLICY "project_phases_delete_admin"
  ON project_phases FOR DELETE
  USING (
    is_agency_admin(
      (SELECT agency_id FROM projects WHERE id = project_id)
    )
  );

-- ------------------------------------------
-- phase_files
-- ------------------------------------------
ALTER TABLE phase_files ENABLE ROW LEVEL SECURITY;

-- Membres de l'agence + client voient les fichiers des phases accessibles
CREATE POLICY "phase_files_select"
  ON phase_files FOR SELECT
  USING (
    phase_id IN (
      SELECT pp.id FROM project_phases pp
      JOIN projects p ON p.id = pp.project_id
      WHERE p.agency_id IN (SELECT get_user_agencies())
         OR p.client_id = auth.uid()
    )
  );

-- Admin et creative peuvent uploader (pas le client)
CREATE POLICY "phase_files_insert_non_client"
  ON phase_files FOR INSERT
  WITH CHECK (
    uploaded_by = auth.uid()
    AND phase_id IN (
      SELECT pp.id FROM project_phases pp
      JOIN projects p ON p.id = pp.project_id
      WHERE p.agency_id IN (SELECT get_user_agencies())
    )
    AND get_user_role(
      (SELECT p.agency_id FROM project_phases pp JOIN projects p ON p.id = pp.project_id WHERE pp.id = phase_id)
    ) IN ('super_admin', 'agency_admin', 'creative')
  );

-- L'uploader ou un admin peut modifier les métadonnées du fichier
CREATE POLICY "phase_files_update"
  ON phase_files FOR UPDATE
  USING (
    uploaded_by = auth.uid()
    OR is_agency_admin(
      (SELECT p.agency_id FROM project_phases pp JOIN projects p ON p.id = pp.project_id WHERE pp.id = phase_id)
    )
  );

-- L'uploader ou un admin peut supprimer un fichier
CREATE POLICY "phase_files_delete"
  ON phase_files FOR DELETE
  USING (
    uploaded_by = auth.uid()
    OR is_agency_admin(
      (SELECT p.agency_id FROM project_phases pp JOIN projects p ON p.id = pp.project_id WHERE pp.id = phase_id)
    )
  );

-- ------------------------------------------
-- comments
-- ------------------------------------------
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

-- Membres de l'agence + client voient les commentaires
CREATE POLICY "comments_select"
  ON comments FOR SELECT
  USING (
    project_id IN (
      SELECT id FROM projects
      WHERE agency_id IN (SELECT get_user_agencies())
         OR client_id = auth.uid()
    )
  );

-- Tout participant authentifié peut commenter
CREATE POLICY "comments_insert"
  ON comments FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND project_id IN (
      SELECT id FROM projects
      WHERE agency_id IN (SELECT get_user_agencies())
         OR client_id = auth.uid()
    )
  );

-- Un utilisateur peut modifier son propre commentaire
CREATE POLICY "comments_update_own"
  ON comments FOR UPDATE
  USING (user_id = auth.uid());

-- L'auteur ou un admin peut supprimer un commentaire
CREATE POLICY "comments_delete"
  ON comments FOR DELETE
  USING (
    user_id = auth.uid()
    OR is_agency_admin(
      (SELECT agency_id FROM projects WHERE id = project_id)
    )
  );

-- ------------------------------------------
-- activity_logs
-- ------------------------------------------
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- Membres de l'agence (pas les clients) voient les logs
CREATE POLICY "activity_logs_select"
  ON activity_logs FOR SELECT
  USING (
    project_id IN (
      SELECT id FROM projects
      WHERE agency_id IN (SELECT get_user_agencies())
    )
    AND get_user_role(
      (SELECT agency_id FROM projects WHERE id = project_id)
    ) IN ('super_admin', 'agency_admin', 'creative')
  );

-- Insertion uniquement via service role ou triggers (pas de policy INSERT pour les users)
CREATE POLICY "activity_logs_insert_service"
  ON activity_logs FOR INSERT
  WITH CHECK (
    project_id IN (
      SELECT id FROM projects
      WHERE agency_id IN (SELECT get_user_agencies())
    )
  );

-- Pas de UPDATE sur les logs (immuables)
-- Pas de DELETE sur les logs (audit trail)

-- ------------------------------------------
-- invitations
-- ------------------------------------------
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;

-- Seuls les admins voient les invitations de leur agence
CREATE POLICY "invitations_select_admin"
  ON invitations FOR SELECT
  USING (is_agency_admin(agency_id));

-- Seuls les admins créent des invitations
CREATE POLICY "invitations_insert_admin"
  ON invitations FOR INSERT
  WITH CHECK (
    is_agency_admin(agency_id)
    AND invited_by = auth.uid()
  );

-- L'invitation peut être mise à jour lors de l'acceptation (accepted_at)
-- Accessible par le token (sans auth) via service role uniquement
CREATE POLICY "invitations_update_admin"
  ON invitations FOR UPDATE
  USING (is_agency_admin(agency_id));

-- Seuls les admins suppriment des invitations
CREATE POLICY "invitations_delete_admin"
  ON invitations FOR DELETE
  USING (is_agency_admin(agency_id));
