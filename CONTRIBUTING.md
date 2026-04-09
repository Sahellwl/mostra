# Contribuer à MOSTRA

## Prérequis

Lire le README pour l'installation locale avant de commencer.

## Workflow

1. Créer une branche depuis `master` : `feat/`, `fix/`, ou `chore/` selon le type
2. Faire des commits atomiques avec un message clair
3. Ouvrir une Pull Request vers `master`

## Conventions de code

### Formatting

Prettier est configuré (`.prettierrc`). Lancer avant de commit :

```bash
npx prettier --write "src/**/*.{ts,tsx}"
```

### Lint

```bash
npm run lint
```

Zéro warning ESLint toléré en PR.

### TypeScript

- Pas de `as any` sauf via le helper `db()` dans `src/lib/supabase/helpers.ts` (raison documentée dans le fichier)
- Typer les props de tous les composants
- Pas de `@ts-ignore`

### Composants

- Server Components par défaut ; `'use client'` uniquement si nécessaire (event handlers, hooks, browser APIs)
- Les Server Actions sont dans des fichiers `actions.ts` colocalisés avec la route
- Les composants partagés vont dans `src/components/shared/`

### Supabase

- Utiliser `createClient()` (server) dans les Server Components et Actions
- Utiliser `createBrowserClient()` dans les hooks `'use client'`
- Utiliser `createAdminClient()` uniquement pour les opérations super admin (bypass RLS)
- Envelopper le client dans `db()` pour les requêtes INSERT/UPDATE ou les SELECT imbriqués complexes

## Build

Le build doit passer sans erreur avant toute PR :

```bash
npm run build
```
