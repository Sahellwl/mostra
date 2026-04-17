import { redirect } from 'next/navigation'
import { Clock, Mail } from 'lucide-react'
import { EmptyState } from '@/components/shared/EmptyState'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/supabase/helpers'
import { getCurrentMember } from '@/lib/supabase/queries'
import { formatDate } from '@/lib/utils/dates'
import InviteModal from '@/components/settings/InviteModal'
import TeamTable from '@/components/settings/TeamTable'
import RevokeInviteButton from '@/components/settings/RevokeInviteButton'
import CopyLinkButton from '@/components/settings/CopyLinkButton'
import type { UserRole } from '@/lib/types'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? ''

export default async function TeamSettingsPage() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const memberData = await getCurrentMember(supabase, user.id)
  if (!memberData) redirect('/login')

  const { member } = memberData
  const isAdmin = member.role === 'super_admin' || member.role === 'agency_admin'

  // ── Membres de l'équipe (sans les clients) ────────────────────
  const { data: rawMembers } = await db(supabase)
    .from('agency_members')
    .select(
      `
      id,
      user_id,
      role,
      invited_at,
      accepted_at,
      profiles!inner (
        id,
        full_name,
        email
      )
    `,
    )
    .eq('agency_id', member.agency_id)
    .eq('is_active', true)
    .in('role', ['super_admin', 'agency_admin', 'creative'])
    .order('invited_at', { ascending: false })

  const members = ((rawMembers ?? []) as any[]).map((m: any) => ({
    id: m.id,
    userId: m.user_id,
    fullName: m.profiles?.full_name ?? 'Inconnu',
    email: m.profiles?.email ?? '',
    role: m.role,
    invitedAt: m.invited_at,
    acceptedAt: m.accepted_at,
  }))

  // ── Invitations en attente ────────────────────────────────────
  const { data: rawInvitations } = await db(supabase)
    .from('invitations')
    .select('id, email, role, token, created_at, expires_at')
    .eq('agency_id', member.agency_id)
    .is('accepted_at', null)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })

  const pendingInvitations = (rawInvitations ?? []) as {
    id: string
    email: string
    role: string
    token: string
    created_at: string
    expires_at: string
  }[]

  const ROLE_LABELS: Record<string, string> = {
    agency_admin: 'Admin',
    creative: 'Créatif',
    client: 'Client',
  }

  return (
    <div className="space-y-8 max-w-4xl">
      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-white">Équipe</h2>
          <p className="text-sm text-[#666666] mt-0.5">
            {members.length} membre{members.length !== 1 ? 's' : ''} dans votre agence
          </p>
        </div>
        {isAdmin && <InviteModal />}
      </div>

      {/* ── Membres ── */}
      <TeamTable
        members={members}
        currentUserId={user.id}
        currentUserRole={member.role as UserRole}
        isAdmin={isAdmin}
      />

      {/* ── Invitations en attente ── */}
      {isAdmin && (
        <div className="space-y-3">
          <div>
            <h3 className="text-sm font-semibold text-white">
              Invitations en attente
              {pendingInvitations.length > 0 && (
                <span className="ml-2 text-xs text-[#555555] font-normal">
                  {pendingInvitations.length}
                </span>
              )}
            </h3>
            <p className="text-xs text-[#555555] mt-0.5">
              Liens actifs générés manuellement — valables 7 jours.
            </p>
          </div>

          <div className="bg-[#111111] border border-[#2a2a2a] rounded-xl overflow-hidden">
            {pendingInvitations.length === 0 ? (
              <EmptyState icon={Clock} title="Aucune invitation en attente." />
            ) : (
              <div className="divide-y divide-[#1a1a1a]">
                {/* Header */}
                <div className="grid grid-cols-[1fr_80px_100px_180px_80px] gap-4 px-5 py-2.5 text-[10px] text-[#444444] uppercase tracking-widest font-medium">
                  <span>Email</span>
                  <span>Rôle</span>
                  <span>Envoyée le</span>
                  <span>Lien</span>
                  <span className="text-right">Actions</span>
                </div>

                {pendingInvitations.map((inv) => {
                  const url = `${APP_URL}/invite/${inv.token}`
                  return (
                    <div
                      key={inv.id}
                      className="grid grid-cols-[1fr_80px_100px_180px_80px] gap-4 px-5 py-3.5 items-center hover:bg-[#161616] transition-colors"
                    >
                      {/* Email */}
                      <div className="flex items-center gap-2 min-w-0">
                        <Mail className="h-3.5 w-3.5 text-[#444444] flex-shrink-0" />
                        <span className="text-sm text-white truncate">{inv.email}</span>
                      </div>

                      {/* Role */}
                      <span className="text-xs text-[#a0a0a0]">
                        {ROLE_LABELS[inv.role] ?? inv.role}
                      </span>

                      {/* Date */}
                      <p className="text-xs text-[#555555]">{formatDate(inv.created_at)}</p>

                      {/* Copy link */}
                      <CopyLinkButton url={url} />

                      {/* Revoke */}
                      <div className="flex justify-end">
                        <RevokeInviteButton invitationId={inv.id} email={inv.email} />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
