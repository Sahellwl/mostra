'use client'

import { useState } from 'react'
import { Users } from 'lucide-react'
import MemberActions from './MemberActions'
import type { UserRole } from '@/lib/types'

export interface TeamMember {
  id: string // agency_members.id
  userId: string
  fullName: string
  email: string
  role: string
  invitedAt: string
  acceptedAt: string | null
}

interface Props {
  members: TeamMember[]
  currentUserId: string
  currentUserRole: UserRole
  isAdmin: boolean
}

const ROLE_LABELS: Record<string, string> = {
  super_admin: 'Super Admin',
  agency_admin: 'Admin',
  creative: 'Créatif',
  client: 'Client',
}

const ROLE_COLORS: Record<string, string> = {
  super_admin: 'text-[#00D76B] bg-[#00D76B]/10 border-[#00D76B]/20',
  agency_admin: 'text-[#F59E0B] bg-[#F59E0B]/10 border-[#F59E0B]/20',
  creative: 'text-[#3B82F6] bg-[#3B82F6]/10 border-[#3B82F6]/20',
  client: 'text-[#555555] bg-[#1a1a1a] border-[#2a2a2a]',
}

type Filter = 'all' | 'admin' | 'creative'

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'all', label: 'Tous' },
  { value: 'admin', label: 'Admins' },
  { value: 'creative', label: 'Créatifs' },
]

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export default function TeamTable({ members, currentUserId, currentUserRole, isAdmin }: Props) {
  const [filter, setFilter] = useState<Filter>('all')

  const filtered = members.filter((m) => {
    if (filter === 'admin') return m.role === 'super_admin' || m.role === 'agency_admin'
    if (filter === 'creative') return m.role === 'creative'
    return true
  })

  return (
    <div className="space-y-3">
      {/* Filter tabs */}
      <div className="flex items-center gap-1">
        {FILTERS.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => setFilter(value)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors
              ${
                filter === value
                  ? 'bg-[#00D76B]/10 text-[#00D76B] border border-[#00D76B]/20'
                  : 'text-[#666666] hover:text-white border border-transparent hover:border-[#2a2a2a]'
              }`}
          >
            {label}
            <span
              className={`ml-1.5 text-[10px] ${filter === value ? 'text-[#00D76B]/60' : 'text-[#444444]'}`}
            >
              {value === 'all'
                ? members.length
                : value === 'admin'
                  ? members.filter((m) => m.role === 'super_admin' || m.role === 'agency_admin')
                      .length
                  : members.filter((m) => m.role === 'creative').length}
            </span>
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-[#111111] border border-[#2a2a2a] rounded-xl overflow-hidden">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <Users className="h-8 w-8 text-[#2a2a2a]" />
            <p className="text-sm text-[#444444]">Aucun membre dans cette catégorie.</p>
          </div>
        ) : (
          <div className="divide-y divide-[#1a1a1a] overflow-x-auto">
            {/* Header */}
            <div className="grid grid-cols-[1fr_100px_110px_80px_140px] gap-4 px-5 py-2.5 text-[10px] text-[#444444] uppercase tracking-widest font-medium min-w-[640px]">
              <span>Membre</span>
              <span>Rôle</span>
              <span>Ajouté le</span>
              <span>Statut</span>
              <span className="text-right">Actions</span>
            </div>

            {filtered.map((m) => {
              const isSelf = m.userId === currentUserId
              const isActive = !!m.acceptedAt

              return (
                <div
                  key={m.id}
                  className="grid grid-cols-[1fr_100px_110px_80px_140px] gap-4 px-5 py-3.5 items-center hover:bg-[#161616] transition-colors min-w-[640px]"
                >
                  {/* Identity */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-[#1a1a1a] border border-[#2a2a2a] flex items-center justify-center flex-shrink-0">
                      <span className="text-[11px] font-bold text-[#555555]">
                        {m.fullName[0]?.toUpperCase() ?? '?'}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-white truncate">
                        {m.fullName}
                        {isSelf && (
                          <span className="ml-2 text-[10px] text-[#444444] font-normal">
                            (vous)
                          </span>
                        )}
                      </p>
                      <p className="text-[11px] text-[#555555] truncate">{m.email}</p>
                    </div>
                  </div>

                  {/* Role badge */}
                  <span
                    className={`
                    inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border w-fit
                    ${ROLE_COLORS[m.role] ?? ROLE_COLORS.client}
                  `}
                  >
                    {ROLE_LABELS[m.role] ?? m.role}
                  </span>

                  {/* Date */}
                  <p className="text-xs text-[#555555]">{formatDate(m.invitedAt)}</p>

                  {/* Status */}
                  <span
                    className={`
                    inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border w-fit
                    ${
                      isActive
                        ? 'text-[#22C55E] bg-[#22C55E]/10 border-[#22C55E]/20'
                        : 'text-[#F59E0B] bg-[#F59E0B]/10 border-[#F59E0B]/20'
                    }
                  `}
                  >
                    {isActive ? 'Actif' : 'En attente'}
                  </span>

                  {/* Actions */}
                  {isAdmin ? (
                    <MemberActions
                      memberId={m.id}
                      memberName={m.fullName}
                      currentRole={m.role}
                      isSelf={isSelf}
                      callerRole={currentUserRole}
                    />
                  ) : (
                    <span />
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
