'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  FileText,
  ChevronDown,
  Loader2,
  RotateCcw,
  CheckCircle,
  Clock,
  Send,
  AlertTriangle,
} from 'lucide-react'
import { toast } from 'sonner'
import { applyFormTemplate, resetForm } from '@/app/projects/form-actions'
import {
  startSubPhase,
  approveSubPhase,
} from '@/app/projects/sub-phase-actions'
import type { FormTemplate, FormQuestionContent, PhaseStatus } from '@/lib/types'

// ── Types ─────────────────────────────────────────────────────────

interface FormBlock {
  id: string
  content: FormQuestionContent
  sort_order: number
}

interface FormSubPhaseAdminProps {
  subPhaseId: string
  subPhaseStatus: PhaseStatus
  canStart: boolean
  blocks: FormBlock[]
  templates: FormTemplate[]
  projectId: string
  phaseId: string
}

// ── Answer display ────────────────────────────────────────────────

function AnswerDisplay({ block }: { block: FormBlock }) {
  const { content } = block
  const hasAnswer = content.answer !== null && content.answer !== ''

  return (
    <div className="space-y-1.5">
      <div className="flex items-start gap-2">
        <p className="text-xs font-medium text-[#cccccc] flex-1">
          {content.label}
          {content.required && <span className="text-red-400 ml-1">*</span>}
        </p>
        {hasAnswer && (
          <CheckCircle className="h-3.5 w-3.5 text-[#00D76B] flex-shrink-0 mt-0.5" />
        )}
      </div>
      {content.helpText && (
        <p className="text-[11px] text-[#444444]">{content.helpText}</p>
      )}
      <div
        className={`rounded-lg px-3 py-2.5 text-sm ${
          hasAnswer
            ? 'bg-[#111111] border border-[#2a2a2a] text-white'
            : 'bg-[#0d0d0d] border border-dashed border-[#2a2a2a] text-[#333333] italic'
        }`}
      >
        {hasAnswer ? (
          <span className="whitespace-pre-wrap">{content.answer}</span>
        ) : (
          'Pas de réponse'
        )}
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────

export default function FormSubPhaseAdmin({
  subPhaseId,
  subPhaseStatus,
  canStart,
  blocks,
  templates,
  projectId,
  phaseId,
}: FormSubPhaseAdminProps) {
  const router = useRouter()
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(
    templates[0]?.id ?? '',
  )
  const [applying, setApplying] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [starting, setStarting] = useState(false)
  const [approving, setApproving] = useState(false)

  const hasBlocks = blocks.length > 0
  const answeredCount = blocks.filter(
    (b) => b.content.answer !== null && b.content.answer !== '',
  ).length

  // ── Apply template ──────────────────────────────────────────────
  async function handleApply() {
    if (!selectedTemplateId) {
      toast.error('Sélectionnez un template')
      return
    }
    setApplying(true)
    const result = await applyFormTemplate(subPhaseId, selectedTemplateId)
    setApplying(false)
    if (!result.success) {
      toast.error((result as { error: string }).error)
    } else {
      toast.success('Template appliqué')
      router.refresh()
    }
  }

  // ── Reset ───────────────────────────────────────────────────────
  async function handleReset() {
    if (!confirm('Réinitialiser le formulaire ? Les réponses du client seront perdues.')) return
    setResetting(true)
    const result = await resetForm(subPhaseId)
    setResetting(false)
    if (!result.success) {
      toast.error((result as { error: string }).error)
    } else {
      toast.success('Formulaire réinitialisé')
      router.refresh()
    }
  }

  // ── Send to client ──────────────────────────────────────────────
  async function handleSendToClient() {
    setStarting(true)
    const result = await startSubPhase(subPhaseId)
    setStarting(false)
    if (!result.success) toast.error((result as { error: string }).error)
    else toast.success('Formulaire envoyé au client')
  }

  // ── Approve ─────────────────────────────────────────────────────
  async function handleApprove() {
    setApproving(true)
    const result = await approveSubPhase(subPhaseId)
    setApproving(false)
    if (!result.success) toast.error((result as { error: string }).error)
    else toast.success('Formulaire approuvé')
  }

  // ── No template applied ─────────────────────────────────────────
  if (!hasBlocks) {
    return (
      <div className="space-y-4">
        <div className="bg-[#111111] border border-[#2a2a2a] rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <FileText className="h-4 w-4 text-[#555555]" />
            <p className="text-sm font-medium text-white">Appliquer un template</p>
          </div>

          {templates.length === 0 ? (
            <div className="text-center py-6 space-y-2">
              <p className="text-sm text-[#555555]">Aucun template de formulaire disponible.</p>
              <a
                href="/settings/forms/new"
                className="text-xs text-[#00D76B] hover:underline"
              >
                Créer un template →
              </a>
            </div>
          ) : (
            <>
              <div>
                <label className="block text-xs text-[#666666] mb-1.5">Template</label>
                <div className="relative">
                  <select
                    value={selectedTemplateId}
                    onChange={(e) => setSelectedTemplateId(e.target.value)}
                    className="w-full appearance-none bg-[#0d0d0d] border border-[#2a2a2a] rounded-xl px-3 py-2.5 text-sm text-white pr-8 focus:outline-none focus:border-[#00D76B]/50 transition-colors"
                  >
                    {templates.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                        {t.is_default ? ' (par défaut)' : ''}
                        {' — '}
                        {t.questions.length} question{t.questions.length !== 1 ? 's' : ''}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#555555]" />
                </div>
              </div>

              <button
                type="button"
                onClick={handleApply}
                disabled={applying || !selectedTemplateId}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#00D76B] text-black text-sm font-semibold hover:bg-[#00D76B]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {applying ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <FileText className="h-4 w-4" />
                )}
                Appliquer ce template
              </button>
            </>
          )}
        </div>
      </div>
    )
  }

  // ── Template applied — show form state ──────────────────────────
  return (
    <div className="space-y-4">
      {/* Status bar */}
      <div className="bg-[#111111] border border-[#2a2a2a] rounded-2xl p-4 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          {subPhaseStatus === 'pending' && (
            <>
              <div className="w-2 h-2 rounded-full bg-[#555555]" />
              <span className="text-sm text-[#555555]">
                Template appliqué — pas encore envoyé au client
              </span>
            </>
          )}
          {subPhaseStatus === 'in_progress' && (
            <>
              <div className="w-2 h-2 rounded-full bg-[#F59E0B] animate-pulse" />
              <span className="text-sm text-[#F59E0B]">
                En attente de réponse — {answeredCount}/{blocks.length} questions remplies
              </span>
            </>
          )}
          {subPhaseStatus === 'in_review' && (
            <>
              <div className="w-2 h-2 rounded-full bg-[#3B82F6]" />
              <span className="text-sm text-[#3B82F6]">
                Formulaire soumis — {answeredCount}/{blocks.length} réponses
              </span>
            </>
          )}
          {(subPhaseStatus === 'completed' || subPhaseStatus === 'approved') && (
            <>
              <div className="w-2 h-2 rounded-full bg-[#00D76B]" />
              <span className="text-sm text-[#00D76B]">Formulaire approuvé</span>
            </>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Send to client — only when pending + hasBlocks + canStart */}
          {subPhaseStatus === 'pending' && canStart && (
            <button
              type="button"
              onClick={handleSendToClient}
              disabled={starting}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#00D76B]/10 border border-[#00D76B]/30 text-[#00D76B] text-xs font-medium hover:bg-[#00D76B]/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {starting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Send className="h-3.5 w-3.5" />
              )}
              Envoyer au client
            </button>
          )}

          {/* Approve — only admin, only in_review */}
          {subPhaseStatus === 'in_review' && (
            <button
              type="button"
              onClick={handleApprove}
              disabled={approving}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#22C55E]/10 border border-[#22C55E]/30 text-[#22C55E] text-xs font-medium hover:bg-[#22C55E]/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {approving ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <CheckCircle className="h-3.5 w-3.5" />
              )}
              Approuver
            </button>
          )}

          {/* Reset — only when not yet completed */}
          {subPhaseStatus !== 'completed' && subPhaseStatus !== 'approved' && (
            <button
              type="button"
              onClick={handleReset}
              disabled={resetting}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#2a2a2a] text-[#555555] text-xs hover:text-white hover:border-[#333333] transition-colors disabled:opacity-50"
            >
              {resetting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <RotateCcw className="h-3 w-3" />
              )}
              Changer de template
            </button>
          )}
        </div>
      </div>

      {/* Pending — waiting for send */}
      {subPhaseStatus === 'pending' && !canStart && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#F59E0B]/10 border border-[#F59E0B]/20">
          <AlertTriangle className="h-3.5 w-3.5 text-[#F59E0B] flex-shrink-0" />
          <p className="text-xs text-[#F59E0B]">
            La sous-phase précédente doit être terminée avant de pouvoir envoyer ce formulaire.
          </p>
        </div>
      )}

      {/* Questions */}
      <div className="bg-[#111111] border border-[#2a2a2a] rounded-2xl divide-y divide-[#1a1a1a]">
        {blocks.map((block, i) => (
          <div key={block.id} className="px-5 py-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-[10px] text-[#333333] font-mono">{i + 1}</span>
              <span className="text-[10px] text-[#333333] uppercase tracking-widest">
                {block.content.type}
              </span>
            </div>
            <AnswerDisplay block={block} />
          </div>
        ))}
      </div>

      {/* Waiting for review hint */}
      {subPhaseStatus === 'in_progress' && (
        <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-[#0d0d0d] border border-[#1e1e1e]">
          <Clock className="h-3.5 w-3.5 text-[#333333] flex-shrink-0" />
          <p className="text-xs text-[#444444]">
            Le client peut remplir et soumettre le formulaire depuis son espace.
          </p>
        </div>
      )}
    </div>
  )
}
