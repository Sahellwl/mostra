'use client'

import { useCallback, useState } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Search, ChevronRight, ChevronLeft, ChevronRight as ChevRight } from 'lucide-react'
import { formatDate } from '@/lib/utils/dates'
import type { UserRow } from '../actions'

interface Agency {
  id: string
  name: string
}

const ROLE_OPTIONS = [
  { value: '', label: 'Tous les rôles' },
  { value: 'super_admin', label: 'Super Admin' },
  { value: 'agency_admin', label: 'Admin Agence' },
  { value: 'creative', label: 'Créatif' },
  { value: 'client', label: 'Client' },
]
const ROLE_LABELS: Record<string, string> = {
  super_admin: 'Super Admin',
  agency_admin: 'Admin',
  creative: 'Créatif',
  client: 'Client',
}
const ROLE_COLORS: Record<string, string> = {
  super_admin: '#00D76B',
  agency_admin: '#F59E0B',
  creative: '#3B82F6',
  client: '#555577',
}

const ACCENT = '#8B5CF6'

interface Props {
  users: UserRow[]
  total: number
  page: number
  perPage: number
  agencies: Agency[]
  // current filter values
  search: string
  role: string
  agencyId: string
}

export default function UsersClient({
  users,
  total,
  page,
  perPage,
  agencies,
  search,
  role,
  agencyId,
}: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const [q, setQ] = useState(search)

  const navigate = useCallback(
    (updates: Record<string, string>) => {
      const sp = new URLSearchParams(params.toString())
      for (const [k, v] of Object.entries(updates)) {
        if (v) sp.set(k, v)
        else sp.delete(k)
      }
      router.replace(`${pathname}?${sp.toString()}`)
    },
    [params, pathname, router],
  )

  function handleSearch(val: string) {
    setQ(val)
    navigate({ search: val, page: '' })
  }

  function handleRole(val: string) {
    navigate({ role: val, page: '' })
  }

  function handleAgency(val: string) {
    navigate({ agencyId: val, page: '' })
  }

  const totalPages = Math.max(1, Math.ceil(total / perPage))

  const selectClass = `
    px-3 py-2 rounded-lg text-sm bg-[#0d0d1a] border border-[#1e1e3a]
    text-white outline-none focus:border-[#8B5CF6]/50 transition-colors cursor-pointer
  `

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#444466]" />
          <input
            type="text"
            placeholder="Rechercher par nom ou email…"
            value={q}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm bg-[#0d0d1a] border border-[#1e1e3a]
              text-white placeholder:text-[#444466] outline-none focus:border-[#8B5CF6]/50 transition-colors"
          />
        </div>

        <select value={role} onChange={(e) => handleRole(e.target.value)} className={selectClass}>
          {ROLE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>

        <select
          value={agencyId}
          onChange={(e) => handleAgency(e.target.value)}
          className={selectClass}
        >
          <option value="">Toutes les agences</option>
          {agencies.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
      </div>

      {/* Count */}
      <p className="text-xs text-[#444466]">
        {total} utilisateur{total !== 1 ? 's' : ''}
        {total > perPage && ` · page ${page + 1} / ${totalPages}`}
      </p>

      {/* Table */}
      <div className="bg-[#0d0d1a] border border-[#1e1e3a] rounded-xl overflow-hidden">
        {users.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-sm text-[#444466]">Aucun utilisateur trouvé.</p>
          </div>
        ) : (
          <div className="divide-y divide-[#131325]">
            {/* Header */}
            <div
              className="grid grid-cols-[1fr_160px_120px_80px_80px] gap-4 px-5 py-2.5
              text-[10px] text-[#444466] uppercase tracking-widest font-medium"
            >
              <span>Utilisateur</span>
              <span>Agence(s)</span>
              <span>Rôle(s)</span>
              <span>Inscrit</span>
              <span className="text-right">Action</span>
            </div>

            {users.map((u) => (
              <div
                key={u.id}
                className="grid grid-cols-[1fr_160px_120px_80px_80px] gap-4 px-5 py-3.5 items-center
                  hover:bg-[#131325] transition-colors"
              >
                {/* User identity */}
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0
                      text-xs font-bold text-white"
                    style={{ backgroundColor: `${ACCENT}30`, border: `1px solid ${ACCENT}50` }}
                  >
                    {u.fullName[0]?.toUpperCase() ?? '?'}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm text-white font-medium truncate">{u.fullName}</p>
                    <p className="text-[10px] text-[#444466] truncate">{u.email}</p>
                  </div>
                  {!u.isActive && (
                    <span
                      className="text-[9px] px-1.5 py-0.5 rounded-full bg-[#EF4444]/10
                      border border-[#EF4444]/20 text-[#EF4444] flex-shrink-0"
                    >
                      Inactif
                    </span>
                  )}
                </div>

                {/* Agencies */}
                <div className="min-w-0 space-y-0.5">
                  {u.agencies.slice(0, 2).map((a) => (
                    <p key={a.id} className="text-xs text-[#6b6b9a] truncate">
                      {a.name}
                    </p>
                  ))}
                  {u.agencies.length > 2 && (
                    <p className="text-[10px] text-[#444466]">+{u.agencies.length - 2} autres</p>
                  )}
                </div>

                {/* Roles */}
                <div className="flex flex-wrap gap-1">
                  {[...new Set(u.agencies.map((a) => a.role))].slice(0, 2).map((r) => (
                    <span
                      key={r}
                      className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                      style={{
                        backgroundColor: `${ROLE_COLORS[r] ?? '#555577'}15`,
                        color: ROLE_COLORS[r] ?? '#555577',
                        border: `1px solid ${ROLE_COLORS[r] ?? '#555577'}30`,
                      }}
                    >
                      {ROLE_LABELS[r] ?? r}
                    </span>
                  ))}
                </div>

                {/* Date */}
                <span className="text-xs text-[#555577]">{formatDate(u.createdAt)}</span>

                {/* Link */}
                <div className="flex justify-end">
                  <Link
                    href={`/admin/users/${u.id}`}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px]
                      border border-[#1e1e3a] text-[#6b6b9a] hover:text-white hover:border-[#2e2e5a]
                      transition-colors"
                  >
                    Voir <ChevRight className="h-3 w-3" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <button
            disabled={page === 0}
            onClick={() => navigate({ page: String(page - 1) })}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs
              border border-[#1e1e3a] text-[#6b6b9a] hover:text-white hover:border-[#2e2e5a]
              disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="h-3.5 w-3.5" /> Précédent
          </button>
          <span className="text-xs text-[#444466]">
            Page {page + 1} / {totalPages}
          </span>
          <button
            disabled={page >= totalPages - 1}
            onClick={() => navigate({ page: String(page + 1) })}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs
              border border-[#1e1e3a] text-[#6b6b9a] hover:text-white hover:border-[#2e2e5a]
              disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            Suivant <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  )
}
