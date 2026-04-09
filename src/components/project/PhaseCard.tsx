'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  FileText,
  Palette,
  Film,
  MonitorPlay,
  Lock,
  Eye,
  Upload,
  Send,
  Play,
  CheckCircle,
  Loader2,
  X,
  type LucideIcon,
} from 'lucide-react'
import { toast } from 'sonner'
import StatusBadge from '@/components/shared/StatusBadge'
import FileUpload from '@/components/project/FileUpload'
import FileVersionHistory from '@/components/project/FileVersionHistory'
import { formatDate } from '@/lib/utils/dates'
import { startPhase, sendToReview, completePhase } from '@/app/(dashboard)/projects/phase-actions'
import type { PhaseFile, PhaseStatus, ProjectPhase, UserRole } from '@/lib/types'

// ── Icônes par slug ───────────────────────────────────────────────

const PHASE_ICONS: Record<string, LucideIcon> = {
  script: FileText,
  design: Palette,
  animation: Film,
  render: MonitorPlay,
}

// ── Props ─────────────────────────────────────────────────────────

interface PhaseCardProps {
  phase: ProjectPhase
  projectId: string
  isLast?: boolean
  canStart: boolean
  files: PhaseFile[]
  userRole: UserRole
}

type LoadingAction = 'start' | 'review' | 'complete' | null

// ── Composant principal ───────────────────────────────────────────

export default function PhaseCard({
  phase,
  projectId,
  isLast = false,
  canStart,
  files,
  userRole,
}: PhaseCardProps) {
  const [loading, setLoading] = useState<LoadingAction>(null)
  const [uploadOpen, setUploadOpen] = useState(false)

  const isAdmin = userRole === 'super_admin' || userRole === 'agency_admin'
  const canAct =
    userRole === 'super_admin' || userRole === 'agency_admin' || userRole === 'creative'
  const isDone = phase.status === 'completed' || phase.status === 'approved'
  const isActive = phase.status === 'in_progress' || phase.status === 'in_review'
  const Icon = PHASE_ICONS[phase.slug] ?? FileText

  async function handle(action: NonNullable<LoadingAction>) {
    setLoading(action)
    let result
    if (action === 'start') result = await startPhase(phase.id)
    else if (action === 'review') result = await sendToReview(phase.id)
    else result = await completePhase(phase.id)
    setLoading(null)
    if (!result.success) toast.error(result.error)
  }

  return (
    <>
      <div className="relative flex gap-4">
        {/* Connecteur vertical */}
        {!isLast && (
          <div
            className="absolute left-[19px] top-[40px] bottom-[-12px] w-px"
            style={{ background: isDone ? '#EF4444' : '#2a2a2a' }}
          />
        )}

        {/* Icône circulaire */}
        <div
          className={`
            relative z-10 flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors
            ${
              isDone
                ? 'bg-[#EF4444]/10 border-[#EF4444]'
                : isActive
                  ? 'bg-[#1a1a1a] border-[#EF4444]'
                  : 'bg-[#111111] border-[#2a2a2a]'
            }
          `}
        >
          <Icon className={`h-4 w-4 ${isDone || isActive ? 'text-[#EF4444]' : 'text-[#444444]'}`} />
        </div>

        {/* Contenu */}
        <div
          className={`
            flex-1 mb-3 p-4 rounded-xl border transition-colors
            ${isActive ? 'bg-[#1a1a1a] border-[#3a3a3a]' : 'bg-[#111111] border-[#2a2a2a]'}
          `}
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-3 mb-3">
            <div>
              <h3 className="text-sm font-medium text-white">{phase.name}</h3>
              {phase.started_at && (
                <p className="text-xs text-[#666666] mt-0.5">
                  Démarré le {formatDate(phase.started_at)}
                </p>
              )}
              {phase.completed_at && (
                <p className="text-xs text-[#666666] mt-0.5">
                  Terminé le {formatDate(phase.completed_at)}
                </p>
              )}
            </div>
            <StatusBadge status={phase.status} className="flex-shrink-0" />
          </div>

          {/* Actions */}
          <PhaseActions
            status={phase.status}
            canStart={canStart}
            canAct={canAct}
            isAdmin={isAdmin}
            fileCount={files.length}
            loading={loading}
            viewHref={`/projects/${projectId}/phases/${phase.id}/view`}
            onStart={() => handle('start')}
            onUpload={() => setUploadOpen(true)}
            onReview={() => handle('review')}
            onComplete={() => handle('complete')}
          />

          {/* Historique des fichiers */}
          <FileVersionHistory files={files} />
        </div>
      </div>

      {/* Modal d'upload */}
      {uploadOpen && (
        <UploadModal
          phaseId={phase.id}
          projectId={projectId}
          phaseSlug={phase.slug}
          phaseName={phase.name}
          onClose={() => setUploadOpen(false)}
        />
      )}
    </>
  )
}

// ── Boutons d'action ──────────────────────────────────────────────

interface PhaseActionsProps {
  status: PhaseStatus
  canStart: boolean
  canAct: boolean
  isAdmin: boolean
  fileCount: number
  loading: LoadingAction
  viewHref: string
  onStart: () => void
  onUpload: () => void
  onReview: () => void
  onComplete: () => void
}

function PhaseActions({
  status,
  canStart,
  canAct,
  isAdmin,
  fileCount,
  loading,
  viewHref,
  onStart,
  onUpload,
  onReview,
  onComplete,
}: PhaseActionsProps) {
  const btnBase =
    'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed'
  const btnGhost = `${btnBase} border border-[#2a2a2a] text-[#a0a0a0] hover:text-white hover:border-[#444444]`
  const btnPrimary = `${btnBase} bg-[#EF4444]/10 border border-[#EF4444]/20 text-[#EF4444] hover:bg-[#EF4444]/20`
  const btnGreen = `${btnBase} bg-[#22C55E]/10 border border-[#22C55E]/20 text-[#22C55E] hover:bg-[#22C55E]/20`

  const busy = loading !== null

  // Pending ─────────────────────────────────────────────────────────
  if (status === 'pending') {
    if (!canAct || !canStart) {
      return (
        <div className="flex items-center gap-1.5 text-xs text-[#444444]">
          <Lock className="h-3.5 w-3.5" />
          <span>En attente</span>
        </div>
      )
    }
    return (
      <button type="button" className={btnPrimary} disabled={busy} onClick={onStart}>
        {loading === 'start' ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Play className="h-3.5 w-3.5" />
        )}
        Démarrer
      </button>
    )
  }

  // In Progress ──────────────────────────────────────────────────────
  if (status === 'in_progress') {
    if (!canAct) return null
    return (
      <div className="flex items-center gap-2 flex-wrap">
        {fileCount > 0 && (
          <Link href={viewHref} className={btnGhost}>
            <Eye className="h-3.5 w-3.5" />
            Voir
          </Link>
        )}
        <button type="button" className={btnGhost} disabled={busy} onClick={onUpload}>
          <Upload className="h-3.5 w-3.5" />
          Upload
        </button>
        <button
          type="button"
          className={btnPrimary}
          disabled={busy || fileCount === 0}
          title={fileCount === 0 ? 'Uploadez au moins un fichier' : undefined}
          onClick={onReview}
        >
          {loading === 'review' ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Send className="h-3.5 w-3.5" />
          )}
          Envoyer en review
        </button>
      </div>
    )
  }

  // In Review ────────────────────────────────────────────────────────
  if (status === 'in_review') {
    return (
      <div className="flex items-center gap-3 flex-wrap">
        <Link href={viewHref} className={btnGhost}>
          <Eye className="h-3.5 w-3.5" />
          Voir
        </Link>
        {isAdmin ? (
          <button type="button" className={btnGreen} disabled={busy} onClick={onComplete}>
            {loading === 'complete' ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <CheckCircle className="h-3.5 w-3.5" />
            )}
            Approuver
          </button>
        ) : (
          <span className="text-xs text-[#F59E0B]">En attente d&apos;approbation client</span>
        )}
      </div>
    )
  }

  // Completed / Approved ─────────────────────────────────────────────
  return (
    <Link href={viewHref} className={btnGhost}>
      <Eye className="h-3.5 w-3.5" />
      Voir
    </Link>
  )
}

// ── Modal d'upload ────────────────────────────────────────────────

interface UploadModalProps {
  phaseId: string
  projectId: string
  phaseSlug: string
  phaseName: string
  onClose: () => void
}

function UploadModal({ phaseId, projectId, phaseSlug, phaseName, onClose }: UploadModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      {/* Panneau */}
      <div className="relative z-10 w-full max-w-md bg-[#111111] border border-[#2a2a2a] rounded-2xl p-6 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-sm font-semibold text-white">Upload un fichier</h3>
            <p className="text-xs text-[#666666] mt-0.5">{phaseName}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-full border border-[#2a2a2a] text-[#666666] hover:text-white hover:border-[#444444] transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Zone d'upload */}
        <FileUpload
          phaseId={phaseId}
          projectId={projectId}
          phaseSlug={phaseSlug}
          onComplete={onClose}
        />
      </div>
    </div>
  )
}
