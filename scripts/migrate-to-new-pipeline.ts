/**
 * MOSTRA — Script de migration vers le nouveau pipeline (Sprint 9)
 * Usage : npx tsx scripts/migrate-to-new-pipeline.ts [--dry-run] [--project-id=<uuid>]
 *
 * Ce script transforme les projets existants (4 phases : Script/Design/Animation/Render)
 * vers le nouveau pipeline à 5 phases (Analyse/Design/Audio/Animation/Rendu) avec sous-phases.
 *
 * OPTIONS :
 *   --dry-run          Affiche les opérations sans les exécuter
 *   --project-id=uuid  Cible un seul projet (sinon tous les projets sont migrés)
 *
 * STRATÉGIE :
 *   - Renomme / ajoute les phases manquantes
 *   - Crée les sous-phases correspondantes (vides)
 *   - Ne supprime aucun fichier existant (phase_files reste intact)
 *   - Demande confirmation interactive avant d'écrire
 */

import { createClient } from '@supabase/supabase-js'
import * as readline from 'readline'

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const SUPABASE_URL       = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_ROLE_KEY   = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('❌  Variables manquantes : NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

// ---------------------------------------------------------------------------
// Nouveau pipeline cible
// ---------------------------------------------------------------------------

interface SubPhaseDefinition {
  name:       string
  slug:       string
  sort_order: number
}

interface PipelinePhase {
  name:       string
  slug:       string
  sort_order: number
  sub_phases: SubPhaseDefinition[]
}

const NEW_PIPELINE: PipelinePhase[] = [
  {
    name:       'Analyse',
    slug:       'analyse',
    sort_order: 1,
    sub_phases: [
      { name: 'Formulaire', slug: 'formulaire', sort_order: 1 },
      { name: 'Script',     slug: 'script',     sort_order: 2 },
    ],
  },
  {
    name:       'Design',
    slug:       'design',
    sort_order: 2,
    sub_phases: [
      { name: 'Style',      slug: 'style',      sort_order: 1 },
      { name: 'Storyboard', slug: 'storyboard', sort_order: 2 },
      { name: 'Design',     slug: 'design',     sort_order: 3 },
    ],
  },
  {
    name:       'Audio',
    slug:       'audio',
    sort_order: 3,
    sub_phases: [
      { name: 'Voix off', slug: 'vo',      sort_order: 1 },
      { name: 'Musique',  slug: 'musique', sort_order: 2 },
    ],
  },
  {
    name:       'Animation',
    slug:       'animation',
    sort_order: 4,
    sub_phases: [],
  },
  {
    name:       'Rendu',
    slug:       'rendu',
    sort_order: 5,
    sub_phases: [],
  },
]

// Mapping des anciens slugs vers les nouveaux
const SLUG_REMAP: Record<string, string> = {
  script: 'analyse',   // l'ancienne phase "Script" devient "Analyse"
  render: 'rendu',     // "Render" → "Rendu"
  // "design" et "animation" conservent leur slug
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parseArgs() {
  const args = process.argv.slice(2)
  return {
    dryRun:    args.includes('--dry-run'),
    projectId: args.find(a => a.startsWith('--project-id='))?.split('=')[1] ?? null,
  }
}

async function confirm(message: string): Promise<boolean> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
  return new Promise(resolve => {
    rl.question(`${message} [y/N] `, answer => {
      rl.close()
      resolve(answer.toLowerCase() === 'y')
    })
  })
}

function log(dryRun: boolean, ...args: unknown[]) {
  const prefix = dryRun ? '[DRY-RUN]' : '[EXEC]'
  console.log(prefix, ...args)
}

// ---------------------------------------------------------------------------
// Migration d'un projet
// ---------------------------------------------------------------------------

async function migrateProject(
  projectId: string,
  projectName: string,
  dryRun: boolean,
) {
  console.log(`\n  → Projet : ${projectName} (${projectId})`)

  // 1. Récupérer les phases actuelles
  const { data: existingPhases, error: phasesErr } = await supabase
    .from('project_phases')
    .select('id, name, slug, sort_order, status')
    .eq('project_id', projectId)
    .order('sort_order')

  if (phasesErr) throw new Error(`Erreur lecture phases: ${phasesErr.message}`)

  const existingBySlug = Object.fromEntries(
    (existingPhases ?? []).map(p => [p.slug, p])
  )

  for (const target of NEW_PIPELINE) {
    // Résout le slug source (peut être remappé)
    const sourceSlug = Object.entries(SLUG_REMAP).find(([, v]) => v === target.slug)?.[0] ?? target.slug
    const existing   = existingBySlug[sourceSlug] ?? existingBySlug[target.slug]

    let phaseId: string

    if (existing) {
      // Phase existante — on la renomme/reordonne si nécessaire
      if (existing.name !== target.name || existing.sort_order !== target.sort_order || existing.slug !== target.slug) {
        log(dryRun, `    UPDATE phase "${existing.name}" → "${target.name}" (sort_order: ${target.sort_order})`)
        if (!dryRun) {
          const { error } = await supabase
            .from('project_phases')
            .update({ name: target.name, slug: target.slug, sort_order: target.sort_order })
            .eq('id', existing.id)
          if (error) throw new Error(`UPDATE phase: ${error.message}`)
        }
      } else {
        log(dryRun, `    SKIP phase "${existing.name}" (déjà à jour)`)
      }
      phaseId = existing.id
    } else {
      // Phase manquante — on la crée
      log(dryRun, `    INSERT phase "${target.name}" (sort_order: ${target.sort_order})`)
      if (!dryRun) {
        const { data, error } = await supabase
          .from('project_phases')
          .insert({
            project_id: projectId,
            name:       target.name,
            slug:       target.slug,
            sort_order: target.sort_order,
            status:     'pending',
          })
          .select('id')
          .single()
        if (error) throw new Error(`INSERT phase: ${error.message}`)
        phaseId = data.id
      } else {
        phaseId = `<new-${target.slug}>`
      }
    }

    // 2. Créer les sous-phases manquantes
    if (target.sub_phases.length === 0) continue

    const { data: existingSubs, error: subsErr } = dryRun
      ? { data: [], error: null }
      : await supabase
          .from('sub_phases')
          .select('slug')
          .eq('phase_id', phaseId)

    if (subsErr) throw new Error(`Erreur lecture sub_phases: ${subsErr.message}`)

    const existingSubSlugs = new Set((existingSubs ?? []).map((s: { slug: string }) => s.slug))

    for (const sp of target.sub_phases) {
      if (existingSubSlugs.has(sp.slug)) {
        log(dryRun, `      SKIP sous-phase "${sp.name}" (existe déjà)`)
        continue
      }
      log(dryRun, `      INSERT sous-phase "${sp.name}" dans "${target.name}"`)
      if (!dryRun) {
        const { error } = await supabase
          .from('sub_phases')
          .insert({
            phase_id:   phaseId,
            name:       sp.name,
            slug:       sp.slug,
            sort_order: sp.sort_order,
            status:     'pending',
          })
        if (error) throw new Error(`INSERT sub_phase: ${error.message}`)
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const { dryRun, projectId: targetProjectId } = parseArgs()

  console.log('╔══════════════════════════════════════════════════════╗')
  console.log('║  MOSTRA — Migration vers le nouveau pipeline (S9)    ║')
  console.log('╚══════════════════════════════════════════════════════╝')
  if (dryRun) console.log('\n⚠️  MODE DRY-RUN : aucune écriture ne sera effectuée\n')

  // Récupérer les projets à migrer
  let query = supabase.from('projects').select('id, name')
  if (targetProjectId) query = query.eq('id', targetProjectId)

  const { data: projects, error: projErr } = await query
  if (projErr) { console.error('❌', projErr.message); process.exit(1) }
  if (!projects || projects.length === 0) {
    console.log('Aucun projet trouvé.')
    return
  }

  console.log(`${projects.length} projet(s) à migrer :`)
  projects.forEach((p: { id: string; name: string }) => console.log(`  • ${p.name} (${p.id})`))

  if (!dryRun) {
    const ok = await confirm('\nContinuer la migration ?')
    if (!ok) { console.log('Annulé.'); return }
  }

  let success = 0
  let failed  = 0

  for (const project of projects) {
    try {
      await migrateProject(project.id, project.name, dryRun)
      success++
    } catch (err) {
      console.error(`  ❌ Erreur sur "${project.name}":`, (err as Error).message)
      failed++
    }
  }

  console.log(`\n✅  Migration terminée : ${success} succès, ${failed} erreur(s)`)
  if (dryRun) console.log('Relancez sans --dry-run pour appliquer.')
}

main().catch(err => {
  console.error('Erreur fatale :', err)
  process.exit(1)
})
