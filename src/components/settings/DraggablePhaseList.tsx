'use client'

import { useState, useTransition, useCallback } from 'react'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, Plus, Trash2, Loader2, RotateCcw, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
import IconPicker from './IconPicker'
import { updatePhaseTemplates, resetToDefaults } from '@/app/(dashboard)/settings/pipeline-actions'
import type {
  PipelinePhaseInput,
  PipelinePhaseRow,
} from '@/app/(dashboard)/settings/pipeline-actions'
import type { PhaseTemplate } from '@/lib/types'

// ── Helpers ──────────────────────────────────────────────────────

let _newCounter = 0
function tempId() {
  return `__new_${++_newCounter}`
}

function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // remove accents
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40) || 'phase'
  )
}

function dedupeSlug(slug: string, existingSlugs: string[]): string {
  if (!existingSlugs.includes(slug)) return slug
  let i = 2
  while (existingSlugs.includes(`${slug}-${i}`)) i++
  return `${slug}-${i}`
}

// ── Row type ─────────────────────────────────────────────────────

interface PhaseRow {
  _key: string // local DnD key (stable; tempId or real id)
  id: string | null
  name: string
  slug: string
  icon: string
  sort_order: number
  isNew: boolean
}

function toRow(tpl: PhaseTemplate): PhaseRow {
  return {
    _key: tpl.id,
    id: tpl.id,
    name: tpl.name,
    slug: tpl.slug,
    icon: tpl.icon ?? 'FileText',
    sort_order: tpl.sort_order,
    isNew: false,
  }
}

// ── Sortable row item ────────────────────────────────────────────

interface RowItemProps {
  row: PhaseRow
  index: number
  total: number
  disabled: boolean
  onUpdate: (key: string, patch: Partial<PhaseRow>) => void
  onRemove: (key: string) => void
}

function SortableRow({ row, index, total, disabled, onUpdate, onRemove }: RowItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: row._key,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : undefined,
  }

  function handleNameChange(val: string) {
    const newSlug = slugify(val)
    onUpdate(row._key, { name: val, slug: newSlug })
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`
        flex items-center gap-3 px-4 py-3 rounded-xl border transition-colors
        ${
          isDragging
            ? 'bg-[#1a1a1a] border-[#00D76B]/30 shadow-2xl shadow-black/50'
            : 'bg-[#111111] border-[#2a2a2a] hover:border-[#333333]'
        }
      `}
    >
      {/* Drag handle */}
      <button
        type="button"
        className="cursor-grab active:cursor-grabbing text-[#333333] hover:text-[#555555] transition-colors flex-shrink-0 touch-none"
        disabled={disabled}
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </button>

      {/* Sort order pill */}
      <span className="text-[10px] text-[#444444] tabular-nums w-4 text-center flex-shrink-0">
        {index + 1}
      </span>

      {/* Icon picker */}
      <IconPicker
        value={row.icon}
        onChange={(icon) => onUpdate(row._key, { icon })}
        disabled={disabled}
      />

      {/* Name */}
      <input
        type="text"
        value={row.name}
        onChange={(e) => handleNameChange(e.target.value)}
        disabled={disabled}
        placeholder="Nom de la phase"
        className="
          flex-1 px-3 py-1.5 rounded-lg text-sm
          bg-[#0a0a0a] border border-[#2a2a2a] text-white placeholder:text-[#333333]
          outline-none transition-colors
          focus:border-[#00D76B] focus:ring-1 focus:ring-[#00D76B]/30
          disabled:opacity-50
        "
      />

      {/* Slug (read-only) */}
      <span className="text-[11px] text-[#444444] font-mono min-w-[80px] max-w-[100px] truncate hidden sm:block">
        {row.slug || '…'}
      </span>

      {/* Delete */}
      <button
        type="button"
        onClick={() => onRemove(row._key)}
        disabled={disabled || total <= 1}
        className="
          flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center
          text-[#333333] hover:text-[#EF4444] hover:border-[#EF4444]/30
          border border-transparent hover:border hover:bg-[#EF4444]/10
          transition-colors disabled:opacity-30 disabled:cursor-not-allowed
        "
        title="Supprimer la phase"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}

// ── Main component ───────────────────────────────────────────────

interface Props {
  initialTemplates: PhaseTemplate[]
}

export default function DraggablePhaseList({ initialTemplates }: Props) {
  const [rows, setRows] = useState<PhaseRow[]>(() => initialTemplates.map(toRow))
  const [isPending, startTransition] = useTransition()
  const [isDirty, setIsDirty] = useState(false)
  const [showResetConfirm, setShowResetConfirm] = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  // ── Mutations ────────────────────────────────────────────────

  const updateRow = useCallback((key: string, patch: Partial<PhaseRow>) => {
    setRows((prev) => prev.map((r) => (r._key === key ? { ...r, ...patch } : r)))
    setIsDirty(true)
  }, [])

  const removeRow = useCallback((key: string) => {
    setRows((prev) => {
      if (prev.length <= 1) return prev
      return prev.filter((r) => r._key !== key)
    })
    setIsDirty(true)
  }, [])

  function addRow() {
    const key = tempId()
    const existingSlugs = rows.map((r) => r.slug)
    const slug = dedupeSlug('phase', existingSlugs)
    setRows((prev) => [
      ...prev,
      {
        _key: key,
        id: null,
        name: '',
        slug,
        icon: 'FileText',
        sort_order: prev.length + 1,
        isNew: true,
      },
    ])
    setIsDirty(true)
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return

    setRows((prev) => {
      const oldIdx = prev.findIndex((r) => r._key === active.id)
      const newIdx = prev.findIndex((r) => r._key === over.id)
      return arrayMove(prev, oldIdx, newIdx).map((r, i) => ({ ...r, sort_order: i + 1 }))
    })
    setIsDirty(true)
  }

  // ── Validate name + ensure unique slugs before save ──────────

  function buildPayload(): PipelinePhaseInput[] | null {
    const usedSlugs: string[] = []
    const result: PipelinePhaseInput[] = []

    for (const r of rows) {
      const name = r.name.trim()
      if (!name) {
        toast.error('Toutes les phases doivent avoir un nom.')
        return null
      }
      // Utilise le slug stocké dans le state (synchronisé avec le nom via handleNameChange).
      // On ne régénère PAS depuis slugify(name) ici — ça casserait les phases existantes
      // si slugify produit un résultat différent du slug stocké en DB.
      let slug = r.slug.trim() || slugify(name)
      if (usedSlugs.includes(slug)) {
        slug = dedupeSlug(slug, usedSlugs)
      }
      usedSlugs.push(slug)
      result.push({ id: r.id, name, slug, icon: r.icon, sort_order: r.sort_order })
    }
    return result
  }

  // ── Save ─────────────────────────────────────────────────────

  function handleSave() {
    const payload = buildPayload()
    if (!payload) return

    startTransition(async () => {
      const result = await updatePhaseTemplates(payload)
      if (result.success) {
        toast.success('Pipeline sauvegardé')
        setIsDirty(false)
      } else {
        toast.error(result.error)
      }
    })
  }

  // ── Reset to defaults ─────────────────────────────────────────

  function handleReset() {
    if (!showResetConfirm) {
      setShowResetConfirm(true)
      return
    }
    setShowResetConfirm(false)

    startTransition(async () => {
      const result = await resetToDefaults()
      if (result.success) {
        // Mettre à jour le state local immédiatement avec les phases retournées
        if (result.phases.length > 0) {
          setRows(
            result.phases.map((p: PipelinePhaseRow) => ({
              _key: p.id,
              id: p.id,
              name: p.name,
              slug: p.slug,
              icon: p.icon || 'FileText',
              sort_order: p.sort_order,
              isNew: false,
            })),
          )
        }
        setIsDirty(false)
        toast.success('Pipeline réinitialisé aux valeurs par défaut')
      } else {
        toast.error(result.error)
      }
    })
  }

  // ── Render ───────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* Header bar */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-white">Pipeline de phases</h2>
          <p className="text-xs text-[#555555] mt-0.5">
            {rows.length} phase{rows.length !== 1 ? 's' : ''} active{rows.length !== 1 ? 's' : ''}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Reset to defaults */}
          {showResetConfirm ? (
            <div className="flex items-center gap-1">
              <span className="text-xs text-[#a0a0a0] mr-1">Confirmer ?</span>
              <button
                type="button"
                onClick={() => setShowResetConfirm(false)}
                className="px-2.5 py-1.5 rounded-lg text-xs border border-[#2a2a2a] text-[#666666] hover:text-white transition-colors"
              >
                Non
              </button>
              <button
                type="button"
                onClick={handleReset}
                disabled={isPending}
                className="px-2.5 py-1.5 rounded-lg text-xs border border-[#EF4444]/30 bg-[#EF4444]/10 text-[#EF4444] hover:bg-[#EF4444]/20 transition-colors disabled:opacity-50"
              >
                Oui
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleReset}
              disabled={isPending}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs
                border border-[#2a2a2a] text-[#555555] hover:text-white hover:border-[#444444]
                transition-colors disabled:opacity-40"
              title="Restaurer Script / Design / Animation / Render"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Défaut
            </button>
          )}

          {/* Save */}
          <button
            type="button"
            onClick={handleSave}
            disabled={isPending || !isDirty}
            className="
              inline-flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-medium
              bg-[#00D76B] text-white hover:bg-[#00C061] active:bg-[#009E50]
              transition-colors disabled:opacity-50 disabled:cursor-not-allowed
            "
          >
            {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Sauvegarder
          </button>
        </div>
      </div>

      {/* Warning banner */}
      <div className="flex items-start gap-2.5 px-4 py-3 rounded-xl bg-[#F59E0B]/5 border border-[#F59E0B]/20">
        <AlertTriangle className="h-4 w-4 text-[#F59E0B] flex-shrink-0 mt-0.5" />
        <p className="text-xs text-[#a0a0a0]">
          Les modifications s&apos;appliqueront uniquement aux{' '}
          <span className="text-white font-medium">nouveaux projets</span>. Les projets en cours
          conservent leurs phases actuelles.
        </p>
      </div>

      {/* Legend row */}
      <div className="grid grid-cols-[24px_20px_36px_1fr_100px_28px] gap-3 px-4 text-[10px] text-[#444444] uppercase tracking-widest font-medium">
        <span />
        <span>#</span>
        <span>Icône</span>
        <span>Nom</span>
        <span className="hidden sm:block">Slug</span>
        <span />
      </div>

      {/* Draggable list */}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={rows.map((r) => r._key)} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {rows.map((row, index) => (
              <SortableRow
                key={row._key}
                row={row}
                index={index}
                total={rows.length}
                disabled={isPending}
                onUpdate={updateRow}
                onRemove={removeRow}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {/* Add phase */}
      <button
        type="button"
        onClick={addRow}
        disabled={isPending}
        className="
          w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm
          border border-dashed border-[#2a2a2a] text-[#555555]
          hover:border-[#00D76B]/30 hover:text-[#00D76B] hover:bg-[#00D76B]/5
          transition-colors disabled:opacity-40
        "
      >
        <Plus className="h-4 w-4" />
        Ajouter une phase
      </button>

      {/* Bottom save (sticky UX helper) */}
      {isDirty && (
        <div className="sticky bottom-4 flex justify-end pt-2">
          <div className="flex items-center gap-3 bg-[#111111] border border-[#2a2a2a] rounded-xl px-4 py-3 shadow-2xl shadow-black/60">
            <span className="text-xs text-[#666666]">Modifications non sauvegardées</span>
            <button
              type="button"
              onClick={handleSave}
              disabled={isPending}
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-medium
                bg-[#00D76B] text-white hover:bg-[#00C061] transition-colors
                disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Sauvegarder
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
