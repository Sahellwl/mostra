import type { Metadata } from 'next'
import { Building2, Users, FolderOpen, FileStack, Activity } from 'lucide-react'
import { AdminStatCard } from '@/components/shared/StatCard'
import {
  getGlobalStats,
  getAgenciesWithStats,
  getRecentActivity,
  getProjectsByAgencyThisMonth,
} from './actions'
import { formatDate } from '@/lib/utils/dates'

export const metadata: Metadata = {
  title: 'Admin — MOSTRA',
  description: "Vue d'ensemble super administrateur de la plateforme.",
}

const ACCENT = '#8B5CF6'

const ACTION_LABELS: Record<string, string> = {
  file_uploaded: 'Fichier uploadé',
  file_deleted: 'Fichier supprimé',
  phase_started: 'Phase démarrée',
  phase_completed: 'Phase terminée',
  phase_review: 'Phase en review',
  phase_approved: 'Phase approuvée',
  comment_added: 'Commentaire ajouté',
  status_changed: 'Statut modifié',
  project_created: 'Projet créé',
  project_archived: 'Projet archivé',
  member_invited: 'Membre invité',
  member_joined: 'Membre rejoint',
}

function BarChart({ data }: { data: { agencyName: string; count: number }[] }) {
  if (data.length === 0) {
    return <p className="text-sm text-[#444466] text-center py-6">Aucun projet créé ce mois-ci.</p>
  }
  const max = Math.max(...data.map((d) => d.count), 1)
  return (
    <div className="space-y-2.5">
      {data.map((d) => (
        <div key={d.agencyName} className="flex items-center gap-3">
          <span className="text-xs text-[#6b6b9a] w-28 truncate flex-shrink-0">{d.agencyName}</span>
          <div className="flex-1 h-5 bg-[#1a1a2e] rounded-lg overflow-hidden">
            <div
              className="h-full rounded-lg transition-all duration-500"
              style={{ width: `${(d.count / max) * 100}%`, backgroundColor: ACCENT, opacity: 0.8 }}
            />
          </div>
          <span className="text-xs text-[#6b6b9a] tabular-nums w-4 text-right flex-shrink-0">
            {d.count}
          </span>
        </div>
      ))}
    </div>
  )
}

export default async function SuperAdminPage() {
  const [stats, agencies, activity, chartData] = await Promise.all([
    getGlobalStats(),
    getAgenciesWithStats(),
    getRecentActivity(10),
    getProjectsByAgencyThisMonth(),
  ])

  const recentAgencies = agencies.slice(0, 5)

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-bold text-white">Vue globale</h1>
        <p className="text-sm text-[#555577] mt-0.5">
          {stats.agencyCount} agence{stats.agencyCount !== 1 ? 's' : ''} · toutes données confondues
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <AdminStatCard icon={Building2} label="Agences" value={stats.agencyCount} color={ACCENT} />
        <AdminStatCard
          icon={Users}
          label="Utilisateurs actifs"
          value={stats.userCount}
          color={ACCENT}
        />
        <AdminStatCard
          icon={FolderOpen}
          label="Projets actifs"
          value={stats.activeProjectCount}
          color={ACCENT}
        />
        <AdminStatCard
          icon={FileStack}
          label="Fichiers totaux"
          value={stats.fileCount}
          color={ACCENT}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-[#0d0d1a] border border-[#1e1e3a] rounded-xl p-5">
          <h2 className="text-sm font-semibold text-white mb-4">Projets créés ce mois</h2>
          <BarChart data={chartData} />
        </div>

        <div className="bg-[#0d0d1a] border border-[#1e1e3a] rounded-xl p-5">
          <h2 className="text-sm font-semibold text-white mb-4">Agences récentes</h2>
          <div className="space-y-3">
            {recentAgencies.length === 0 ? (
              <p className="text-sm text-[#444466] text-center py-4">Aucune agence.</p>
            ) : (
              recentAgencies.map((a) => (
                <div key={a.id} className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 text-[11px] font-bold text-white"
                      style={{
                        backgroundColor: a.primary_color + '40',
                        border: `1px solid ${a.primary_color}60`,
                      }}
                    >
                      {a.name[0]?.toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm text-white font-medium truncate">{a.name}</p>
                      <p className="text-[10px] text-[#444466]">
                        {a.memberCount} membres · {a.activeProjects} projets actifs
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] text-[#444466] flex-shrink-0">
                    {formatDate(a.created_at)}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="bg-[#0d0d1a] border border-[#1e1e3a] rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <Activity className="h-4 w-4" style={{ color: ACCENT }} />
          <h2 className="text-sm font-semibold text-white">Activité récente (toutes agences)</h2>
        </div>
        {activity.length === 0 ? (
          <p className="text-sm text-[#444466] text-center py-6">Aucune activité.</p>
        ) : (
          <div className="divide-y divide-[#131325]">
            <div className="grid grid-cols-[1fr_1fr_120px_90px] gap-4 pb-2 text-[10px] text-[#444466] uppercase tracking-widest font-medium">
              <span>Action</span>
              <span>Projet</span>
              <span>Agence</span>
              <span className="text-right">Date</span>
            </div>
            {activity.map((a) => (
              <div
                key={a.id}
                className="grid grid-cols-[1fr_1fr_120px_90px] gap-4 py-2.5 items-center"
              >
                <span className="text-xs text-[#a0a0cc]">
                  {ACTION_LABELS[a.action] ?? a.action}
                  {a.user_name && <span className="text-[#555577] ml-1">· {a.user_name}</span>}
                </span>
                <span className="text-xs text-white truncate">{a.project_name}</span>
                <span
                  className="text-[10px] px-2 py-0.5 rounded-full w-fit"
                  style={{
                    backgroundColor: `${ACCENT}15`,
                    color: ACCENT,
                    border: `1px solid ${ACCENT}30`,
                  }}
                >
                  {a.agency_name}
                </span>
                <p className="text-[10px] text-[#444466] text-right" suppressHydrationWarning>
                  {formatDate(a.created_at)}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
