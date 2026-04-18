-- ============================================================
-- Migration 015 : codes d'invitation courts
-- ============================================================
-- Ajoute un code court (ex: "ABCD-EF2G") aux invitations
-- pour permettre de rejoindre une agence sans lien long.
-- ============================================================

-- Ajouter la colonne invite_code (nullable : les anciennes invitations n'en ont pas)
ALTER TABLE invitations
  ADD COLUMN IF NOT EXISTS invite_code TEXT UNIQUE;

-- Rendre email nullable pour les invitations sans adresse connue (code only)
ALTER TABLE invitations
  ALTER COLUMN email DROP NOT NULL;

-- Index pour la recherche par code depuis /onboarding
CREATE INDEX IF NOT EXISTS invitations_invite_code_idx
  ON invitations (invite_code)
  WHERE invite_code IS NOT NULL;

-- Permettre à un user authentifié (sans membership) de lire
-- une invitation via son code (pour la page /onboarding).
-- L'admin client est utilisé côté serveur, mais on ajoute la
-- policy au cas où on voudrait un accès RLS direct à l'avenir.
CREATE POLICY "invitations_read_by_code"
  ON invitations FOR SELECT
  USING (
    -- L'user cherche son invitation via code (pas encore membre)
    auth.uid() IS NOT NULL
    AND invite_code IS NOT NULL
  );
