# MOSTRA

SaaS de gestion de production pour agences créatives.

## Stack

- **Framework** : Next.js 14 (App Router)
- **Base de données** : Supabase (PostgreSQL + Auth + Storage + Realtime)
- **UI** : Tailwind CSS + shadcn/ui (dark mode)
- **State serveur** : TanStack React Query
- **Formulaires** : React Hook Form + Zod
- **Icônes** : Lucide React
- **Dates** : date-fns

## Setup

### Prérequis

- Node.js 18+
- npm
- Un projet Supabase (https://supabase.com)

### Installation

```bash
# Cloner le repo
git clone <repo-url>
cd mostra

# Installer les dépendances
npm install
```

### Configuration

Copier `.env.local` et remplir les variables :

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_APP_NAME=MOSTRA
```

### Base de données

Exécuter les migrations SQL dans Supabase :

```bash
# Les migrations sont dans supabase/migrations/
# Appliquer 001_initial_schema.sql dans l'éditeur SQL Supabase
```

### Développement

```bash
npm run dev
```

L'application est disponible sur [http://localhost:3000](http://localhost:3000).

## Structure du projet

```
src/
├── app/              # Routes Next.js (App Router)
│   ├── (auth)/       # Pages d'authentification
│   ├── (dashboard)/  # Espace admin/créatif
│   ├── client/       # Espace client
│   ├── admin/        # Super admin
│   └── api/          # API routes
├── components/       # Composants React
│   ├── ui/           # shadcn/ui
│   ├── dashboard/    # Composants dashboard
│   ├── project/      # Composants projet
│   ├── client/       # Composants espace client
│   └── shared/       # Composants partagés
├── lib/              # Logique métier
│   ├── supabase/     # Clients Supabase
│   ├── hooks/        # React Query hooks
│   ├── utils/        # Utilitaires
│   └── types/        # Types TypeScript
└── styles/           # Thème MOSTRA
```

## Architecture

Voir `MOSTRA_ARCHITECTURE.md` pour la documentation complète.
