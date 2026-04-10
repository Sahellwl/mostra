import Link from 'next/link'
import {
  Brain,
  FileText,
  Palette,
  Film,
  MonitorPlay,
  Music,
  Lock,
  Eye,
  CheckCircle2,
  type LucideIcon,
} from 'lucide-react'
import { formatDate } from '@/lib/utils/dates'
import type { ProjectPhase, SubPhase } from '@/lib/types'

// ── Icônes par slug ───────────────────────────────────────────────

const PHASE_ICONS: Record<string, LucideIcon> = {
  // Nouveau pipeline
  analyse:   Brain,
  design:    Palette,
  audio:     Music,
  animation: Film,
  rendu:     MonitorPlay,
  // Ancien pipeline (rétro-compat)
  script: FileText,
  render: MonitorPlay,
}

// ── Libellés & couleurs client ────────────────────────────────────

function clientLabel(status: ProjectPhase['status']): {
  label: string
  color: string
} {
  switch (status) {
    case 'pending':
      return { label: 'En attente', color: '#6B7280' }
    case 'in_progress':
      return { label: 'En cours de production', color: '#3B82F6' }
    case 'in_review':
      return { label: 'À valider', color: '#F59E0B' }
    case 'approved':
      return { label: 'Approuvé', color: '#22C55E' }
    case 'completed':
      return { label: 'Terminé', color: '#22C55E' }
  }
}

// ── Props ─────────────────────────────────────────────────────────

interface ClientPhaseCardProps {
  phase: ProjectPhase
  token: string
  isFirst?: boolean
  isLast?: boolean
  subPhases?: SubPhase[]
}

// ── Composant ─────────────────────────────────────────────────────

export default function ClientPhaseCard({
  phase,
  token,
  isFirst,
  isLast,
  subPhases = [],
}: ClientPhaseCardProps) {
  const Icon = PHASE_ICONS[phase.slug] ?? FileText
  const { label, color } = clientLabel(phase.status)
  const isLocked = phase.status === 'pending' || phase.status === 'in_progress'
  const canView =
    phase.status === 'in_review' || phase.status === 'approved' || phase.status === 'completed'
  const viewHref = `/client/${token}/phases/${phase.id}`

  return (
    <div className="relative">
      {/* Connecteur vertical entre phases */}
      {!isFirst && <span className="absolute -top-2 left-7 w-px h-2 bg-[#2a2a2a]" />}
      {!isLast && !subPhases.length && (
        <span className="absolute -bottom-2 left-7 w-px h-2 bg-[#2a2a2a]" />
      )}

      {/* ── Carte principale ───────────────────────────────────── */}
      <div
        className={`
          bg-[#111111] border border-[#2a2a2a] rounded-xl px-5 py-4
          flex items-center gap-4 transition-colors
          ${isLocked ? 'opacity-60' : ''}
          ${canView ? 'hover:border-[#3a3a3a]' : ''}
        `}
      >
        {/* Icône */}
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{
            backgroundColor: isLocked ? '#1a1a1a' : `${color}18`,
            border: `1px solid ${isLocked ? '#2a2a2a' : `${color}30`}`,
          }}
        >
          <Icon className="h-4 w-4" style={{ color: isLocked ? '#444444' : color }} />
        </div>

        {/* Infos */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-sm font-medium ${isLocked ? 'text-[#555555]' : 'text-white'}`}>
              {phase.name}
            </span>
            <span
              className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border"
              style={{
                color,
                backgroundColor: `${color}12`,
                borderColor: `${color}25`,
              }}
            >
              {label}
            </span>
          </div>

          <p className="text-[11px] text-[#444444] mt-0.5 flex items-center gap-1">
            {phase.status === 'in_progress' && 'Votre agence travaille actuellement sur cette phase.'}
            {phase.status === 'pending' && 'Cette phase débutera prochainement.'}
            {phase.status === 'in_review' && 'Prête pour votre validation — cliquez sur Voir.'}
            {(phase.status === 'approved' || phase.status === 'completed') && (
              <>
                <CheckCircle2 className="h-3 w-3 text-[#22C55E]" />
                {phase.completed_at
                  ? `Approuvée le ${formatDate(phase.completed_at)}`
                  : 'Phase approuvée.'}
              </>
            )}
          </p>
        </div>

        {/* Action droite */}
        <div className="flex-shrink-0 flex items-center">
          {isLocked ? (
            <Lock className="h-4 w-4 text-[#333333]" />
          ) : canView ? (
            phase.status === 'in_review' ? (
              <Link
                href={viewHref}
                className="
                  inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
                  bg-[#00D76B]/10 border border-[#00D76B]/20 text-[#00D76B]
                  hover:bg-[#00D76B]/20 transition-colors
                "
              >
                <Eye className="h-3.5 w-3.5" />
                Voir
              </Link>
            ) : (
              <Link
                href={viewHref}
                className="
                  inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
                  bg-[#1a1a1a] border border-[#2a2a2a] text-[#666666]
                  hover:text-white hover:border-[#444444] transition-colors
                "
              >
                <CheckCircle2 className="h-3.5 w-3.5 text-[#22C55E]" />
                Voir
              </Link>
            )
          ) : null}
        </div>
      </div>

      {/* ── Sous-phases visibles (in_review / completed) ────────── */}
      {subPhases.length > 0 && (
        <div className="ml-[52px] mt-1.5 space-y-1">
          {subPhases.map((sp) => (
            <div
              key={sp.id}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#0d0d0d] border border-[#1e1e1e]"
            >
              <span
                className="flex-shrink-0 w-1.5 h-1.5 rounded-full"
                style={{
                  backgroundColor:
                    sp.status === 'completed' || sp.status === 'approved'
                      ? '#22C55E'
                      : '#F59E0B',
                }}
              />
              <span className="text-[11px] text-[#666666] flex-1 truncate">{sp.name}</span>
              <span
                className="text-[10px] font-medium flex-shrink-0"
                style={{
                  color:
                    sp.status === 'completed' || sp.status === 'approved'
                      ? '#22C55E'
                      : '#F59E0B',
                }}
              >
                {sp.status === 'in_review' ? 'À valider' : 'Terminé'}
              </span>
            </div>
          ))}
          {/* Connecteur vertical vers la phase suivante */}
          {!isLast && <span className="block ml-[3px] w-px h-2 bg-[#2a2a2a]" />}
        </div>
      )}
    </div>
  )
}
