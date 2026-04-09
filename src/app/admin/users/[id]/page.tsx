import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft, Users, FolderOpen, Activity, Building2 } from 'lucide-react'
import { getUserDetails } from '../../actions'
import { formatDate, formatRelative } from '@/lib/utils/dates'
import UserActionsBar from '@/components/admin/UserActionsBar'
import ChangeRoleRow from '@/components/admin/ChangeRoleRow'

const ACCENT = '#8B5CF6'

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
const STATUS_LABELS: Record<string, string> = {
  active: 'Actif',
  completed: 'Terminé',
  archived: 'Archivé',
  on_hold: 'En pause',
}
const STATUS_COLORS: Record<string, string> = {
  active: '#22C55E',
  completed: '#8B5CF6',
  archived: '#555577',
  on_hold: '#F59E0B',
}
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
}

export default async function UserDetailPage({ params }: { params: { id: string } }) {
  const user = await getUserDetails(params.id)
  if (!user) notFound()

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Back */}
      <Link
        href="/admin/users"
        className="inline-flex items-center gap-1.5 text-sm text-[#555577] hover:text-white transition-colors"
      >
        <ChevronLeft className="h-4 w-4" /> Utilisateurs
      </Link>

      {/* Profile header */}
      <div className="bg-[#0d0d1a] border border-[#1e1e3a] rounded-xl p-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold text-white flex-shrink-0"
              style={{ backgroundColor: `${ACCENT}30`, border: `1px solid ${ACCENT}50` }}
            >
              {user.fullName[0]?.toUpperCase() ?? '?'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-white">{user.fullName}</h1>
                {!user.isActive && (
                  <span
                    className="text-[10px] px-2 py-0.5 rounded-full bg-[#EF4444]/10
                    border border-[#EF4444]/20 text-[#EF4444]"
                  >
                    Inactif
                  </span>
                )}
              </div>
              <p className="text-sm text-[#555577] mt-0.5">{user.email}</p>
              <div className="flex items-center gap-4 mt-1.5 text-[10px] text-[#444466]">
                <span>Inscrit le {formatDate(user.createdAt)}</span>
                {user.lastSignIn && (
                  <span>Dernière connexion {formatRelative(user.lastSignIn)}</span>
                )}
              </div>
            </div>
          </div>

          <UserActionsBar userId={user.id} userEmail={user.email} isActive={user.isActive} />
        </div>
      </div>

      {/* Memberships */}
      <div className="bg-[#0d0d1a] border border-[#1e1e3a] rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-[#131325] flex items-center gap-2">
          <Building2 className="h-4 w-4" style={{ color: ACCENT }} />
          <h2 className="text-sm font-semibold text-white">Agences ({user.memberships.length})</h2>
        </div>

        {user.memberships.length === 0 ? (
          <p className="text-sm text-[#444466] text-center py-8">Aucune appartenance.</p>
        ) : (
          <div className="divide-y divide-[#131325]">
            <div
              className="grid grid-cols-[1fr_120px_90px_100px] gap-4 px-5 py-2.5
              text-[10px] text-[#444466] uppercase tracking-widest"
            >
              <span>Agence</span>
              <span>Rôle</span>
              <span>Statut</span>
              <span>Rejoint</span>
            </div>
            {user.memberships.map((m) => (
              <div
                key={m.membershipId}
                className="grid grid-cols-[1fr_120px_90px_100px] gap-4 px-5 py-3 items-center
                  hover:bg-[#131325] transition-colors"
              >
                <Link
                  href={`/admin/agencies/${m.agencyId}`}
                  className="text-sm text-white hover:text-[#8B5CF6] transition-colors truncate"
                >
                  {m.agencyName}
                </Link>
                <ChangeRoleRow userId={user.id} agencyId={m.agencyId} currentRole={m.role} />
                <span
                  className={`text-[11px] px-2 py-0.5 rounded-full w-fit font-medium ${
                    m.isActive
                      ? 'text-[#22C55E] bg-[#22C55E]/10 border border-[#22C55E]/20'
                      : 'text-[#EF4444] bg-[#EF4444]/10 border border-[#EF4444]/20'
                  }`}
                >
                  {m.isActive ? 'Actif' : 'Inactif'}
                </span>
                <span className="text-[10px] text-[#444466]">
                  {m.joinedAt ? formatDate(m.joinedAt) : '—'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Projects */}
      <div className="bg-[#0d0d1a] border border-[#1e1e3a] rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-[#131325] flex items-center gap-2">
          <FolderOpen className="h-4 w-4" style={{ color: ACCENT }} />
          <h2 className="text-sm font-semibold text-white">Projets ({user.projects.length})</h2>
        </div>

        {user.projects.length === 0 ? (
          <p className="text-sm text-[#444466] text-center py-8">Aucun projet lié.</p>
        ) : (
          <div className="divide-y divide-[#131325]">
            {user.projects.map((p) => (
              <div
                key={p.id + p.asRole}
                className="flex items-center justify-between gap-4 px-5 py-3 hover:bg-[#131325] transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-white font-medium truncate">{p.name}</p>
                  <p className="text-[10px] text-[#444466]">{p.agencyName}</p>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span
                    className="text-[10px] px-2 py-0.5 rounded-full border"
                    style={{
                      backgroundColor: `${ROLE_COLORS[p.asRole === 'pm' ? 'creative' : 'client'] ?? '#555577'}15`,
                      color: ROLE_COLORS[p.asRole === 'pm' ? 'creative' : 'client'] ?? '#555577',
                      borderColor: `${ROLE_COLORS[p.asRole === 'pm' ? 'creative' : 'client'] ?? '#555577'}30`,
                    }}
                  >
                    {p.asRole === 'pm' ? 'PM' : 'Client'}
                  </span>
                  <span
                    className="text-[10px] px-2 py-0.5 rounded-full border"
                    style={{
                      backgroundColor: `${STATUS_COLORS[p.status] ?? '#555577'}15`,
                      color: STATUS_COLORS[p.status] ?? '#555577',
                      borderColor: `${STATUS_COLORS[p.status] ?? '#555577'}30`,
                    }}
                  >
                    {STATUS_LABELS[p.status] ?? p.status}
                  </span>
                  <div className="w-16 h-1.5 bg-[#1a1a2e] rounded-full overflow-hidden flex-shrink-0">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${p.progress}%`, backgroundColor: ACCENT }}
                    />
                  </div>
                  <span className="text-[10px] text-[#444466]">{formatDate(p.createdAt)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent activity */}
      <div className="bg-[#0d0d1a] border border-[#1e1e3a] rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-[#131325] flex items-center gap-2">
          <Activity className="h-4 w-4" style={{ color: ACCENT }} />
          <h2 className="text-sm font-semibold text-white">Activité récente</h2>
        </div>

        {user.recentActivity.length === 0 ? (
          <p className="text-sm text-[#444466] text-center py-8">Aucune activité enregistrée.</p>
        ) : (
          <div className="divide-y divide-[#131325]">
            {user.recentActivity.map((a) => (
              <div key={a.id} className="flex items-center justify-between gap-4 px-5 py-2.5">
                <span className="text-xs text-[#a0a0cc]">
                  {ACTION_LABELS[a.action] ?? a.action}
                </span>
                <span className="text-xs text-white truncate flex-1 text-right mr-4">
                  {a.projectName}
                </span>
                <span className="text-[10px] text-[#444466] flex-shrink-0">
                  {formatRelative(a.createdAt)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
