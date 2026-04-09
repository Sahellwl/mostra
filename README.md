# MOSTRA

SaaS de gestion de production vidéo pour les agences — suivi de projets, phases, fichiers, commentaires et portail client.

## Stack

| Couche | Technologie |
|--------|-------------|
| Framework | Next.js 14 (App Router) |
| Base de données | Supabase (PostgreSQL + Auth + Storage + Realtime) |
| UI | Tailwind CSS v4, Lucide React, Base UI |
| Forms | React Hook Form + Zod |
| Requêtes | TanStack Query v5 |
| Notifications | Sonner |
| Langage | TypeScript 5 |

## Prérequis

- Node.js 18+
- Un projet Supabase (URL + anon key + service role key)

## Installation

```bash
npm install
```

Créer un fichier `.env.local` à la racine :

```env
NEXT_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_APP_NAME=MOSTRA
```

Appliquer les migrations dans l'éditeur SQL Supabase (dossier `supabase/migrations/`).

## Scripts

| Commande | Description |
|----------|-------------|
| `npm run dev` | Serveur de développement |
| `npm run build` | Build de production |
| `npm run start` | Serveur de production |
| `npm run lint` | Analyse ESLint |
| `npm run seed` | Seeder la base de données |

## Structure

```
src/
├── app/
│   ├── (auth)/          # Login, inscription, invitation
│   ├── (dashboard)/     # Interface agence (projets, clients, settings)
│   ├── admin/           # Super admin (multi-agences)
│   └── client/          # Portail client (accès par token)
├── components/
│   ├── admin/           # Composants admin
│   ├── client/          # Composants portail client
│   ├── dashboard/       # Sidebar dashboard
│   ├── project/         # Phases, commentaires, fichiers
│   ├── settings/        # Formulaires paramètres
│   └── shared/          # EmptyState, Skeleton, StatCard…
└── lib/
    ├── hooks/           # Hooks Realtime (commentaires, activité)
    ├── supabase/        # Clients, queries, helpers
    ├── types/           # Types globaux et types base de données
    └── utils/           # Dates, fichiers, classes
```

## Rôles

| Rôle | Accès |
|------|-------|
| `super_admin` | `/admin` — vue globale toutes agences |
| `owner` / `admin` | `/dashboard` — gestion agence complète |
| `member` | `/dashboard` — lecture + commentaires |
| Client | `/client/[token]` — portail lecture seule |
