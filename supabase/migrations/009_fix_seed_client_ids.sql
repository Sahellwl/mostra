-- ── Migration 009 : Fix client_id sur les projets seed ──────────────
--
-- PROJ_2 (Luxe Cosmetics) et PROJ_3 (EcoGreen) avaient client_id = NULL
-- dans le seed initial. Sans client_id, requestRevisionAsClient ne peut
-- pas créer de commentaire (user_id NOT NULL).
--
-- Ce script assigne le client de démo (Alex Chen / client@techvision.io)
-- aux projets qui n'ont pas encore de client assigné.

UPDATE projects
SET client_id = (
  SELECT id FROM profiles
  WHERE email = 'client@techvision.io'
  LIMIT 1
)
WHERE client_id IS NULL
  AND id IN (
    'cccccccc-0000-0000-0000-000000000002',  -- Luxe Cosmetics Product Launch
    'cccccccc-0000-0000-0000-000000000003'   -- EcoGreen Sustainability Campaign
  );
