-- ============================================================
-- Migration 016 : système de notifications
-- ============================================================

CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  agency_id UUID REFERENCES agencies(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN (
    'comment_added',
    'phase_approved',
    'revision_requested',
    'form_submitted',
    'phase_ready',
    'file_uploaded',
    'project_created',
    'member_joined'
  )),
  title TEXT NOT NULL,
  message TEXT,
  link TEXT,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_unread ON notifications(user_id, is_read) WHERE is_read = false;
CREATE INDEX idx_notifications_project ON notifications(project_id) WHERE project_id IS NOT NULL;
CREATE INDEX idx_notifications_created ON notifications(created_at DESC);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own notifications"
  ON notifications FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users update own notifications"
  ON notifications FOR UPDATE
  USING (user_id = auth.uid());

-- Service role (admin client) peut tout insérer
CREATE POLICY "Service role insert notifications"
  ON notifications FOR INSERT
  WITH CHECK (true);

-- Activer Realtime pour les notifications push
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
