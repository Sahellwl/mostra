-- ── Migration 004 : Activation du Realtime ───────────────────────
-- Active la publication Realtime Supabase sur les tables nécessaires
-- pour les mises à jour en direct de la page projet.

ALTER PUBLICATION supabase_realtime ADD TABLE comments, activity_logs, project_phases, phase_files;
