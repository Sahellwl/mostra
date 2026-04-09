import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import {
  ChevronLeft,
  Mail,
  Phone,
  MessageCircle,
  FolderOpen,
  ExternalLink,
  ChevronRight,
  UserX,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/supabase/helpers'
import { getCurrentMember } from '@/lib/supabase/queries'
import { getClientProjects } from '../actions'
import { formatDate } from '@/lib/utils/dates'
import DeleteClientButton from '../DeleteClientButton'

const STATUS_LABEL: Record<string, string> = {
  active: 'Actif',
  completed: 'Terminé',
  archived: 'Archivé',
  draft: 'Brouillon',
}

const STATUS_CLASS: Record<string, string> = {
  active: 'text-[#22C55E] bg-[#22C55E]/10 border-[#22C55E]/20',
  completed: 'text-[#3B82F6] bg-[#3B82F6]/10 border-[#3B82F6]/20',
  archived: 'text-[#555555] bg-[#1a1a1a] border-[#2a2a2a]',
  draft: 'text-[#F59E0B] bg-[#F59E0B]/10 border-[#F59E0B]/20',
}

export default async function ClientDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const memberData = await getCurrentMember(supabase, user.id)
  if (!memberData) redirect('/login')

  const { member } = memberData
  const isAdmin = member.role === 'super_admin' || member.role === 'agency_admin'

  // ── Profil du client ─────────────────────────────────────────
  const { data: profile } = await db(supabase)
    .from('profiles')
    .select('id, full_name, email, phone, contact_method')
    .eq('id', params.id)
    .maybeSingle()

  if (!profile) notFound()

  // ── Vérifier qu'il est bien client de l'agence ───────────────
  const { data: membership } = await db(supabase)
    .from('agency_members')
    .select('id, accepted_at, is_active')
    .eq('user_id', params.id)
    .eq('agency_id', member.agency_id)
    .eq('role', 'client')
    .maybeSingle()

  if (!membership || !membership.is_active) notFound()

  // ── Projets ──────────────────────────────────────────────────
  const projects = await getClientProjects(params.id)

  const activeCount = projects.filter((p) => p.status === 'active').length

  return (
    <div className="space-y-6 max-w-3xl">
      {/* ── Back ── */}
      <Link
        href="/clients"
        className="inline-flex items-center gap-1.5 text-sm text-[#666666] hover:text-white transition-colors"
      >
        <ChevronLeft className="h-4 w-4" />
        Clients
      </Link>

      {/* ── Header ── */}
      <div className="bg-[#111111] border border-[#2a2a2a] rounded-xl p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-[#EF4444]/10 border border-[#EF4444]/20 flex items-center justify-center flex-shrink-0">
              <span className="text-lg font-bold text-[#EF4444]">
                {(profile.full_name as string)[0]?.toUpperCase() ?? '?'}
              </span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">{profile.full_name}</h1>
              <p className="text-sm text-[#555555] mt-0.5">
                Client depuis le {formatDate(membership.accepted_at)}
              </p>
            </div>
          </div>

          {isAdmin && <DeleteClientButton clientId={params.id} clientName={profile.full_name} />}
        </div>

        {/* ── Coordonnées ── */}
        <div className="mt-5 flex flex-wrap gap-4">
          <ContactItem
            icon={<Mail className="h-3.5 w-3.5" />}
            href={`mailto:${profile.email}`}
            label={profile.email}
          />
          {profile.phone && (
            <ContactItem
              icon={
                profile.contact_method === 'whatsapp' ? (
                  <MessageCircle className="h-3.5 w-3.5" />
                ) : (
                  <Phone className="h-3.5 w-3.5" />
                )
              }
              href={
                profile.contact_method === 'whatsapp'
                  ? `https://wa.me/${(profile.phone as string).replace(/\D/g, '')}`
                  : `tel:${profile.phone}`
              }
              label={profile.phone}
            />
          )}
        </div>
      </div>

      {/* ── Projets ── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-white">
            Projets
            <span className="ml-2 text-[#555555] font-normal">
              {projects.length} au total · {activeCount} actif{activeCount !== 1 ? 's' : ''}
            </span>
          </h2>
        </div>

        <div className="bg-[#111111] border border-[#2a2a2a] rounded-xl overflow-hidden">
          {projects.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <FolderOpen className="h-8 w-8 text-[#2a2a2a]" />
              <p className="text-sm text-[#444444]">Aucun projet pour ce client.</p>
            </div>
          ) : (
            <div className="divide-y divide-[#1a1a1a]">
              {/* En-tête */}
              <div className="grid grid-cols-[1fr_100px_80px] gap-4 px-5 py-2.5 text-[10px] text-[#444444] uppercase tracking-widest font-medium">
                <span>Projet</span>
                <span>Statut</span>
                <span className="text-right">Actions</span>
              </div>

              {projects.map((project) => (
                <div
                  key={project.id}
                  className="grid grid-cols-[1fr_100px_80px] gap-4 px-5 py-3.5 items-center hover:bg-[#161616] transition-colors"
                >
                  {/* Nom + progression */}
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-white truncate">{project.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex-1 max-w-[120px] h-1.5 bg-[#2a2a2a] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#EF4444] rounded-full"
                          style={{ width: `${project.progress ?? 0}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-[#555555] tabular-nums">
                        {project.progress ?? 0}%
                      </span>
                    </div>
                  </div>

                  {/* Statut */}
                  <span
                    className={`
                    inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border w-fit
                    ${STATUS_CLASS[project.status] ?? STATUS_CLASS.draft}
                  `}
                  >
                    {STATUS_LABEL[project.status] ?? project.status}
                  </span>

                  {/* Actions */}
                  <div className="flex items-center justify-end gap-2">
                    <Link
                      href={`/projects/${project.id}`}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px]
                        border border-[#2a2a2a] text-[#666666] hover:text-white hover:border-[#444444]
                        transition-colors"
                    >
                      Voir
                      <ChevronRight className="h-3 w-3" />
                    </Link>
                    {project.share_token && (
                      <Link
                        href={`/client/${project.share_token}`}
                        target="_blank"
                        className="inline-flex items-center justify-center w-[30px] h-[30px] rounded-lg
                          border border-[#2a2a2a] text-[#555555] hover:text-white hover:border-[#444444]
                          transition-colors"
                        title="Lien client"
                      >
                        <ExternalLink className="h-3 w-3" />
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Zone danger ── */}
      {isAdmin && (
        <div className="bg-[#111111] border border-[#EF4444]/10 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-white mb-1">Zone de danger</h3>
          <p className="text-xs text-[#555555] mb-4">
            Supprimer ce client le retire de l&apos;agence (soft delete). Ses projets sont
            conservés.
          </p>
          <DeleteClientButton clientId={params.id} clientName={profile.full_name} />
        </div>
      )}
    </div>
  )
}

// ── Sous-composant contact ─────────────────────────────────────

function ContactItem({
  icon,
  href,
  label,
}: {
  icon: React.ReactNode
  href: string
  label: string
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 text-xs text-[#666666] hover:text-white transition-colors"
    >
      {icon}
      {label}
    </a>
  )
}
