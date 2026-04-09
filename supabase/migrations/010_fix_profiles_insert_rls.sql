-- ── Migration 010 : Fix profiles INSERT RLS + trigger robustesse ──────────────
--
-- CAUSE DE L'ERREUR "Database error creating new user" :
--
-- La policy "profiles_insert_service_role" avait :
--   WITH CHECK (id = auth.uid())
--
-- Quand admin.auth.admin.createUser() est appelé (pas de session JWT),
-- auth.uid() = NULL → id = NULL → FALSE → le trigger handle_new_user
-- échoue → Supabase rollback l'INSERT dans auth.users.
--
-- Fix 1 : Autoriser l'INSERT quand la requête vient du service_role
--         (pas de session JWT = contexte trigger).
-- Fix 2 : Rendre le trigger idempotent (ON CONFLICT DO NOTHING) et
--         l'envelopper dans un bloc EXCEPTION pour ne jamais bloquer
--         la création d'un utilisateur auth.
-- Fix 3 : S'assurer que la fonction appartient à postgres (BYPASSRLS).

-- ── 1. Corriger la policy INSERT sur profiles ────────────────────────

DROP POLICY IF EXISTS "profiles_insert_service_role" ON profiles;

CREATE POLICY "profiles_insert_service_role"
  ON profiles FOR INSERT
  WITH CHECK (
    id = auth.uid()                -- inscription normale (magic link, OAuth)
    OR auth.role() = 'service_role' -- appels admin API (createUser, seed, etc.)
    OR auth.uid() IS NULL           -- contexte trigger sans JWT
  );

-- ── 2. Rendre le trigger handle_new_user robuste ─────────────────────

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1))
  )
  ON CONFLICT (id) DO NOTHING;  -- idempotent si le profil existe déjà

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Ne jamais bloquer la création de l'utilisateur auth si l'insert profil échoue.
  -- L'appelant (createClientAction) fait un upsert explicite juste après.
  RAISE WARNING 'handle_new_user: could not insert profile for user % : %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── 3. Propriétaire = postgres pour garantir BYPASSRLS ───────────────

ALTER FUNCTION handle_new_user() OWNER TO postgres;
