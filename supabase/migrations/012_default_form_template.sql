-- ============================================================
-- 012 — Seed du template de formulaire par défaut
-- Insère "Brief vidéo motion design" pour toutes les agences
-- qui n'ont pas encore de form_template.
-- ============================================================

INSERT INTO form_templates (agency_id, name, description, questions, is_default)
SELECT
  a.id,
  'Brief vidéo motion design',
  'Formulaire de brief créatif standard pour les productions motion design.',
  '[
    {
      "id": "q1",
      "label": "Nom du projet",
      "type": "text",
      "required": true,
      "placeholder": "Ex: Campagne de lancement produit 2025"
    },
    {
      "id": "q2",
      "label": "Décrivez votre entreprise et son activité",
      "type": "textarea",
      "required": true,
      "placeholder": "Secteur, produits/services, positionnement…"
    },
    {
      "id": "q3",
      "label": "Quels sont les objectifs commerciaux de cette vidéo ?",
      "type": "textarea",
      "required": true,
      "placeholder": "Ex: notoriété, génération de leads, conversion, fidélisation…",
      "helpText": "Précisez autant que possible les résultats attendus."
    },
    {
      "id": "q4",
      "label": "Qui est votre cible principale ?",
      "type": "textarea",
      "required": true,
      "placeholder": "Âge, profession, centres d''intérêt, niveau de maturité…"
    },
    {
      "id": "q5",
      "label": "Quel est le ton souhaité ?",
      "type": "radio",
      "required": true,
      "options": ["Sérieux", "Décalé", "Pédagogique", "Émotionnel", "Premium"]
    },
    {
      "id": "q6",
      "label": "Quelle est la durée souhaitée de la vidéo ?",
      "type": "select",
      "required": true,
      "options": ["< 30 secondes", "30 – 60 secondes", "1 – 2 minutes", "2 – 5 minutes", "> 5 minutes"]
    },
    {
      "id": "q7",
      "label": "Quel est votre budget ?",
      "type": "select",
      "required": false,
      "options": ["< 2 000 €", "2 000 – 5 000 €", "5 000 – 10 000 €", "10 000 – 25 000 €", "> 25 000 €"]
    },
    {
      "id": "q8",
      "label": "Date de livraison souhaitée",
      "type": "date",
      "required": false
    },
    {
      "id": "q9",
      "label": "Avez-vous des références visuelles ou des inspirations ?",
      "type": "textarea",
      "required": false,
      "placeholder": "Liens, noms de vidéos, description de l''ambiance souhaitée…"
    },
    {
      "id": "q10",
      "label": "Y a-t-il des éléments à absolument inclure ou éviter ?",
      "type": "textarea",
      "required": false,
      "placeholder": "Couleurs à proscrire, mentions légales obligatoires, contraintes techniques…"
    }
  ]'::jsonb,
  true
FROM agencies a
WHERE NOT EXISTS (
  SELECT 1 FROM form_templates ft WHERE ft.agency_id = a.id
);
