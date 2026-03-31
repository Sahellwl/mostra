# MOSTRA — Architecture Technique & Spécifications MVP

> **Version**: 1.0 — 31 mars 2026
> **Projet**: MOSTRA — SaaS de gestion de production pour agences créatives
> **Stack**: Next.js 14 (App Router) + Supabase + Tailwind CSS + shadcn/ui
> **Auteur**: Tarik Lebailly

---

## 1. Vision Produit

MOSTRA est un SaaS multi-tenant permettant aux agences de motion design (et à terme d'autres agences créatives) de gérer leurs projets de production avec leurs clients. Chaque projet suit un pipeline de phases (Script → Design → Animation → Render) avec un double dashboard : un espace admin (agence + créatif) et un espace client (lecture seule, suivi de progression).

### 1.1 Principes d'architecture

- **Multi-tenant by design** : chaque agence est un "tenant" isolé (données, branding, utilisateurs)
- **Scalable** : le modèle de données est générique — les phases du pipeline sont configurables par agence
- **Role-based access** : 4 rôles avec permissions granulaires
- **Real-time** : commentaires et notifications en temps réel via Supabase Realtime
- **File-first** : chaque phase peut contenir des fichiers (PDF scripts, assets design, vidéos rendues)

---

## 2. Rôles & Permissions

| Rôle | Code | Périmètre | Droits |
|------|------|-----------|--------|
| Super Admin | `super_admin` | Multi-agence | CRUD agences, gestion globale, analytics cross-agence |
| Admin Agence | `agency_admin` | 1 agence | CRUD projets, clients, créatifs. Config pipeline & branding |
| Créatif / Artiste | `creative` | Projets assignés | Upload fichiers, avancer les phases, commenter |
| Client | `client` | Projets liés | Lecture seule, voir progression, commenter, approuver livrables |

### 2.1 Matrice de permissions détaillée

| Action | Super Admin | Agency Admin | Creative | Client |
|--------|:-----------:|:------------:|:--------:|:------:|
| Créer une agence | ✅ | ❌ | ❌ | ❌ |
| Gérer les paramètres agence | ✅ | ✅ | ❌ | ❌ |
| Créer un projet | ✅ | ✅ | ❌ | ❌ |
| Assigner un créatif | ✅ | ✅ | ❌ | ❌ |
| Voir tous les projets de l'agence | ✅ | ✅ | ❌ | ❌ |
| Voir ses projets assignés | ✅ | ✅ | ✅ | ✅ |
| Upload fichiers sur une phase | ✅ | ✅ | ✅ | ❌ |
| Envoyer en review | ✅ | ✅ | ✅ | ❌ |
| Approuver un livrable | ✅ | ✅ | ❌ | ✅ |
| Commenter | ✅ | ✅ | ✅ | ✅ |
| Voir l'activité/logs | ✅ | ✅ | ✅ (ses projets) | ❌ |
| Gérer les clients | ✅ | ✅ | ❌ | ❌ |
| Inviter des utilisateurs | ✅ | ✅ | ❌ | ❌ |

---

## 3. Modèle de Données (Supabase / PostgreSQL)

### 3.1 Schéma des tables

```sql
-- ============================================
-- MULTI-TENANCY : AGENCES
-- ============================================

CREATE TABLE agencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL, -- URL-friendly: mostra, studio-xyz
  logo_url TEXT,
  primary_color TEXT DEFAULT '#EF4444', -- branding personnalisable
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- UTILISATEURS & RÔLES
-- ============================================

-- Profils utilisateurs (extension de auth.users Supabase)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  avatar_url TEXT,
  phone TEXT,
  contact_method TEXT DEFAULT 'email', -- email, whatsapp, phone
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Appartenance agence + rôle (un user peut être dans plusieurs agences)
CREATE TABLE agency_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('super_admin', 'agency_admin', 'creative', 'client')),
  invited_at TIMESTAMPTZ DEFAULT now(),
  accepted_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  UNIQUE(agency_id, user_id)
);

-- ============================================
-- PIPELINE : PHASES CONFIGURABLES
-- ============================================

-- Templates de phases par agence (configurable)
CREATE TABLE phase_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  name TEXT NOT NULL, -- "Script", "Design", "Animation", "Render"
  slug TEXT NOT NULL, -- "script", "design", "animation", "render"
  icon TEXT, -- nom d'icône lucide-react
  sort_order INT NOT NULL,
  is_default BOOLEAN DEFAULT true, -- inclus auto dans les nouveaux projets
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(agency_id, slug)
);

-- ============================================
-- PROJETS
-- ============================================

CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  client_id UUID REFERENCES profiles(id), -- le client associé
  project_manager_id UUID REFERENCES profiles(id), -- le PM / créatif principal
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'archived', 'on_hold')),
  progress INT DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  share_token TEXT UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'), -- lien client unique
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Phases d'un projet (instances du template)
CREATE TABLE project_phases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  phase_template_id UUID REFERENCES phase_templates(id),
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  sort_order INT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'in_review', 'approved', 'completed')),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- FICHIERS & VERSIONS
-- ============================================

CREATE TABLE phase_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phase_id UUID NOT NULL REFERENCES project_phases(id) ON DELETE CASCADE,
  uploaded_by UUID NOT NULL REFERENCES profiles(id),
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL, -- Supabase Storage URL
  file_type TEXT, -- mime type
  file_size BIGINT,
  version INT NOT NULL DEFAULT 1,
  is_current BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- COMMENTAIRES
-- ============================================

CREATE TABLE comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  phase_id UUID REFERENCES project_phases(id),
  user_id UUID NOT NULL REFERENCES profiles(id),
  content TEXT NOT NULL,
  is_resolved BOOLEAN DEFAULT false,
  parent_id UUID REFERENCES comments(id), -- réponses imbriquées
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- ACTIVITÉ / LOGS
-- ============================================

CREATE TABLE activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id),
  action TEXT NOT NULL, -- 'file_uploaded', 'phase_started', 'comment_added', 'status_changed', etc.
  details JSONB, -- métadonnées flexibles
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- INVITATIONS (lien client)
-- ============================================

CREATE TABLE invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'client',
  invited_by UUID NOT NULL REFERENCES profiles(id),
  token TEXT UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  accepted_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ DEFAULT (now() + interval '7 days'),
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### 3.2 Row Level Security (RLS) — Principes

```sql
-- Principe : chaque requête est filtrée par l'agence de l'utilisateur connecté

-- Fonction helper : récupérer les agences d'un user
CREATE OR REPLACE FUNCTION get_user_agencies()
RETURNS SETOF UUID AS $$
  SELECT agency_id FROM agency_members
  WHERE user_id = auth.uid() AND is_active = true;
$$ LANGUAGE sql SECURITY DEFINER;

-- Fonction helper : récupérer le rôle d'un user dans une agence
CREATE OR REPLACE FUNCTION get_user_role(agency UUID)
RETURNS TEXT AS $$
  SELECT role FROM agency_members
  WHERE user_id = auth.uid() AND agency_id = agency AND is_active = true;
$$ LANGUAGE sql SECURITY DEFINER;

-- Exemple RLS sur projects
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see projects of their agencies"
  ON projects FOR SELECT
  USING (agency_id IN (SELECT get_user_agencies()));

CREATE POLICY "Admins can create projects"
  ON projects FOR INSERT
  WITH CHECK (
    get_user_role(agency_id) IN ('super_admin', 'agency_admin')
  );

-- Clients ne voient que leurs projets
CREATE POLICY "Clients see own projects"
  ON projects FOR SELECT
  USING (
    client_id = auth.uid()
    OR agency_id IN (SELECT get_user_agencies())
  );
```

### 3.3 Indexes recommandés

```sql
CREATE INDEX idx_agency_members_user ON agency_members(user_id);
CREATE INDEX idx_agency_members_agency ON agency_members(agency_id);
CREATE INDEX idx_projects_agency ON projects(agency_id);
CREATE INDEX idx_projects_client ON projects(client_id);
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_project_phases_project ON project_phases(project_id);
CREATE INDEX idx_phase_files_phase ON phase_files(phase_id);
CREATE INDEX idx_comments_project ON comments(project_id);
CREATE INDEX idx_activity_logs_project ON activity_logs(project_id);
```

---

## 4. Structure du Projet Next.js

```
mostra/
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── login/page.tsx
│   │   │   ├── register/page.tsx
│   │   │   └── invite/[token]/page.tsx
│   │   ├── (dashboard)/
│   │   │   ├── layout.tsx              -- Sidebar + header (admin)
│   │   │   ├── page.tsx                -- Dashboard principal (tous projets)
│   │   │   ├── projects/
│   │   │   │   ├── [id]/
│   │   │   │   │   ├── page.tsx        -- Vue projet admin (phases, files, comments)
│   │   │   │   │   └── settings/page.tsx
│   │   │   │   └── new/page.tsx        -- Créer un projet
│   │   │   ├── clients/
│   │   │   │   ├── page.tsx            -- Liste clients
│   │   │   │   └── [id]/page.tsx       -- Détail client
│   │   │   └── settings/
│   │   │       ├── page.tsx            -- Paramètres agence
│   │   │       ├── team/page.tsx       -- Gestion équipe
│   │   │       └── pipeline/page.tsx   -- Config phases
│   │   ├── client/                     -- ESPACE CLIENT (layout différent)
│   │   │   ├── layout.tsx              -- Layout client simplifié
│   │   │   ├── [token]/                -- Accès par share_token
│   │   │   │   └── page.tsx            -- Vue projet client
│   │   │   └── dashboard/
│   │   │       └── page.tsx            -- Dashboard client (ses projets)
│   │   ├── admin/                      -- SUPER ADMIN
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx                -- Vue cross-agences
│   │   │   └── agencies/
│   │   │       └── [id]/page.tsx
│   │   └── api/
│   │       ├── webhooks/
│   │       └── ...
│   ├── components/
│   │   ├── ui/                         -- shadcn/ui components
│   │   ├── dashboard/
│   │   │   ├── ProjectCard.tsx
│   │   │   ├── StatsCards.tsx
│   │   │   ├── ProjectFilters.tsx
│   │   │   └── Sidebar.tsx
│   │   ├── project/
│   │   │   ├── PhaseCard.tsx
│   │   │   ├── PhaseTimeline.tsx
│   │   │   ├── FileUpload.tsx
│   │   │   ├── FileVersionHistory.tsx
│   │   │   ├── CommentSection.tsx
│   │   │   ├── ActivityLog.tsx
│   │   │   └── ProjectInfo.tsx
│   │   ├── client/
│   │   │   ├── ClientProjectView.tsx
│   │   │   ├── ClientPhaseCard.tsx
│   │   │   └── ContactManager.tsx
│   │   └── shared/
│   │       ├── ProgressBar.tsx
│   │       ├── StatusBadge.tsx
│   │       ├── Avatar.tsx
│   │       └── EmptyState.tsx
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts               -- Supabase browser client
│   │   │   ├── server.ts               -- Supabase server client
│   │   │   ├── admin.ts                -- Service role client
│   │   │   └── middleware.ts           -- Auth middleware
│   │   ├── hooks/
│   │   │   ├── useProjects.ts
│   │   │   ├── useProject.ts
│   │   │   ├── usePhases.ts
│   │   │   ├── useComments.ts
│   │   │   ├── useAuth.ts
│   │   │   └── useAgency.ts
│   │   ├── utils/
│   │   │   ├── permissions.ts          -- Helpers de vérification de rôle
│   │   │   ├── dates.ts
│   │   │   └── files.ts
│   │   └── types/
│   │       ├── database.ts             -- Types Supabase auto-générés
│   │       └── index.ts
│   └── styles/
│       └── globals.css
├── supabase/
│   ├── migrations/
│   │   └── 001_initial_schema.sql
│   ├── seed.sql                        -- Données de démo
│   └── config.toml
├── public/
├── .env.local
├── next.config.js
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

---

## 5. Design System & UI

### 5.1 Thème (Dark Mode par défaut)

```css
/* Palette principale — inspirée des screenshots */
--background: #0a0a0a;           /* Fond principal */
--card-bg: #1a1a1a;              /* Fond des cards */
--card-bg-hover: #222222;        /* Hover cards */
--border: #2a2a2a;               /* Bordures subtiles */
--text-primary: #ffffff;         /* Texte principal */
--text-secondary: #a0a0a0;       /* Texte secondaire */
--text-muted: #666666;           /* Texte discret */
--accent: #EF4444;               /* Rouge MOSTRA (CTA, progress bars, badges) */
--accent-hover: #DC2626;
--status-active: #22C55E;        /* Badge "active" */
--status-completed: #22C55E;     /* Badge "completed" */
--status-pending: #6B7280;       /* Badge "pending" */
--status-in-progress: #3B82F6;   /* Badge "in progress" */
--status-in-review: #F59E0B;     /* Badge "in review" */
```

### 5.2 Composants clés

**ProjectCard** (Dashboard principal)
- Nom du projet (titre), nom du client (sous-titre)
- Badge statut (active/completed) coloré
- Phase courante + barre de progression
- Date de dernière mise à jour

**PhaseCard** (Vue projet)
- Icône + nom de la phase
- Badge statut
- Actions conditionnelles : View | Upload | Send to Review
- Cadenas (🔒) pour phases non débloquées côté client

**Sidebar** (Admin)
- Logo agence
- Navigation : Dashboard, Clients, Settings
- Bouton Logout en bas

---

## 6. Flux Utilisateur Clés

### 6.1 Création de projet (Admin)
1. Clic "+ New Project"
2. Formulaire : nom, description, client (select ou nouveau), créatif assigné
3. Les phases par défaut de l'agence sont automatiquement créées
4. Un `share_token` est généré → URL client unique
5. Option : envoyer le lien au client par email

### 6.2 Workflow d'une phase (Créatif)
1. Phase passe de "Pending" à "In Progress" quand le créatif commence
2. Upload de fichiers (avec versioning)
3. Clic "Send to Review" → statut "In Review"
4. Le client voit la phase débloquée et peut consulter/commenter
5. Le client approuve → phase "Completed", phase suivante débloquée
6. La progression du projet se recalcule automatiquement

### 6.3 Accès client
- **Option A** : via lien unique (`/client/[share_token]`) — pas besoin de compte
- **Option B** : via compte client avec dashboard de tous ses projets
- Le client voit : progression globale, phases (avec cadenas si non débloquées), contact PM

---

## 7. Supabase Storage — Structure

```
storage/
├── project-files/
│   ├── [project_id]/
│   │   ├── script/
│   │   │   ├── v1/
│   │   │   │   └── Script_Mostra_V01.pdf
│   │   │   └── v2/
│   │   │       └── Script_Mostra_V02.pdf
│   │   ├── design/
│   │   ├── animation/
│   │   └── render/
├── agency-assets/
│   ├── [agency_id]/
│   │   ├── logo.png
│   │   └── ...
└── avatars/
    └── [user_id].jpg
```

---

## 8. API Routes (Next.js)

Routes principales côté serveur (Server Actions ou API Routes) :

| Endpoint | Méthode | Description |
|----------|---------|-------------|
| `/api/projects` | GET, POST | Liste/création projets |
| `/api/projects/[id]` | GET, PATCH, DELETE | CRUD projet |
| `/api/projects/[id]/phases` | GET, POST | Phases d'un projet |
| `/api/projects/[id]/phases/[phaseId]/files` | GET, POST | Fichiers d'une phase |
| `/api/projects/[id]/phases/[phaseId]/review` | POST | Envoyer en review |
| `/api/projects/[id]/phases/[phaseId]/approve` | POST | Approuver (client) |
| `/api/projects/[id]/comments` | GET, POST | Commentaires |
| `/api/clients` | GET, POST | CRUD clients |
| `/api/agencies/[id]/settings` | GET, PATCH | Config agence |
| `/api/invitations` | POST | Envoyer invitation |
| `/api/client/[token]` | GET | Accès projet par token |

> **Note**: Privilégier les **Server Actions** de Next.js 14 pour les mutations (create, update, delete) et les **Route Handlers** uniquement pour les webhooks et endpoints externes.

---

## 9. Roadmap MVP — Sprints

### Sprint 1 — Fondations (Setup + Auth + DB)
- [ ] Init projet Next.js 14 + Tailwind + shadcn/ui
- [ ] Setup Supabase (projet, migrations, seed)
- [ ] Auth (login, register, middleware)
- [ ] Layout admin avec Sidebar
- [ ] Page de base vide

### Sprint 2 — Dashboard Principal
- [ ] StatsCards (Total, Active, Completed)
- [ ] ProjectCard component
- [ ] Liste des projets avec filtres (All/Active/Completed)
- [ ] Recherche par nom
- [ ] Bouton "+ New Project" → formulaire création

### Sprint 3 — Vue Projet (Admin)
- [ ] Page projet avec PhaseCards
- [ ] Upload de fichiers par phase
- [ ] Versioning des fichiers
- [ ] Bouton "Send to Review"
- [ ] Sidebar ProjectInfo
- [ ] ActivityLog

### Sprint 4 — Commentaires & Notifications
- [ ] CommentSection (avec réponses)
- [ ] Realtime comments (Supabase Realtime)
- [ ] Activity log en temps réel

### Sprint 5 — Espace Client
- [ ] Layout client (simplifié)
- [ ] Accès par share_token
- [ ] Vue projet client (progression, phases, cadenas)
- [ ] ContactManager (WhatsApp/email)
- [ ] Approbation de livrables

### Sprint 6 — Gestion Clients & Team
- [ ] Page Clients (CRUD)
- [ ] Système d'invitations par email
- [ ] Page Settings → Team management
- [ ] Page Settings → Pipeline configuration

### Sprint 7 — Super Admin
- [ ] Dashboard cross-agences
- [ ] Création/gestion d'agences
- [ ] Analytics globales

### Sprint 8 — Polish & Deploy
- [ ] Responsive design
- [ ] Loading states, error handling, empty states
- [ ] SEO meta
- [ ] Deploy Vercel + Supabase production

---

## 10. Variables d'Environnement

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_APP_NAME=MOSTRA

# Email (optionnel MVP)
RESEND_API_KEY=re_...
```

---

## 11. Conventions de Code

- **TypeScript strict** — pas de `any`
- **Naming** : composants PascalCase, hooks `use*`, utils camelCase
- **Fichiers** : 1 composant = 1 fichier
- **Imports** : alias `@/` pour `src/`
- **Server vs Client** : `"use client"` explicite, tout est Server Component par défaut
- **State serveur** : React Query (TanStack Query) pour le cache et les mutations
- **Formulaires** : React Hook Form + Zod validation
- **Dates** : `date-fns` avec locale `fr`
- **Icons** : `lucide-react`

---

## 12. Scalabilité — Adaptation à d'autres secteurs

Le design est volontairement générique :

| Concept MOSTRA | Agence Motion Design | Agence Web | Studio Photo | Architecture |
|----------------|---------------------|------------|-------------|-------------|
| Phase 1 | Script | Brief | Shooting | Esquisse |
| Phase 2 | Design | Wireframe | Retouche | APS |
| Phase 3 | Animation | Dev | Livraison | APD |
| Phase 4 | Render | Recette | — | DCE |

La table `phase_templates` est configurable par agence → aucun code à modifier pour adapter à un autre secteur.

---

*Ce document est la référence unique du projet. Il doit être fourni en contexte à chaque session Claude Code ou Claude Cowork.*
