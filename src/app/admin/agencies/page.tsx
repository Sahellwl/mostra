import type { Metadata } from 'next'
import Link from 'next/link'
import { Building2, Plus, Users, FolderOpen, ChevronRight } from 'lucide-react'
import { getAgenciesWithStats } from '../actions'
import { formatDate } from '@/lib/utils/dates'
import AgencySearch from './AgencySearch'

export const metadata: Metadata = {
  title: 'Agences — MOSTRA Admin',
  description: 'Gérez les agences enregistrées sur la plateforme.',
}

const ACCENT = '#8B5CF6'

export default async function AgenciesPage() {
  const agencies = await getAgenciesWithStats()

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white">Agences</h1>
          <p className="text-sm text-[#555577] mt-0.5">
            {agencies.length} agence{agencies.length !== 1 ? 's' : ''} enregistrée
            {agencies.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Link
          href="/admin/agencies/new"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors flex-shrink-0"
          style={{ backgroundColor: `${ACCENT}15`, border: `1px solid ${ACCENT}30`, color: ACCENT }}
        >
          <Plus className="h-4 w-4" />
          Nouvelle agence
        </Link>
      </div>

      {/* Recherche côté client */}
      <AgencySearch agencies={agencies} />
    </div>
  )
}
