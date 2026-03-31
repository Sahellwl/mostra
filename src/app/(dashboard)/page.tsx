'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import Link from 'next/link'
import StatsCards from '@/components/dashboard/StatsCards'
import ProjectCard from '@/components/dashboard/ProjectCard'
import ProjectFilters, { type FilterTab } from '@/components/dashboard/ProjectFilters'
import type { ProjectSummary } from '@/lib/types'

// ---- Données mockées ----
const MOCK_PROJECTS: ProjectSummary[] = [
  {
    id: 'cccccccc-0000-0000-0000-000000000001',
    name: 'TechVision Brand Film 2024',
    status: 'active',
    progress: 75,
    current_phase: {
      id: 'dddddddd-1111-0000-0000-000000000004',
      project_id: 'cccccccc-0000-0000-0000-000000000001',
      phase_template_id: null,
      name: 'Render',
      slug: 'render',
      sort_order: 4,
      status: 'in_review',
      started_at: new Date(Date.now() - 2 * 86400000).toISOString(),
      completed_at: null,
      created_at: new Date(Date.now() - 30 * 86400000).toISOString(),
      updated_at: new Date(Date.now() - 1 * 86400000).toISOString(),
    },
    client: { id: 'aaaaaaaa-0000-0000-0000-000000000005', full_name: 'Alex Chen', avatar_url: null },
    updated_at: new Date(Date.now() - 1 * 86400000).toISOString(),
  },
  {
    id: 'cccccccc-0000-0000-0000-000000000002',
    name: 'Luxe Cosmetics Product Launch',
    status: 'active',
    progress: 50,
    current_phase: {
      id: 'dddddddd-2222-0000-0000-000000000003',
      project_id: 'cccccccc-0000-0000-0000-000000000002',
      phase_template_id: null,
      name: 'Animation',
      slug: 'animation',
      sort_order: 3,
      status: 'in_progress',
      started_at: new Date(Date.now() - 5 * 86400000).toISOString(),
      completed_at: null,
      created_at: new Date(Date.now() - 25 * 86400000).toISOString(),
      updated_at: new Date(Date.now() - 3 * 86400000).toISOString(),
    },
    client: null,
    updated_at: new Date(Date.now() - 3 * 86400000).toISOString(),
  },
  {
    id: 'cccccccc-0000-0000-0000-000000000003',
    name: 'EcoGreen Sustainability Campaign',
    status: 'active',
    progress: 25,
    current_phase: {
      id: 'dddddddd-3333-0000-0000-000000000001',
      project_id: 'cccccccc-0000-0000-0000-000000000003',
      phase_template_id: null,
      name: 'Script',
      slug: 'script',
      sort_order: 1,
      status: 'in_review',
      started_at: new Date(Date.now() - 5 * 86400000).toISOString(),
      completed_at: null,
      created_at: new Date(Date.now() - 5 * 86400000).toISOString(),
      updated_at: new Date(Date.now() - 1 * 86400000).toISOString(),
    },
    client: null,
    updated_at: new Date(Date.now() - 1 * 86400000).toISOString(),
  },
  {
    id: 'cccccccc-0000-0000-0000-000000000004',
    name: 'Horizon Music Video',
    status: 'completed',
    progress: 100,
    current_phase: null,
    client: { id: 'aaaaaaaa-0000-0000-0000-000000000010', full_name: 'Marie Dupont', avatar_url: null },
    updated_at: new Date(Date.now() - 10 * 86400000).toISOString(),
  },
  {
    id: 'cccccccc-0000-0000-0000-000000000005',
    name: 'SportMax Summer Campaign',
    status: 'on_hold',
    progress: 30,
    current_phase: {
      id: 'dddddddd-5555-0000-0000-000000000002',
      project_id: 'cccccccc-0000-0000-0000-000000000005',
      phase_template_id: null,
      name: 'Design',
      slug: 'design',
      sort_order: 2,
      status: 'pending',
      started_at: null,
      completed_at: null,
      created_at: new Date(Date.now() - 15 * 86400000).toISOString(),
      updated_at: new Date(Date.now() - 15 * 86400000).toISOString(),
    },
    client: null,
    updated_at: new Date(Date.now() - 15 * 86400000).toISOString(),
  },
]

const STATS = {
  total:     MOCK_PROJECTS.length,
  active:    MOCK_PROJECTS.filter((p) => p.status === 'active').length,
  completed: MOCK_PROJECTS.filter((p) => p.status === 'completed').length,
}

export default function DashboardPage() {
  const [activeFilter, setActiveFilter] = useState<FilterTab>('all')
  const [search, setSearch] = useState('')

  const filtered = MOCK_PROJECTS.filter((p) => {
    const matchFilter = activeFilter === 'all' || p.status === activeFilter
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase())
    return matchFilter && matchSearch
  })

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">Dashboard</h1>
          <p className="text-sm text-[#666666] mt-0.5">
            Manage your video production projects
          </p>
        </div>
        <Link
          href="/projects/new"
          className="
            flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium
            bg-[#EF4444] text-white hover:bg-[#DC2626] transition-colors
          "
        >
          <Plus className="h-4 w-4" />
          New Project
        </Link>
      </div>

      {/* Stats */}
      <StatsCards {...STATS} />

      {/* Filters */}
      <ProjectFilters
        activeFilter={activeFilter}
        search={search}
        onFilterChange={setActiveFilter}
        onSearchChange={setSearch}
      />

      {/* Projects grid */}
      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-12 h-12 rounded-full bg-[#1a1a1a] border border-[#2a2a2a] flex items-center justify-center mb-4">
            <span className="text-[#444444] text-xl">○</span>
          </div>
          <p className="text-sm text-[#666666]">Aucun projet trouvé</p>
          {search && (
            <button
              onClick={() => setSearch('')}
              className="mt-2 text-xs text-[#EF4444] hover:text-[#DC2626] transition-colors"
            >
              Effacer la recherche
            </button>
          )}
        </div>
      )}
    </div>
  )
}
