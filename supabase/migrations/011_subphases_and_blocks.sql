-- ============================================================
-- MOSTRA — Sprint 9 : Sous-phases & Blocs de contenu
-- Version: 1.0 — Sprint 9
-- ============================================================
-- Ajoute 3 nouvelles tables (sub_phases, phase_blocks, form_templates)
-- et enrichit comments + phase_templates.
-- Aucune table existante n'est supprimée.
-- ============================================================

-- ============================================
-- TABLE : sub_phases
-- ============================================

CREATE TABLE sub_phases (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  phase_id     UUID        NOT NULL REFERENCES project_phases(id) ON DELETE CASCADE,
  name         TEXT        NOT NULL,
  slug         TEXT        NOT NULL,
  sort_order   INT         NOT NULL,
  status       TEXT        NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'in_progress', 'in_review', 'approved', 'completed')),
  started_at   TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (phase_id, slug)
);

-- ============================================
-- TABLE : phase_blocks
-- ============================================

CREATE TABLE phase_blocks (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  sub_phase_id UUID        REFERENCES sub_phases(id) ON DELETE CASCADE,
  phase_id     UUID        REFERENCES project_phases(id) ON DELETE CASCADE,
  -- CONTRAINTE : exactement l'un des deux doit être non-null
  CONSTRAINT phase_blocks_target_check CHECK (
    (sub_phase_id IS NOT NULL) != (phase_id IS NOT NULL)
    OR (sub_phase_id IS NOT NULL AND phase_id IS NULL)
    OR (sub_phase_id IS NULL AND phase_id IS NOT NULL)
  ),
  type         TEXT        NOT NULL CHECK (type IN (
    'form_question',   -- { question, answer, required, field_type: text|textarea|select, options? }
    'script_section',  -- { title, color, content, description }
    'moodboard_image', -- { title, image_url, description, is_selected }
    'storyboard_shot', -- { shot_number, image_url, description }
    'audio_track',     -- { title, audio_url, description, kind: vo|music, is_selected }
    'design_file'      -- { file_url, file_name, description }
  )),
  content      JSONB       NOT NULL DEFAULT '{}',
  sort_order   INT         NOT NULL DEFAULT 0,
  is_approved  BOOLEAN     NOT NULL DEFAULT false,
  created_by   UUID        REFERENCES profiles(id),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- TABLE : form_templates
-- ============================================

CREATE TABLE form_templates (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id   UUID        NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  name        TEXT        NOT NULL,
  description TEXT,
  -- Array de { id, question, field_type: text|textarea|select, required, options? }
  questions   JSONB       NOT NULL DEFAULT '[]',
  is_default  BOOLEAN     NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- MIGRATION : phase_templates (nouveau champ sub_phases)
-- ============================================

-- Ajoute la définition des sous-phases par défaut au template de phase.
-- Format : [{ name, slug, sort_order }]
ALTER TABLE phase_templates
  ADD COLUMN IF NOT EXISTS sub_phases JSONB NOT NULL DEFAULT '[]';

-- Mise à jour des 5 nouvelles phases par défaut (slug-based, agnostic)
-- À exécuter après que le seed ait créé les templates d'agence.
-- On met à jour tous les templates existants par slug pour refléter le nouveau pipeline.

UPDATE phase_templates SET sub_phases = '[
  {"name": "Formulaire", "slug": "formulaire", "sort_order": 1},
  {"name": "Script",     "slug": "script",     "sort_order": 2}
]' WHERE slug = 'analyse';

UPDATE phase_templates SET sub_phases = '[
  {"name": "Style",      "slug": "style",      "sort_order": 1},
  {"name": "Storyboard", "slug": "storyboard", "sort_order": 2},
  {"name": "Design",     "slug": "design",     "sort_order": 3}
]' WHERE slug = 'design';

UPDATE phase_templates SET sub_phases = '[
  {"name": "Voix off", "slug": "vo",      "sort_order": 1},
  {"name": "Musique",  "slug": "musique", "sort_order": 2}
]' WHERE slug = 'audio';

-- Animation et Rendu : pas de sous-phases (gardent le système de fichiers actuel)

-- ============================================
-- MIGRATION : comments (nouveaux pointeurs)
-- ============================================

ALTER TABLE comments
  ADD COLUMN IF NOT EXISTS block_id     UUID REFERENCES phase_blocks(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS sub_phase_id UUID REFERENCES sub_phases(id)   ON DELETE CASCADE;

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX idx_sub_phases_phase       ON sub_phases(phase_id);
CREATE INDEX idx_phase_blocks_sub_phase ON phase_blocks(sub_phase_id);
CREATE INDEX idx_phase_blocks_phase     ON phase_blocks(phase_id);
CREATE INDEX idx_phase_blocks_type      ON phase_blocks(type);
CREATE INDEX idx_comments_block         ON comments(block_id);
CREATE INDEX idx_comments_sub_phase     ON comments(sub_phase_id);
CREATE INDEX idx_form_templates_agency  ON form_templates(agency_id);

-- ============================================
-- TRIGGERS : updated_at
-- ============================================

CREATE TRIGGER set_updated_at_sub_phases
  BEFORE UPDATE ON sub_phases
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_updated_at_phase_blocks
  BEFORE UPDATE ON phase_blocks
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_updated_at_form_templates
  BEFORE UPDATE ON form_templates
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE sub_phases    ENABLE ROW LEVEL SECURITY;
ALTER TABLE phase_blocks  ENABLE ROW LEVEL SECURITY;
ALTER TABLE form_templates ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------
-- sub_phases
-- ------------------------------------------

-- Membres de l'agence + client propriétaire du projet voient les sous-phases
CREATE POLICY "sub_phases_select"
  ON sub_phases FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM project_phases pp
      JOIN   projects p ON p.id = pp.project_id
      WHERE  pp.id = sub_phases.phase_id
      AND    (
        p.agency_id IN (SELECT get_user_agencies())
        OR p.client_id = auth.uid()
      )
    )
  );

-- Admin et créatif de l'agence peuvent créer/modifier/supprimer des sous-phases
CREATE POLICY "sub_phases_insert"
  ON sub_phases FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM project_phases pp
      JOIN   projects p ON p.id = pp.project_id
      WHERE  pp.id = sub_phases.phase_id
      AND    p.agency_id IN (SELECT get_user_agencies())
      AND    get_user_role(p.agency_id) IN ('super_admin', 'agency_admin', 'creative')
    )
  );

CREATE POLICY "sub_phases_update"
  ON sub_phases FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM project_phases pp
      JOIN   projects p ON p.id = pp.project_id
      WHERE  pp.id = sub_phases.phase_id
      AND    p.agency_id IN (SELECT get_user_agencies())
      AND    get_user_role(p.agency_id) IN ('super_admin', 'agency_admin', 'creative')
    )
  );

CREATE POLICY "sub_phases_delete"
  ON sub_phases FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM project_phases pp
      JOIN   projects p ON p.id = pp.project_id
      WHERE  pp.id = sub_phases.phase_id
      AND    is_agency_admin(p.agency_id)
    )
  );

-- ------------------------------------------
-- phase_blocks
-- ------------------------------------------

-- Résout le phase_id effectif (direct ou via sub_phase)
-- Membres agence + client voient les blocs
CREATE POLICY "phase_blocks_select"
  ON phase_blocks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM project_phases pp
      JOIN   projects p ON p.id = pp.project_id
      WHERE  pp.id = COALESCE(
        phase_blocks.phase_id,
        (SELECT sp.phase_id FROM sub_phases sp WHERE sp.id = phase_blocks.sub_phase_id)
      )
      AND (
        p.agency_id IN (SELECT get_user_agencies())
        OR p.client_id = auth.uid()
      )
    )
  );

CREATE POLICY "phase_blocks_insert"
  ON phase_blocks FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM project_phases pp
      JOIN   projects p ON p.id = pp.project_id
      WHERE  pp.id = COALESCE(
        phase_blocks.phase_id,
        (SELECT sp.phase_id FROM sub_phases sp WHERE sp.id = phase_blocks.sub_phase_id)
      )
      AND p.agency_id IN (SELECT get_user_agencies())
      AND get_user_role(p.agency_id) IN ('super_admin', 'agency_admin', 'creative')
    )
  );

CREATE POLICY "phase_blocks_update"
  ON phase_blocks FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM project_phases pp
      JOIN   projects p ON p.id = pp.project_id
      WHERE  pp.id = COALESCE(
        phase_blocks.phase_id,
        (SELECT sp.phase_id FROM sub_phases sp WHERE sp.id = phase_blocks.sub_phase_id)
      )
      AND p.agency_id IN (SELECT get_user_agencies())
      AND get_user_role(p.agency_id) IN ('super_admin', 'agency_admin', 'creative')
    )
  );

CREATE POLICY "phase_blocks_delete"
  ON phase_blocks FOR DELETE
  USING (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM project_phases pp
      JOIN   projects p ON p.id = pp.project_id
      WHERE  pp.id = COALESCE(
        phase_blocks.phase_id,
        (SELECT sp.phase_id FROM sub_phases sp WHERE sp.id = phase_blocks.sub_phase_id)
      )
      AND is_agency_admin(p.agency_id)
    )
  );

-- ------------------------------------------
-- form_templates
-- ------------------------------------------

CREATE POLICY "form_templates_select"
  ON form_templates FOR SELECT
  USING (agency_id IN (SELECT get_user_agencies()));

CREATE POLICY "form_templates_insert"
  ON form_templates FOR INSERT
  WITH CHECK (is_agency_admin(agency_id));

CREATE POLICY "form_templates_update"
  ON form_templates FOR UPDATE
  USING (is_agency_admin(agency_id));

CREATE POLICY "form_templates_delete"
  ON form_templates FOR DELETE
  USING (is_agency_admin(agency_id));
