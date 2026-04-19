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
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  applyFormTemplate,
  resetForm,
  saveAdminAnswer,
  addFormQuestion,
  updateFormQuestion,
  deleteFormQuestion,
} from '@/app/projects/form-actions'
import {
  startSubPhase,
  approveSubPhase,
} from '@/app/projects/sub-phase-actions'
import type { FormTemplate, FormQuestionContent, PhaseStatus, QuestionType } from '@/lib/types'

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

const QUESTION_TYPES: { value: QuestionType; label: string }[] = [
  { value: 'text', label: 'Texte court' },
  { value: 'textarea', label: 'Texte long' },
  { value: 'number', label: 'Nombre' },
  { value: 'date', label: 'Date' },
  { value: 'select', label: 'Choix (liste)' },
  { value: 'radio', label: 'Choix unique' },
]

// ── AdminAnswerField ───────────────────────────────────────────────
// Champ éditable par l'admin pour remplir une réponse

function AdminAnswerField({
  block,
  onSave,
}: {
  block: FormBlock
  onSave: (blockId: string, answer: string) => Promise<void>
}) {
  const [value, setValue] = useState(block.content.answer ?? '')
  const [saving, setSaving] = useState(false)

  async function handleBlur() {
    const trimmed = value.trim()
    if (trimmed === (block.content.answer ?? '')) return
    setSaving(true)
    await onSave(block.id, trimmed)
    setSaving(false)
  }

  const isLong = block.content.type === 'textarea'
  const hasAnswer = value.trim() !== ''

  return (
    <div className="space-y-1.5">
      <div className="flex items-start gap-2">
        <p className="text-xs font-medium text-[#cccccc] flex-1">
          {block.content.label}
          {block.content.required && <span className="text-red-400 ml-1">*</span>}
        </p>
        {hasAnswer && !saving && (
          <CheckCircle className="h-3.5 w-3.5 text-[#00D76B] flex-shrink-0 mt-0.5" />
        )}
        {saving && <Loader2 className="h-3.5 w-3.5 text-[#555555] animate-spin flex-shrink-0 mt-0.5" />}
      </div>
      {block.content.helpText && (
        <p className="text-[11px] text-[#444444]">{block.content.helpText}</p>
      )}
      {isLong ? (
        <textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={handleBlur}
          rows={3}
          placeholder="Répondre au nom du client…"
          className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white placeholder-[#333333] focus:outline-none focus:border-[#444444] resize-none leading-relaxed transition-colors"
        />
      ) : (
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={handleBlur}
          placeholder="Répondre au nom du client…"
          className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white placeholder-[#333333] focus:outline-none focus:border-[#444444] transition-colors"
        />
      )}
    </div>
  )
}

// ── QuestionEditRow ────────────────────────────────────────────────

function QuestionEditRow({
  block,
  index,
  onDelete,
}: {
  block: FormBlock
  index: number
  onDelete: (id: string) => void
}) {
  const [label, setLabel] = useState(block.content.label)
  const [helpText, setHelpText] = useState(block.content.helpText ?? '')
  const [type, setType] = useState<QuestionType>(block.content.type)
  const [required, setRequired] = useState(block.content.required)
  const [deleting, setDeleting] = useState(false)

  async function handleFieldBlur(
    field: 'label' | 'helpText' | 'type' | 'required',
    val: string | boolean,
  ) {
    if (field === 'label' && (val as string) === block.content.label) return
    if (field === 'helpText' && (val as string) === (block.content.helpText ?? '')) return
    if (field === 'type' && (val as string) === block.content.type) return
    if (field === 'required' && (val as boolean) === block.content.required) return

    const patch: Partial<Pick<FormQuestionContent, 'label' | 'type' | 'helpText' | 'required'>> = {}
    if (field === 'label') patch.label = val as string
    if (field === 'helpText') patch.helpText = val as string
    if (field === 'type') patch.type = val as QuestionType
    if (field === 'required') patch.required = val as boolean

    await updateFormQuestion(block.id, patch)
  }

  async function handleDelete() {
    setDeleting(true)
    onDelete(block.id)
    const result = await deleteFormQuestion(block.id)
    if (!result.success) toast.error((result as { error: string }).error)
    setDeleting(false)
  }

  return (
    <div className="bg-[#0d0d0d] border border-[#1e1e1e] rounded-xl p-3 space-y-2.5">
      {/* Header: index + delete */}
      <div className="flex items-center gap-2">
        <span className="text-[10px] text-[#333333] font-mono w-4">{index + 1}</span>
        {/* Type */}
        <select
          value={type}
          onChange={(e) => {
            const newType = e.target.value as QuestionType
            setType(newType)
            handleFieldBlur('type', newType)
          }}
          className="flex-1 bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-2 py-1 text-[11px] text-[#a0a0a0] focus:outline-none focus:border-[#444444] transition-colors"
        >
          {QUESTION_TYPES.map((qt) => (
            <option key={qt.value} value={qt.value}>{qt.label}</option>
          ))}
        </select>
        {/* Required */}
        <label className="flex items-center gap-1 text-[11px] text-[#555555] cursor-pointer flex-shrink-0">
          <input
            type="checkbox"
            checked={required}
            onChange={(e) => {
              setRequired(e.target.checked)
              handleFieldBlur('required', e.target.checked)
            }}
            className="w-3 h-3 accent-[#00D76B]"
          />
          Requis
        </label>
        {/* Delete */}
        <button
          type="button"
          onClick={handleDelete}
          disabled={deleting}
          className="p-1 rounded text-[#333333] hover:text-[#EF4444] transition-colors disabled:opacity-40 flex-shrink-0"
        >
          {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
        </button>
      </div>

      {/* Label */}
      <input
        type="text"
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        onBlur={(e) => handleFieldBlur('label', e.target.value.trim())}
        placeholder="Question…"
        className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-[#333333] focus:outline-none focus:border-[#00D76B]/50 transition-colors"
      />

      {/* Help text */}
      <input
        type="text"
        value={helpText}
        onChange={(e) => setHelpText(e.target.value)}
        onBlur={(e) => handleFieldBlur('helpText', e.target.value.trim())}
        placeholder="Description optionnelle…"
        className="w-full bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg px-2.5 py-1.5 text-[11px] text-[#666666] placeholder-[#2a2a2a] focus:outline-none focus:border-[#333333] transition-colors"
      />
    </div>
  )
}

// ── AnswerDisplay (read-only) ──────────────────────────────────────

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
  blocks: initialBlocks,
  templates,
  projectId,
  phaseId,
}: FormSubPhaseAdminProps) {
  const router = useRouter()
  const [blocks, setBlocks] = useState<FormBlock[]>(initialBlocks)
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(
    templates[0]?.id ?? '',
  )
  const [applying, setApplying] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [starting, setStarting] = useState(false)
  const [approving, setApproving] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [addingQuestion, setAddingQuestion] = useState(false)
  const [newLabel, setNewLabel] = useState('')
  const [newType, setNewType] = useState<QuestionType>('text')

  const hasBlocks = blocks.length > 0
  const answeredCount = blocks.filter(
    (b) => b.content.answer !== null && b.content.answer !== '',
  ).length

  const canFillAnswers =
    subPhaseStatus === 'pending' || subPhaseStatus === 'in_progress'
  const canEditQuestions = subPhaseStatus === 'pending'

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

  // ── Admin saves an answer ───────────────────────────────────────
  async function handleSaveAnswer(blockId: string, answer: string) {
    const result = await saveAdminAnswer(blockId, answer)
    if (!result.success) toast.error((result as { error: string }).error)
    // Update local state optimistically
    setBlocks((prev) =>
      prev.map((b) =>
        b.id === blockId ? { ...b, content: { ...b.content, answer } } : b,
      ),
    )
  }

  // ── Add question ────────────────────────────────────────────────
  async function handleAddQuestion() {
    if (!newLabel.trim()) {
      toast.error('La question ne peut pas être vide')
      return
    }
    setAddingQuestion(true)
    const result = await addFormQuestion(subPhaseId, {
      label: newLabel.trim(),
      type: newType,
      helpText: '',
      required: false,
    })
    setAddingQuestion(false)
    if (!result.success) {
      toast.error((result as { error: string }).error)
    } else {
      // Add to local state
      const newBlock: FormBlock = {
        id: result.blockId!,
        content: {
          label: newLabel.trim(),
          type: newType,
          helpText: '',
          required: false,
          answer: null,
        },
        sort_order: blocks.length + 1,
      }
      setBlocks((prev) => [...prev, newBlock])
      setNewLabel('')
      setNewType('text')
      toast.success('Question ajoutée')
    }
  }

  // ── Delete question ─────────────────────────────────────────────
  function handleDeleteQuestion(blockId: string) {
    setBlocks((prev) => prev.filter((b) => b.id !== blockId))
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
          {/* Edit questions toggle — only when pending */}
          {canEditQuestions && (
            <button
              type="button"
              onClick={() => setEditMode((v) => !v)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                editMode
                  ? 'bg-[#00D76B]/10 border-[#00D76B]/30 text-[#00D76B]'
                  : 'border-[#2a2a2a] text-[#555555] hover:text-white hover:border-[#444444]'
              }`}
            >
              <Pencil className="h-3.5 w-3.5" />
              {editMode ? 'Terminer' : 'Modifier les questions'}
            </button>
          )}

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

          {/* Approve */}
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

          {/* Reset */}
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

      {/* Pending — can't send yet */}
      {subPhaseStatus === 'pending' && !canStart && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#F59E0B]/10 border border-[#F59E0B]/20">
          <AlertTriangle className="h-3.5 w-3.5 text-[#F59E0B] flex-shrink-0" />
          <p className="text-xs text-[#F59E0B]">
            La sous-phase précédente doit être terminée avant de pouvoir envoyer ce formulaire.
          </p>
        </div>
      )}

      {/* ── Edit mode: question editor ── */}
      {editMode && canEditQuestions ? (
        <div className="space-y-2">
          <p className="text-[10px] text-[#444444] uppercase tracking-widest font-medium px-1">
            Modifier les questions
          </p>

          {blocks.map((block, i) => (
            <QuestionEditRow
              key={block.id}
              block={block}
              index={i}
              onDelete={handleDeleteQuestion}
            />
          ))}

          {/* Add new question */}
          <div className="bg-[#0d0d0d] border border-dashed border-[#2a2a2a] rounded-xl p-3 space-y-2">
            <p className="text-[10px] text-[#444444] uppercase tracking-widest">Nouvelle question</p>
            <div className="flex gap-2">
              <input
                type="text"
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleAddQuestion() }}
                placeholder="Texte de la question…"
                className="flex-1 bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-[#333333] focus:outline-none focus:border-[#00D76B]/50 transition-colors"
              />
              <select
                value={newType}
                onChange={(e) => setNewType(e.target.value as QuestionType)}
                className="bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-2 py-1.5 text-[11px] text-[#a0a0a0] focus:outline-none focus:border-[#444444] transition-colors"
              >
                {QUESTION_TYPES.map((qt) => (
                  <option key={qt.value} value={qt.value}>{qt.label}</option>
                ))}
              </select>
              <button
                type="button"
                onClick={handleAddQuestion}
                disabled={addingQuestion || !newLabel.trim()}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#00D76B]/10 border border-[#00D76B]/20 text-[#00D76B] text-xs font-medium hover:bg-[#00D76B]/20 transition-colors disabled:opacity-40"
              >
                {addingQuestion ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                Ajouter
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* ── Normal mode: questions with admin fill ── */
        <div className="bg-[#111111] border border-[#2a2a2a] rounded-2xl divide-y divide-[#1a1a1a]">
          {blocks.map((block, i) => (
            <div key={block.id} className="px-5 py-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-[10px] text-[#333333] font-mono">{i + 1}</span>
                <span className="text-[10px] text-[#333333] uppercase tracking-widest">
                  {block.content.type}
                </span>
              </div>

              {/* Admin can fill answers when pending or in_progress */}
              {canFillAnswers ? (
                <AdminAnswerField block={block} onSave={handleSaveAnswer} />
              ) : (
                <AnswerDisplay block={block} />
              )}
            </div>
          ))}
        </div>
      )}

      {/* Waiting for review hint */}
      {subPhaseStatus === 'in_progress' && (
        <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-[#0d0d0d] border border-[#1e1e1e]">
          <Clock className="h-3.5 w-3.5 text-[#333333] flex-shrink-0" />
          <p className="text-xs text-[#444444]">
            Le client peut remplir et soumettre le formulaire depuis son espace.
            Les réponses ci-dessus sont éditables par l&apos;admin.
          </p>
        </div>
      )}
    </div>
  )
}
