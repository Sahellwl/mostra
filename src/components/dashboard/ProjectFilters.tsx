'use client'

import { Search } from 'lucide-react'
import type { ProjectStatus } from '@/lib/types'

export type FilterTab = 'all' | ProjectStatus

const TABS: { value: FilterTab; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'completed', label: 'Completed' },
  { value: 'on_hold', label: 'On hold' },
]

interface ProjectFiltersProps {
  activeFilter: FilterTab
  search: string
  onFilterChange: (filter: FilterTab) => void
  onSearchChange: (value: string) => void
}

export default function ProjectFilters({
  activeFilter,
  search,
  onFilterChange,
  onSearchChange,
}: ProjectFiltersProps) {
  return (
    <div className="flex items-center justify-between gap-4">
      {/* Tabs */}
      <div className="flex items-center gap-1 bg-[#111111] border border-[#2a2a2a] rounded-lg p-1">
        {TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => onFilterChange(tab.value)}
            className={`
              px-3 py-1.5 rounded-md text-sm font-medium transition-colors
              ${
                activeFilter === tab.value
                  ? 'bg-[#1a1a1a] text-white shadow-sm border border-[#2a2a2a]'
                  : 'text-[#666666] hover:text-[#a0a0a0]'
              }
            `}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#444444]" />
        <input
          type="text"
          placeholder="Rechercher un projet..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="
            pl-9 pr-4 py-2 text-sm rounded-lg w-56
            bg-[#111111] border border-[#2a2a2a]
            text-white placeholder:text-[#444444]
            outline-none focus:border-[#3a3a3a] transition-colors
          "
        />
      </div>
    </div>
  )
}
