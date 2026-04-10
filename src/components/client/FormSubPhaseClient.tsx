'use client'

import { useEffect, useRef, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { CheckCircle, Loader2, Lock } from 'lucide-react'
import { toast } from 'sonner'
import { saveDraftAnswer, submitFormAnswers } from '@/app/(dashboard)/projects/form-actions'
import type { FormQuestionContent } from '@/lib/types'

// ── Types ─────────────────────────────────────────────────────────

interface FormBlock {
  id: string
  content: FormQuestionContent
  sort_order: number
}

interface FormSubPhaseClientProps {
  token: string
  subPhaseId: string
  status: 'in_progress' | 'in_review' | 'completed' | 'approved'
  blocks: FormBlock[]
}

// ── Dynamic Zod schema from questions ────────────────────────────

function buildSchema(blocks: FormBlock[]) {
  const shape: Record<string, z.ZodTypeAny> = {}
  for (const block of blocks) {
    const { required, type } = block.content
    let field: z.ZodTypeAny

    if (type === 'number') {
      field = z.string()
      if (required) {
        field = (field as z.ZodString).min(1, 'Ce champ est requis')
      }
    } else if (type === 'date') {
      field = z.string()
      if (required) {
        field = (field as z.ZodString).min(1, 'Ce champ est requis')
      }
    } else {
      field = z.string()
      if (required) {
        field = (field as z.ZodString).min(1, 'Ce champ est requis')
      }
    }

    shape[block.id] = field
  }
  return z.object(shape)
}

// ── Field renderer ─────────────────────────────────────────────

function FormField({
  block,
  value,
  onChange,
  onBlur,
  error,
  readOnly,
}: {
  block: FormBlock
  value: string
  onChange: (v: string) => void
  onBlur: () => void
  error?: string
  readOnly: boolean
}) {
  const { content } = block
  const inputBase =
    'w-full bg-[#0d0d0d] border rounded-xl px-3 py-2.5 text-sm text-white placeholder-[#333333] focus:outline-none transition-colors ' +
    (error
      ? 'border-red-500/50 focus:border-red-500'
      : 'border-[#2a2a2a] focus:border-[#00D76B]/50')
  const readOnlyBase =
    'w-full bg-[#111111] border border-[#1e1e1e] rounded-xl px-3 py-2.5 text-sm text-[#aaaaaa] cursor-default'

  if (readOnly) {
    const hasAnswer = value !== '' && value !== null
    return (
      <div className={`${readOnlyBase} min-h-[42px] whitespace-pre-wrap`}>
        {hasAnswer ? (
          value
        ) : (
          <span className="text-[#333333] italic">Pas de réponse</span>
        )}
      </div>
    )
  }

  if (content.type === 'textarea') {
    return (
      <textarea
        rows={4}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        placeholder={content.placeholder ?? ''}
        className={`${inputBase} resize-none`}
      />
    )
  }

  if (content.type === 'select') {
    return (
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        className={`${inputBase} appearance-none`}
      >
        <option value="">{content.placeholder ?? 'Choisir une option…'}</option>
        {(content.options ?? []).map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    )
  }

  if (content.type === 'radio') {
    return (
      <div className="space-y-2">
        {(content.options ?? []).map((opt) => (
          <label
            key={opt}
            className="flex items-center gap-3 cursor-pointer group"
            onClick={() => { onChange(opt); onBlur() }}
          >
            <div
              className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                value === opt
                  ? 'border-[#00D76B] bg-[#00D76B]'
                  : 'border-[#2a2a2a] group-hover:border-[#555555]'
              }`}
            >
              {value === opt && <div className="w-1.5 h-1.5 rounded-full bg-black" />}
            </div>
            <span className="text-sm text-[#cccccc]">{opt}</span>
          </label>
        ))}
      </div>
    )
  }

  if (content.type === 'number') {
    return (
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        placeholder={content.placeholder ?? ''}
        className={inputBase}
      />
    )
  }

  if (content.type === 'date') {
    return (
      <input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        className={inputBase}
      />
    )
  }

  // text (default)
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onBlur={onBlur}
      placeholder={content.placeholder ?? ''}
      className={inputBase}
    />
  )
}

// ── Main component ─────────────────────────────────────────────

export default function FormSubPhaseClient({
  token,
  subPhaseId,
  status,
  blocks,
}: FormSubPhaseClientProps) {
  const isReadOnly = status !== 'in_progress'
  const schema = buildSchema(blocks)
  type FormValues = z.infer<typeof schema>

  // Initial values from existing answers
  const defaultValues = Object.fromEntries(
    blocks.map((b) => [b.id, b.content.answer ?? '']),
  ) as FormValues

  const {
    watch,
    setValue,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues,
  })

  const values = watch()

  // Auto-save on blur: save a single field to the server
  const savingRef = useRef<Record<string, boolean>>({})

  const handleBlur = useCallback(
    async (blockId: string) => {
      if (isReadOnly || savingRef.current[blockId]) return
      const answer = (values[blockId] as string) ?? ''
      savingRef.current[blockId] = true
      await saveDraftAnswer(token, blockId, answer)
      savingRef.current[blockId] = false
    },
    [token, values, isReadOnly],
  )

  // Submit
  async function onSubmit(data: FormValues) {
    if (!confirm('Êtes-vous sûr ? Vous ne pourrez plus modifier vos réponses après envoi.')) return

    const answers: Record<string, string> = {}
    for (const [key, val] of Object.entries(data)) {
      answers[key] = String(val ?? '')
    }

    const result = await submitFormAnswers(token, subPhaseId, answers)
    if (!result.success) {
      toast.error((result as { error: string }).error)
    } else {
      toast.success('Formulaire envoyé avec succès !')
    }
  }

  if (blocks.length === 0) {
    return (
      <div className="text-center py-12 space-y-2">
        <p className="text-sm text-[#555555]">Aucune question dans ce formulaire.</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Read-only notice */}
      {isReadOnly && (
        <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-[#111111] border border-[#2a2a2a]">
          {status === 'in_review' ? (
            <>
              <div className="w-2 h-2 rounded-full bg-[#3B82F6] flex-shrink-0" />
              <p className="text-sm text-[#3B82F6]">
                Vos réponses sont en attente de validation par l&apos;équipe.
              </p>
            </>
          ) : (
            <>
              <CheckCircle className="h-4 w-4 text-[#00D76B] flex-shrink-0" />
              <p className="text-sm text-[#00D76B]">Formulaire validé par l&apos;équipe.</p>
            </>
          )}
        </div>
      )}

      {/* Questions */}
      <div className="space-y-5">
        {blocks.map((block, i) => {
          const { content } = block
          const fieldError = errors[block.id]?.message as string | undefined

          return (
            <div key={block.id} className="bg-[#111111] border border-[#2a2a2a] rounded-2xl p-5 space-y-3">
              <div className="space-y-0.5">
                <label className="block text-sm font-medium text-white">
                  <span className="text-[#444444] text-xs mr-2 font-normal">{i + 1}.</span>
                  {content.label}
                  {content.required && <span className="text-red-400 ml-1">*</span>}
                </label>
                {content.helpText && (
                  <p className="text-xs text-[#555555] ml-5">{content.helpText}</p>
                )}
              </div>

              <FormField
                block={block}
                value={(values[block.id] as string) ?? ''}
                onChange={(v) => setValue(block.id as keyof FormValues, v as FormValues[keyof FormValues])}
                onBlur={() => handleBlur(block.id)}
                error={fieldError}
                readOnly={isReadOnly}
              />

              {fieldError && (
                <p className="text-xs text-red-400 mt-1">{fieldError}</p>
              )}
            </div>
          )
        })}
      </div>

      {/* Submit */}
      {!isReadOnly && (
        <div className="flex items-center justify-between gap-4 pt-2">
          <p className="text-xs text-[#444444]">
            Les réponses sont sauvegardées automatiquement.
          </p>
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#00D76B] text-black text-sm font-semibold hover:bg-[#00D76B]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle className="h-4 w-4" />
            )}
            Valider et envoyer
          </button>
        </div>
      )}

      {isReadOnly && (
        <div className="flex items-center gap-2 text-xs text-[#333333]">
          <Lock className="h-3.5 w-3.5" />
          Formulaire verrouillé — soumis le {new Date().toLocaleDateString('fr-FR')}
        </div>
      )}
    </form>
  )
}
