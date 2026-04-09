'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Search, ChevronRight, Users, FolderOpen } from 'lucide-react'
import { formatDate } from '@/lib/utils/dates'
import type { AgencyWithStats } from '../actions'

const ACCENT = '#8B5CF6'

export default function AgencySearch({ agencies }: { agencies: AgencyWithStats[] }) {
  const [query, setQuery] = useState('')

  const filtered = agencies.filter(
    (a) =>
      a.name.toLowerCase().includes(query.toLowerCase()) ||
      a.slug.toLowerCase().includes(query.toLowerCase()),
  )

  return (
    <div className="space-y-4">
      {/* Search bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#444466]" />
        <input
          type="text"
          placeholder="Rechercher par nom ou slug…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm
            bg-[#0d0d1a] border border-[#1e1e3a] text-white placeholder:text-[#444466]
            outline-none focus:border-[#8B5CF6]/50 focus:ring-1 focus:ring-[#8B5CF6]/20 transition-colors"
        />
      </div>

      {/* Table */}
      <div className="bg-[#0d0d1a] border border-[#1e1e3a] rounded-xl overflow-hidden">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <p className="text-sm text-[#444466]">
              {query ? `Aucune agence ne correspond à "${query}".` : 'Aucune agence.'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[#131325]">
            {/* Header */}
            <div className="grid grid-cols-[1fr_80px_90px_110px_80px] gap-4 px-5 py-2.5 text-[10px] text-[#444466] uppercase tracking-widest font-medium">
              <span>Agence</span>
              <span className="flex items-center gap-1">
                <Users className="h-3 w-3" /> Membres
              </span>
              <span className="flex items-center gap-1">
                <FolderOpen className="h-3 w-3" /> Projets actifs
              </span>
              <span>Créée le</span>
              <span className="text-right">Actions</span>
            </div>

            {filtered.map((a) => (
              <div
                key={a.id}
                className="grid grid-cols-[1fr_80px_90px_110px_80px] gap-4 px-5 py-3.5 items-center hover:bg-[#131325] transition-colors"
              >
                {/* Identity */}
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-xs font-bold text-white"
                    style={{
                      backgroundColor: a.primary_color + '30',
                      border: `1px solid ${a.primary_color}50`,
                    }}
                  >
                    {a.name[0]?.toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-white truncate">{a.name}</p>
                    <p className="text-[10px] text-[#444466] font-mono">{a.slug}</p>
                  </div>
                </div>

                {/* Members */}
                <span className="text-sm text-[#a0a0cc] tabular-nums">{a.memberCount}</span>

                {/* Active projects */}
                <span className="text-sm text-[#a0a0cc] tabular-nums">{a.activeProjects}</span>

                {/* Date */}
                <span className="text-xs text-[#555577]">{formatDate(a.created_at)}</span>

                {/* Actions */}
                <div className="flex justify-end">
                  <Link
                    href={`/admin/agencies/${a.id}`}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px]
                      border border-[#1e1e3a] text-[#6b6b9a] hover:text-white hover:border-[#2e2e5a]
                      transition-colors"
                  >
                    Voir <ChevronRight className="h-3 w-3" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
