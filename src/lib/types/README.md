# MOSTRA — Structure de données

> Ref: `supabase/migrations/001_initial_schema.sql` + `011_subphases_and_blocks.sql`

## Hiérarchie des entités (Sprint 9)

```
Agency
└── Project
    └── ProjectPhase          (Analyse / Design / Audio / Animation / Rendu)
        ├── SubPhase           (ex: Formulaire, Script, Style, Storyboard…)
        │   ├── PhaseBlock     (blocs de contenu ordonnés)
        │   │   └── Comment    (commentaires sur un bloc)
        │   └── Comment        (commentaires sur la sous-phase)
        ├── PhaseFile          (fichiers directs — Animation & Rendu sans sous-phases)
        └── Comment            (commentaires sur la phase)
```

## Nouveau pipeline (5 phases)

| Phase      | Slug        | Sous-phases                          |
|------------|-------------|--------------------------------------|
| Analyse    | `analyse`   | Formulaire (`form_question`), Script (`script_section`) |
| Design     | `design`    | Style (`moodboard_image`), Storyboard (`storyboard_shot`), Design (`design_file`) |
| Audio      | `audio`     | Voix off (`audio_track`), Musique (`audio_track`) |
| Animation  | `animation` | _(aucune sous-phase — système fichiers classique)_ |
| Rendu      | `rendu`     | _(aucune sous-phase — système fichiers classique)_ |

## Types de blocs (`PhaseBlock.type`)

| Type              | Sous-phase cible    | Contenu JSON (`BlockContentByType`)              |
|-------------------|---------------------|--------------------------------------------------|
| `form_question`   | Formulaire          | `{ question, answer, required, field_type, options? }` |
| `script_section`  | Script              | `{ title, color, content, description? }`        |
| `moodboard_image` | Style               | `{ title, image_url, description?, is_selected }` |
| `storyboard_shot` | Storyboard          | `{ shot_number, image_url, description? }`        |
| `audio_track`     | VO / Musique        | `{ title, audio_url, description?, kind, is_selected }` |
| `design_file`     | Design              | `{ file_url, file_name, description? }`           |

Pour un accès typé au contenu :

```ts
import type { TypedPhaseBlock } from '@/lib/types'

const block: TypedPhaseBlock<'script_section'> = {
  // ...
  type: 'script_section',
  content: { title: 'Intro', color: '#00D76B', content: '...' },
}
```

## Commentaires

`Comment` peut pointer vers :
- `project_id` + `phase_id` → commentaire sur une phase
- `project_id` + `sub_phase_id` → commentaire sur une sous-phase
- `project_id` + `block_id` → commentaire sur un bloc précis
- `parent_id` → réponse imbriquée

## RLS

Toutes les nouvelles tables (`sub_phases`, `phase_blocks`, `form_templates`) héritent des règles via FK :

- **Lecture** : membres de l'agence + client propriétaire du projet
- **Écriture** : `super_admin`, `agency_admin`, `creative` de l'agence
- **Suppression** : `agency_admin` / `super_admin` (+ auteur pour les blocs)

## Types composites utiles

| Type                         | Usage                                         |
|------------------------------|-----------------------------------------------|
| `PhaseWithSubPhases`         | Phase avec ses sous-phases et fichiers directs |
| `SubPhaseWithBlocks`         | Sous-phase avec ses blocs                     |
| `SubPhaseWithBlocksAndComments` | Sous-phase + blocs + commentaires          |
| `PhaseBlockWithComments`     | Bloc avec ses commentaires                    |
| `ProjectWithDetails`         | Projet complet avec phases, client, PM        |
