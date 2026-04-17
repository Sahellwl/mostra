'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { deleteFormTemplate } from '@/app/(app)/settings/forms/actions'

export default function DeleteTemplateButton({ templateId }: { templateId: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleDelete() {
    if (!confirm('Supprimer ce template ? Cette action est irréversible.')) return
    setLoading(true)
    const result = await deleteFormTemplate(templateId)
    setLoading(false)
    if (!result.success) {
      toast.error((result as { error: string }).error)
      return
    }
    toast.success('Template supprimé')
    router.push('/settings/forms')
  }

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={loading}
      className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-red-500/30 text-red-400 text-xs font-medium hover:bg-red-500/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
    >
      {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
      Supprimer
    </button>
  )
}
