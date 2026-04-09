import { Mail, Phone, MessageCircle } from 'lucide-react'
import type { Profile } from '@/lib/types'

interface ContactManagerProps {
  projectManager: Profile | null
}

export default function ContactManager({ projectManager }: ContactManagerProps) {
  if (!projectManager) {
    return (
      <div className="bg-[#111111] border border-[#2a2a2a] rounded-xl p-5">
        <p className="text-xs text-[#444444] italic">Aucun responsable assigné.</p>
      </div>
    )
  }

  const { full_name, email, phone, contact_method, avatar_url } = projectManager

  // Construit l'URL de contact selon la méthode préférée du PM
  function getContactHref(): string {
    if (contact_method === 'whatsapp' && phone) {
      const digits = phone.replace(/\D/g, '')
      return `https://wa.me/${digits}`
    }
    if (contact_method === 'phone' && phone) {
      return `tel:${phone}`
    }
    return `mailto:${email}`
  }

  function getContactLabel(): string {
    if (contact_method === 'whatsapp') return 'WhatsApp'
    if (contact_method === 'phone') return 'Appeler'
    return 'Email'
  }

  const contactHref = getContactHref()
  const contactLabel = getContactLabel()
  const initials = full_name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  return (
    <div className="bg-[#111111] border border-[#2a2a2a] rounded-xl overflow-hidden">
      {/* En-tête de la carte */}
      <div className="px-5 py-3 border-b border-[#1a1a1a]">
        <p className="text-[10px] text-[#444444] uppercase tracking-widest font-medium">
          Your Project Manager
        </p>
      </div>

      <div className="p-5 space-y-4">
        {/* Avatar + nom */}
        <div className="flex items-center gap-3">
          {avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatar_url}
              alt={full_name}
              className="w-12 h-12 rounded-full object-cover border border-[#2a2a2a]"
            />
          ) : (
            <div className="w-12 h-12 rounded-full bg-[#EF4444]/10 border border-[#EF4444]/20 flex items-center justify-center flex-shrink-0">
              <span className="text-sm font-bold text-[#EF4444]">{initials}</span>
            </div>
          )}
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white truncate">{full_name}</p>
            <p className="text-[11px] text-[#555555]">Project Manager</p>
          </div>
        </div>

        {/* Méthode de contact préférée */}
        <div className="flex items-center gap-2 text-[11px] text-[#555555]">
          <ContactIcon method={contact_method} />
          <span className="truncate">{contact_method === 'email' ? email : (phone ?? email)}</span>
        </div>

        {/* Bouton CTA */}
        <a
          href={contactHref}
          target="_blank"
          rel="noopener noreferrer"
          className="
            flex items-center justify-center gap-2
            w-full px-4 py-2.5 rounded-lg text-sm font-medium
            bg-[#EF4444] hover:bg-[#DC2626] text-white
            transition-colors
          "
        >
          <ContactIcon method={contact_method} className="h-4 w-4" />
          Contact Manager — {contactLabel}
        </a>
      </div>
    </div>
  )
}

// ── Icône de contact ──────────────────────────────────────────────

function ContactIcon({
  method,
  className = 'h-3.5 w-3.5',
}: {
  method: Profile['contact_method']
  className?: string
}) {
  switch (method) {
    case 'whatsapp':
      return <MessageCircle className={className} />
    case 'phone':
      return <Phone className={className} />
    default:
      return <Mail className={className} />
  }
}
