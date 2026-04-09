import {
  Settings,
  Palette,
  Upload,
  Users,
  Mail,
  BookOpen,
  Activity,
  ExternalLink,
  CheckCircle,
  XCircle,
} from 'lucide-react'

const ACCENT = '#8B5CF6'

function Section({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <div className="bg-[#0d0d1a] border border-[#1e1e3a] rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-[#131325] flex items-center gap-3">
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: `${ACCENT}20`, border: `1px solid ${ACCENT}30`, color: ACCENT }}
        >
          <Icon className="h-3.5 w-3.5" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-white">{title}</h2>
          {description && <p className="text-[10px] text-[#444466] mt-0.5">{description}</p>}
        </div>
      </div>
      <div className="px-5 py-4 space-y-4">{children}</div>
    </div>
  )
}

function Field({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div>
      <p className="text-[10px] text-[#555577] uppercase tracking-widest font-medium mb-1.5">
        {label}
      </p>
      <div className="px-3 py-2.5 rounded-lg bg-[#080810] border border-[#1e1e3a] text-sm text-[#a0a0cc] font-mono">
        {value}
      </div>
      {hint && <p className="mt-1 text-[10px] text-[#444466]">{hint}</p>}
    </div>
  )
}

function LimitRow({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-[#131325] last:border-0">
      <span className="text-sm text-[#6b6b9a]">{label}</span>
      <span className="text-sm text-white font-mono tabular-nums">
        {value}
        {unit && <span className="text-[#444466] ml-1 text-xs">{unit}</span>}
      </span>
    </div>
  )
}

function StatusBadge({ active, label }: { active: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2">
      {active ? (
        <CheckCircle className="h-3.5 w-3.5 text-[#22C55E]" />
      ) : (
        <XCircle className="h-3.5 w-3.5 text-[#EF4444]" />
      )}
      <span className={`text-xs ${active ? 'text-[#22C55E]' : 'text-[#EF4444]'}`}>{label}</span>
    </div>
  )
}

const hasResend = !!process.env.RESEND_API_KEY
const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '—'

export default function AdminSettingsPage() {
  return (
    <div className="space-y-7 max-w-2xl">
      <div>
        <h1 className="text-xl font-bold text-white">Paramètres</h1>
        <p className="text-sm text-[#555577] mt-0.5">
          Configuration globale de la plateforme MOSTRA
        </p>
      </div>

      {/* Branding */}
      <Section
        icon={Palette}
        title="Branding de la plateforme"
        description="Identité globale de MOSTRA"
      >
        <Field label="Nom de la plateforme" value="MOSTRA" />
        <Field label="URL de l'application" value={appUrl} />
        <Field
          label="Email de support"
          value="support@mostra.app"
          hint="Configurable via la variable d'environnement SUPPORT_EMAIL"
        />
      </Section>

      {/* Limites par défaut */}
      <Section
        icon={Upload}
        title="Limites par défaut (nouvelles agences)"
        description="Appliquées à chaque agence créée"
      >
        <div className="-mx-5 px-5">
          <LimitRow label="Taille max par fichier" value="500" unit="MB" />
          <LimitRow label="Stockage total par agence" value="10" unit="GB" />
          <LimitRow label="Membres max par agence" value="50" unit="membres" />
          <LimitRow label="Projets actifs simultanés" value="100" unit="projets" />
          <LimitRow label="Versions max par fichier" value="20" unit="versions" />
          <LimitRow label="Phases par projet" value="10" unit="max" />
        </div>
        <p className="text-[10px] text-[#444466] pt-1">
          Ces limites sont indicatives pour le MVP. La configuration dynamique par agence sera
          disponible dans une prochaine version.
        </p>
      </Section>

      {/* Membres max */}
      <Section
        icon={Users}
        title="Rôles & accès"
        description="Rôles disponibles dans la plateforme"
      >
        <div className="-mx-5 px-5">
          <LimitRow label="super_admin" value="Accès global cross-agences" />
          <LimitRow label="agency_admin" value="Gestion d'une agence" />
          <LimitRow label="creative" value="Projets assignés" />
          <LimitRow label="client" value="Lecture seule · ses projets" />
        </div>
      </Section>

      {/* Email */}
      <Section
        icon={Mail}
        title="Configuration email"
        description="Envoi des invitations et notifications"
      >
        <div className="space-y-3">
          <StatusBadge
            active={hasResend}
            label={
              hasResend
                ? 'Resend configuré — emails activés'
                : 'Resend non configuré — emails désactivés'
            }
          />
          {!hasResend && (
            <div className="rounded-lg bg-[#F59E0B]/10 border border-[#F59E0B]/20 px-4 py-3">
              <p className="text-xs text-[#F59E0B] font-medium">Configuration requise</p>
              <p className="text-[11px] text-[#F59E0B]/70 mt-1">
                Ajoutez{' '}
                <code className="font-mono bg-[#F59E0B]/10 px-1 rounded">RESEND_API_KEY</code> dans
                votre fichier{' '}
                <code className="font-mono bg-[#F59E0B]/10 px-1 rounded">.env.local</code> pour
                activer l&apos;envoi d&apos;emails.
              </p>
            </div>
          )}
          <Field
            label="Domaine expéditeur"
            value="noreply@mostra.app"
            hint="À configurer dans Resend → Domains"
          />
        </div>
      </Section>

      {/* Infrastructure */}
      <Section
        icon={Settings}
        title="Infrastructure"
        description="Variables d'environnement détectées"
      >
        <div className="space-y-2.5">
          <StatusBadge active={!!process.env.NEXT_PUBLIC_SUPABASE_URL} label="Supabase URL" />
          <StatusBadge
            active={!!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}
            label="Supabase Anon Key"
          />
          <StatusBadge
            active={!!process.env.SUPABASE_SERVICE_ROLE_KEY}
            label="Supabase Service Role Key"
          />
          <StatusBadge active={hasResend} label="Resend API Key" />
        </div>
        <Field
          label="URL Supabase"
          value={supabaseUrl.replace(/https?:\/\//, '').split('.')[0] + '.supabase.co'}
          hint="Projet Supabase actif"
        />
      </Section>

      {/* Ressources */}
      <Section icon={BookOpen} title="Ressources">
        <div className="space-y-2">
          {[
            { label: 'Documentation Next.js 14', href: 'https://nextjs.org/docs' },
            { label: 'Documentation Supabase', href: 'https://supabase.com/docs' },
            { label: 'Supabase Dashboard', href: supabaseUrl.replace('/rest/v1', '') },
            { label: 'Status Supabase', href: 'https://status.supabase.com' },
          ].map((link) => (
            <a
              key={link.href}
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between px-3 py-2.5 rounded-lg
                border border-[#1e1e3a] text-sm text-[#6b6b9a]
                hover:text-white hover:border-[#2e2e5a] transition-colors group"
            >
              <span>{link.label}</span>
              <ExternalLink className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
            </a>
          ))}
        </div>
      </Section>

      {/* Activity placeholder */}
      <Section
        icon={Activity}
        title="Santé de la plateforme"
        description="Monitoring — disponible dans une prochaine version"
      >
        <div className="py-4 text-center">
          <p className="text-sm text-[#444466]">
            Intégration d&apos;un dashboard de monitoring (Sentry, Datadog, etc.) prévue en Sprint
            8.
          </p>
        </div>
      </Section>
    </div>
  )
}
