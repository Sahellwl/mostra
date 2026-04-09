import { createAdminClient } from '@/lib/supabase/admin'
import { db } from '@/lib/supabase/helpers'
import AcceptInviteForm from './AcceptInviteForm'

interface InviteState {
  valid: true
  token: string
  email: string
  role: string
  agencyName: string
}
interface InvalidState {
  valid: false
  reason: 'not_found' | 'expired' | 'already_used'
}

async function getInviteData(token: string): Promise<InviteState | InvalidState> {
  const admin = createAdminClient()

  const { data: inv } = await db(admin)
    .from('invitations')
    .select(
      `
      id,
      token,
      email,
      role,
      accepted_at,
      expires_at,
      agencies!inner ( name )
    `,
    )
    .eq('token', token)
    .maybeSingle()

  if (!inv) return { valid: false, reason: 'not_found' }
  if (inv.accepted_at) return { valid: false, reason: 'already_used' }
  if (new Date(inv.expires_at) < new Date()) return { valid: false, reason: 'expired' }

  return {
    valid: true,
    token: inv.token,
    email: inv.email,
    role: inv.role,
    agencyName: inv.agencies?.name ?? 'Votre agence',
  }
}

const ROLE_LABELS: Record<string, string> = {
  agency_admin: 'Admin',
  creative: 'Créatif',
  client: 'Client',
}

// ── Écrans d'erreur ──────────────────────────────────────────────

function InvalidScreen({ reason }: { reason: InvalidState['reason'] }) {
  const messages: Record<InvalidState['reason'], { title: string; desc: string }> = {
    not_found: {
      title: 'Invitation introuvable',
      desc: "Ce lien d'invitation est invalide ou a déjà été supprimé.",
    },
    expired: {
      title: 'Invitation expirée',
      desc: "Ce lien a expiré. Demandez à votre administrateur d'en générer un nouveau.",
    },
    already_used: {
      title: 'Invitation déjà utilisée',
      desc: 'Ce lien a déjà été utilisé pour créer un compte.',
    },
  }
  const { title, desc } = messages[reason]

  return (
    <div className="text-center">
      <div className="w-12 h-12 rounded-full bg-[#EF4444]/10 border border-[#EF4444]/20 flex items-center justify-center mx-auto mb-4">
        <span className="text-2xl">⚠</span>
      </div>
      <h1 className="text-lg font-bold text-white mb-2">{title}</h1>
      <p className="text-sm text-[#666666]">{desc}</p>
    </div>
  )
}

// ── Page principale ──────────────────────────────────────────────

export default async function InvitePage({ params }: { params: { token: string } }) {
  const state = await getInviteData(params.token)

  if (!state.valid) {
    return <InvalidScreen reason={state.reason} />
  }

  return (
    <div>
      {/* Intro */}
      <div className="mb-6">
        <p className="text-sm text-[#666666] mb-1">Vous avez été invité à rejoindre</p>
        <h1 className="text-lg font-bold text-white">{state.agencyName}</h1>
        <div className="mt-2 flex items-center gap-2">
          <span className="text-xs text-[#666666]">en tant que</span>
          <span className="text-xs font-medium text-[#EF4444] bg-[#EF4444]/10 border border-[#EF4444]/20 px-2 py-0.5 rounded-full">
            {ROLE_LABELS[state.role] ?? state.role}
          </span>
        </div>
      </div>

      <AcceptInviteForm token={state.token} email={state.email} />
    </div>
  )
}
