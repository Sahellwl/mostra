import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { UserPlus, Users, UserCheck, Sparkles, Mail, FolderOpen, ChevronRight } from 'lucide-react'
import { StatCard } from '@/components/shared/StatCard'
import { createClient } from '@/lib/supabase/server'
import { getCurrentMember } from '@/lib/supabase/queries'
import { getClientsWithStats } from './actions'
import { formatDate } from '@/lib/utils/dates'
import DeleteClientButton from './DeleteClientButton'
import { EmptyState } from '@/components/shared/EmptyState'

export const metadata: Metadata = {
  title: 'Clients — MOSTRA',
  description: 'Gérez vos clients et leurs projets associés.',
}

export default async function ClientsPage() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const memberData = await getCurrentMember(supabase, user.id)
  if (!memberData) redirect('/login')

  const { member } = memberData
  const isAdmin = member.role === 'super_admin' || member.role === 'agency_admin'
  const isCreative = member.role === 'creative'

  const clients = await getClientsWithStats(
    member.agency_id,
    isCreative ? { creativeUserId: user.id } : undefined,
  )

  // Stats
  const now = new Date()
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const newThisMonth = clients.filter((c) => c.joinedAt?.startsWith(thisMonth)).length
  const activeCount = clients.filter((c) => c.activeProjects > 0).length

  return (
    <div className="space-y-6">
      {/* ── Header ────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white">Clients</h1>
          <p className="text-sm text-[#666666] mt-0.5">
            {clients.length} client{clients.length !== 1 ? 's' : ''} dans votre agence
          </p>
        </div>
        {isAdmin && (
          <Link
            href="/clients/new"
            className="
              inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium
              bg-[#00D76B]/10 border border-[#00D76B]/20 text-[#00D76B]
              hover:bg-[#00D76B]/20 transition-colors flex-shrink-0
            "
          >
            <UserPlus className="h-4 w-4" />
            Nouveau client
          </Link>
        )}
      </div>

      {/* ── Stats cards ───────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard icon={Users} label="Total clients" value={clients.length} color="#3B82F6" />
        <StatCard
          icon={UserCheck}
          label="Avec projets actifs"
          value={activeCount}
          color="#22C55E"
        />
        <StatCard icon={Sparkles} label="Nouveaux ce mois" value={newThisMonth} color="#F59E0B" />
      </div>

      {/* ── Table clients ─────────────────────────────────────────── */}
      <div className="bg-[#111111] border border-[#2a2a2a] rounded-xl overflow-hidden">
        {clients.length === 0 ? (
          <EmptyState
            icon={Users}
            title="Aucun client pour l'instant."
            action={
              isAdmin ? (
                <Link href="/clients/new" className="text-xs text-[#00D76B] hover:underline">
                  Ajouter le premier client →
                </Link>
              ) : undefined
            }
          />
        ) : (
          <div className="divide-y divide-[#1a1a1a] overflow-x-auto">
            {/* En-tête de tableau */}
            <div className="grid grid-cols-[1fr_120px_120px_100px] gap-4 px-5 py-2.5 text-[10px] text-[#444444] uppercase tracking-widest font-medium min-w-[640px]">
              <span>Client</span>
              <span>Projets actifs</span>
              <span>Ajouté le</span>
              <span className="text-right">Actions</span>
            </div>

            {clients.map((client) => (
              <div
                key={client.userId}
                className="grid grid-cols-[1fr_120px_120px_100px] gap-4 px-5 py-3.5 items-center hover:bg-[#161616] transition-colors min-w-[640px]"
              >
                {/* Identité */}
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-[#00D76B]/10 border border-[#00D76B]/20 flex items-center justify-center flex-shrink-0">
                    <span className="text-[11px] font-bold text-[#00D76B]">
                      {client.fullName[0]?.toUpperCase() ?? '?'}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-white truncate">{client.fullName}</p>
                    <p className="text-[11px] text-[#555555] flex items-center gap-1 truncate">
                      <Mail className="h-3 w-3 flex-shrink-0" />
                      {client.email}
                    </p>
                    {client.lastProjectName && (
                      <p className="text-[10px] text-[#444444] flex items-center gap-1 truncate mt-0.5">
                        <FolderOpen className="h-3 w-3 flex-shrink-0" />
                        {client.lastProjectName}
                      </p>
                    )}
                  </div>
                </div>

                {/* Projets actifs */}
                <div>
                  <span
                    className={`
                    inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border
                    ${
                      client.activeProjects > 0
                        ? 'text-[#22C55E] bg-[#22C55E]/10 border-[#22C55E]/20'
                        : 'text-[#555555] bg-[#1a1a1a] border-[#2a2a2a]'
                    }
                  `}
                  >
                    {client.activeProjects} actif{client.activeProjects !== 1 ? 's' : ''}
                  </span>
                  {client.totalProjects > 0 && (
                    <p className="text-[10px] text-[#444444] mt-0.5">
                      {client.totalProjects} au total
                    </p>
                  )}
                </div>

                {/* Date */}
                <p className="text-xs text-[#555555]">
                  {client.joinedAt ? formatDate(client.joinedAt) : '—'}
                </p>

                {/* Actions */}
                <div className="flex items-center justify-end gap-1">
                  <Link
                    href={`/clients/${client.userId}`}
                    className="
                      inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px]
                      border border-[#2a2a2a] text-[#666666] hover:text-white hover:border-[#444444]
                      transition-colors
                    "
                  >
                    Voir
                    <ChevronRight className="h-3 w-3" />
                  </Link>
                  {isAdmin && (
                    <DeleteClientButton clientId={client.userId} clientName={client.fullName} />
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
