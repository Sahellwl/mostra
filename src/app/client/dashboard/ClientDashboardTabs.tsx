'use client'

import { useState } from 'react'
import Link from 'next/link'
import { FolderOpen, User, LogOut } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { formatRelative } from '@/lib/utils/dates'
import StatusBadge from '@/components/shared/StatusBadge'
import ProgressBar from '@/components/shared/ProgressBar'
import type { ProjectStatus } from '@/lib/types'

interface ProjectItem {
  id: string
  name: string
  description: string | null
  status: ProjectStatus
  progress: number
  share_token: string | null
  updated_at: string
  currentPhaseName: string | null
}

interface UserProfile {
  fullName: string
  email: string
}

interface ClientDashboardTabsProps {
  projects: ProjectItem[]
  profile: UserProfile
}

type Tab = 'projects' | 'account'

export default function ClientDashboardTabs({ projects, profile }: ClientDashboardTabsProps) {
  const [tab, setTab] = useState<Tab>('projects')
  const [search, setSearch] = useState('')
  const router = useRouter()

  const filtered = projects.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()),
  )

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <div className="space-y-6">
      {/* Tab bar */}
      <div className="flex items-center gap-1 border-b border-[#1a1a1a] pb-0">
        {(
          [
            { key: 'projects', label: 'Mes projets', icon: FolderOpen },
            { key: 'account', label: 'Mon compte', icon: User },
          ] as const
        ).map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`inline-flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
              tab === key
                ? 'border-[#00D76B] text-white'
                : 'border-transparent text-[#555555] hover:text-[#a0a0a0]'
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </button>
        ))}
      </div>

      {/* ── Projets tab ── */}
      {tab === 'projects' && (
        <div className="space-y-4">
          {/* Search */}
          {projects.length > 3 && (
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher un projet…"
              className="w-full max-w-sm px-3 py-2 rounded-lg text-sm bg-[#111111] border border-[#2a2a2a] text-white placeholder-[#444444] focus:outline-none focus:border-[#444444] transition-colors"
            />
          )}

          {filtered.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {filtered.map((project) => {
                const href = project.share_token
                  ? `/client/${project.share_token}`
                  : '#'

                return (
                  <Link
                    key={project.id}
                    href={href}
                    className="
                      block bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-5
                      hover:bg-[#222222] hover:border-[#3a3a3a]
                      transition-colors group
                    "
                  >
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="min-w-0">
                        <h3 className="text-sm font-medium text-white truncate">
                          {project.name}
                        </h3>
                        {project.description && (
                          <p className="text-xs text-[#666666] mt-0.5 truncate">
                            {project.description}
                          </p>
                        )}
                      </div>
                      <StatusBadge status={project.status} className="flex-shrink-0" />
                    </div>

                    {project.currentPhaseName && (
                      <p className="text-xs text-[#a0a0a0] mb-3">
                        <span className="text-[#666666]">Phase actuelle : </span>
                        {project.currentPhaseName}
                      </p>
                    )}

                    <div className="mb-3">
                      <ProgressBar value={project.progress} showLabel size="sm" />
                    </div>

                    <p className="text-[11px] text-[#444444]">
                      Mis à jour {formatRelative(project.updated_at)}
                    </p>
                  </Link>
                )
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-12 h-12 rounded-full bg-[#1a1a1a] border border-[#2a2a2a] flex items-center justify-center mb-4">
                <FolderOpen className="h-5 w-5 text-[#444444]" />
              </div>
              <p className="text-sm text-[#666666]">
                {search ? `Aucun résultat pour "${search}"` : 'Aucun projet pour le moment'}
              </p>
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="text-xs text-[#00D76B] mt-2 hover:underline"
                >
                  Effacer la recherche
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Mon compte tab ── */}
      {tab === 'account' && (
        <div className="max-w-md space-y-6">
          {/* Profile card */}
          <div className="bg-[#111111] border border-[#2a2a2a] rounded-xl p-6 space-y-4">
            {/* Avatar placeholder */}
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-[#1a1a1a] border border-[#2a2a2a] flex items-center justify-center flex-shrink-0">
                <span className="text-lg font-semibold text-[#555555]">
                  {profile.fullName
                    .split(' ')
                    .map((n) => n[0])
                    .join('')
                    .slice(0, 2)
                    .toUpperCase()}
                </span>
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-white truncate">{profile.fullName}</p>
                <p className="text-xs text-[#666666] truncate">{profile.email}</p>
              </div>
            </div>

            <div className="h-px bg-[#1a1a1a]" />

            {/* Info fields (read-only for now) */}
            <div className="space-y-3">
              <div>
                <p className="text-[10px] text-[#444444] uppercase tracking-widest font-medium mb-1">
                  Nom complet
                </p>
                <p className="text-sm text-white">{profile.fullName}</p>
              </div>
              <div>
                <p className="text-[10px] text-[#444444] uppercase tracking-widest font-medium mb-1">
                  Email
                </p>
                <p className="text-sm text-white">{profile.email}</p>
              </div>
            </div>
          </div>

          {/* Logout */}
          <button
            type="button"
            onClick={handleLogout}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[#2a2a2a] text-sm text-[#666666] hover:text-white hover:border-[#444444] transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Se déconnecter
          </button>
        </div>
      )}
    </div>
  )
}
