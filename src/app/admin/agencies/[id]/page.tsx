import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft, Users, FolderOpen, FileStack, ExternalLink, ChevronRight } from 'lucide-react'
import { createAdminClient } from '@/lib/supabase/admin'
import { db } from '@/lib/supabase/helpers'
import { getAgencyStats } from '../../actions'
import { formatDate } from '@/lib/utils/dates'
import DeleteAgencyButton from '@/components/admin/DeleteAgencyButton'
import { AdminStatCard } from '@/components/shared/StatCard'

const ACCENT = '#8B5CF6'

const ROLE_LABELS: Record<string, string> = {
  super_admin: 'Super Admin',
  agency_admin: 'Admin',
  creative: 'Créatif',
  client: 'Client',
}
const ROLE_COLORS: Record<string, string> = {
  super_admin: '#EF4444',
  agency_admin: '#F59E0B',
  creative: '#3B82F6',
  client: '#555577',
}

const STATUS_LABELS: Record<string, string> = {
  active: 'Actif',
  completed: 'Terminé',
  archived: 'Archivé',
  on_hold: 'En pause',
  draft: 'Brouillon',
}
const STATUS_COLORS: Record<string, string> = {
  active: '#22C55E',
  completed: '#3B82F6',
  archived: '#555577',
  on_hold: '#F59E0B',
}

export default async function AgencyDetailPage({ params }: { params: { id: string } }) {
  const admin = createAdminClient()

  // Agence
  const { data: agency } = await db(admin)
    .from('agencies')
    .select('id, name, slug, logo_url, primary_color, created_at, updated_at')
    .eq('id', params.id)
    .maybeSingle()

  if (!agency) notFound()

  // Stats
  const stats = await getAgencyStats(params.id)

  // Membres (actifs, non clients)
  const { data: rawMembers } = await db(admin)
    .from('agency_members')
    .select(`id, role, invited_at, accepted_at, profiles!inner ( id, full_name, email )`)
    .eq('agency_id', params.id)
    .eq('is_active', true)
    .not('role', 'eq', 'client')
    .order('invited_at', { ascending: false })

  const members = ((rawMembers ?? []) as any[]).map((m: any) => ({
    id: m.id,
    role: m.role as string,
    invitedAt: m.invited_at as string,
    acceptedAt: m.accepted_at as string | null,
    fullName: m.profiles?.full_name ?? '—',
    email: m.profiles?.email ?? '—',
  }))

  // Projets
  const { data: rawProjects } = await db(admin)
    .from('projects')
    .select('id, name, status, progress, created_at')
    .eq('agency_id', params.id)
    .order('created_at', { ascending: false })
    .limit(10)

  const projects = (rawProjects ?? []) as {
    id: string
    name: string
    status: string
    progress: number
    created_at: string
  }[]

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Back */}
      <Link
        href="/admin/agencies"
        className="inline-flex items-center gap-1.5 text-sm text-[#555577] hover:text-white transition-colors"
      >
        <ChevronLeft className="h-4 w-4" /> Agences
      </Link>

      {/* Header */}
      <div className="bg-[#0d0d1a] border border-[#1e1e3a] rounded-xl p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 text-lg font-bold text-white"
              style={{
                backgroundColor: agency.primary_color + '30',
                border: `1px solid ${agency.primary_color}50`,
              }}
            >
              {agency.name[0]?.toUpperCase()}
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">{agency.name}</h1>
              <p className="text-sm text-[#555577] font-mono mt-0.5">{agency.slug}</p>
              <p className="text-xs text-[#444466] mt-1">
                Créée le {formatDate(agency.created_at)}
              </p>
            </div>
          </div>

          {/* Couleur */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <div
              className="w-5 h-5 rounded-full border border-[#1e1e3a]"
              style={{ backgroundColor: agency.primary_color }}
            />
            <span className="text-xs text-[#444466] font-mono">{agency.primary_color}</span>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <AdminStatCard icon={Users} label="Membres" value={stats.memberCount} color={ACCENT} />
        <AdminStatCard
          icon={FolderOpen}
          label="Projets totaux"
          value={stats.projectCount}
          color="#22C55E"
        />
        <AdminStatCard
          icon={FolderOpen}
          label="Projets actifs"
          value={stats.activeProjects}
          color="#3B82F6"
        />
        <AdminStatCard icon={FileStack} label="Fichiers" value={stats.fileCount} color="#F59E0B" />
      </div>

      {/* Membres */}
      <div className="bg-[#0d0d1a] border border-[#1e1e3a] rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-[#131325]">
          <h2 className="text-sm font-semibold text-white">Membres de l&apos;équipe</h2>
        </div>
        {members.length === 0 ? (
          <p className="text-sm text-[#444466] text-center py-8">Aucun membre.</p>
        ) : (
          <div className="divide-y divide-[#131325]">
            <div className="grid grid-cols-[1fr_80px_80px_80px] gap-4 px-5 py-2.5 text-[10px] text-[#444466] uppercase tracking-widest">
              <span>Membre</span>
              <span>Rôle</span>
              <span>Statut</span>
              <span>Ajouté</span>
            </div>
            {members.map((m) => (
              <div
                key={m.id}
                className="grid grid-cols-[1fr_80px_80px_80px] gap-4 px-5 py-3 items-center hover:bg-[#131325] transition-colors"
              >
                <div className="min-w-0">
                  <p className="text-sm text-white font-medium truncate">{m.fullName}</p>
                  <p className="text-[10px] text-[#444466] truncate">{m.email}</p>
                </div>
                <span
                  className="text-[11px] px-2 py-0.5 rounded-full w-fit font-medium"
                  style={{
                    backgroundColor: `${ROLE_COLORS[m.role] ?? '#555577'}15`,
                    color: ROLE_COLORS[m.role] ?? '#555577',
                    border: `1px solid ${ROLE_COLORS[m.role] ?? '#555577'}30`,
                  }}
                >
                  {ROLE_LABELS[m.role] ?? m.role}
                </span>
                <span
                  className={`text-[11px] px-2 py-0.5 rounded-full w-fit ${m.acceptedAt ? 'text-[#22C55E] bg-[#22C55E]/10 border border-[#22C55E]/20' : 'text-[#F59E0B] bg-[#F59E0B]/10 border border-[#F59E0B]/20'}`}
                >
                  {m.acceptedAt ? 'Actif' : 'Invité'}
                </span>
                <span className="text-[10px] text-[#444466]">{formatDate(m.invitedAt)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Projets */}
      <div className="bg-[#0d0d1a] border border-[#1e1e3a] rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-[#131325] flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white">Projets récents</h2>
          <span className="text-xs text-[#444466]">10 derniers</span>
        </div>
        {projects.length === 0 ? (
          <p className="text-sm text-[#444466] text-center py-8">Aucun projet.</p>
        ) : (
          <div className="divide-y divide-[#131325]">
            {projects.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between gap-4 px-5 py-3 hover:bg-[#131325] transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-white font-medium truncate">{p.name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex-1 max-w-[100px] h-1 bg-[#1a1a2e] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#8B5CF6] rounded-full"
                        style={{ width: `${p.progress}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-[#444466] tabular-nums">{p.progress}%</span>
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span
                    className="text-[11px] px-2 py-0.5 rounded-full font-medium"
                    style={{
                      backgroundColor: `${STATUS_COLORS[p.status] ?? '#555577'}15`,
                      color: STATUS_COLORS[p.status] ?? '#555577',
                      border: `1px solid ${STATUS_COLORS[p.status] ?? '#555577'}30`,
                    }}
                  >
                    {STATUS_LABELS[p.status] ?? p.status}
                  </span>
                  <span className="text-[10px] text-[#444466]">{formatDate(p.created_at)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Danger zone */}
      <div className="bg-[#0d0d1a] border border-[#EF4444]/10 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-white mb-1">Zone de danger</h3>
        <p className="text-xs text-[#555577] mb-4">
          La suppression efface l&apos;agence et toutes ses données (projets, membres, fichiers).
          Action irréversible.
        </p>
        <DeleteAgencyButton agencyId={agency.id} agencyName={agency.name} />
      </div>
    </div>
  )
}
