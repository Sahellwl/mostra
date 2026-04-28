'use client'

import { useState } from 'react'
import { Plus, FolderOpen } from 'lucide-react'
import Link from 'next/link'
import StatsCards from '@/components/dashboard/StatsCards'
import ProjectCard from '@/components/dashboard/ProjectCard'
import ProjectFilters, { type FilterTab } from '@/components/dashboard/ProjectFilters'
import { EmptyState } from '@/components/shared/EmptyState'
import type { ProjectSummary, UserRole } from '@/lib/types'

interface Props {
  projects: ProjectSummary[]
  stats: { total: number; active: number; completed: number }
  role: UserRole
}

export default function DashboardClient({ projects, stats, role }: Props) {
  const canCreate = role === 'super_admin' || role === 'agency_admin'
  const [activeFilter, setActiveFilter] = useState<FilterTab>('all')
  const [search, setSearch] = useState('')

  const filtered = projects.filter((p) => {
    const matchFilter = activeFilter === 'all' || p.status === activeFilter
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase())
    return matchFilter && matchSearch
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">Dashboard</h1>
          <p className="text-sm text-[#666666] mt-0.5">Gérez vos projets de production vidéo</p>
        </div>
        {canCreate && (
          <Link
            href="/projects/new"
            className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-[#00D76B] text-white hover:bg-[#00C061] transition-colors"
          >
            <Plus className="h-4 w-4" />
            Nouveau projet
          </Link>
        )}
        {canCreate && (
          <Link
            href="/projects/new"
            aria-label="Nouveau projet"
            className="sm:hidden flex items-center justify-center w-9 h-9 rounded-lg bg-[#00D76B] text-white hover:bg-[#00C061] transition-colors flex-shrink-0"
          >
            <Plus className="h-4 w-4" />
          </Link>
        )}
      </div>

      <StatsCards {...stats} />

      <ProjectFilters
        activeFilter={activeFilter}
        search={search}
        onFilterChange={setActiveFilter}
        onSearchChange={setSearch}
      />

      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={FolderOpen}
          title="Aucun projet trouvé"
          description={search ? `Aucun résultat pour "${search}"` : undefined}
          action={
            search ? (
              <button
                onClick={() => setSearch('')}
                className="text-xs text-[#00D76B] hover:text-[#00C061] transition-colors"
              >
                Effacer la recherche
              </button>
            ) : undefined
          }
        />
      )}
    </div>
  )
}
