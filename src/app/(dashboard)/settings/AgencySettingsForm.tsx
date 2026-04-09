'use client'

import { useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Upload, X } from 'lucide-react'
import { toast } from 'sonner'
import { updateAgencySettings } from './actions'

interface Agency {
  name: string
  slug: string
  logo_url: string | null
  primary_color: string
}

interface Props {
  agency: Agency
  canEdit: boolean
}

const inputClass = `
  w-full px-3 py-2.5 rounded-lg text-sm
  bg-[#111111] border border-[#2a2a2a] text-white placeholder:text-[#444444]
  outline-none transition-colors focus:border-[#EF4444]/50 focus:ring-1 focus:ring-[#EF4444]/20
  disabled:opacity-40 disabled:cursor-not-allowed
`

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-xs font-semibold uppercase tracking-widest text-[#666666] mb-4">
      {children}
    </h2>
  )
}

function Field({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-[#a0a0a0] mb-1.5">{label}</label>
      {children}
      {hint && <p className="mt-1.5 text-[11px] text-[#444444]">{hint}</p>}
    </div>
  )
}

function SoonBadge() {
  return (
    <span
      className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold
      uppercase tracking-widest bg-[#1a1a1a] border border-[#2a2a2a] text-[#444444] ml-2"
    >
      Bientôt
    </span>
  )
}

export default function AgencySettingsForm({ agency, canEdit }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [logoPreview, setLogoPreview] = useState<string | null>(agency.logo_url)
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [color, setColor] = useState(agency.primary_color)

  function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setLogoFile(file)
    setLogoPreview(URL.createObjectURL(file))
  }

  function clearLogo() {
    setLogoFile(null)
    setLogoPreview(agency.logo_url)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    const formData = new FormData(form)

    // Injecte la couleur (controllée en React, pas dans un input natif)
    formData.set('primaryColor', color)

    // Injecte le fichier logo si sélectionné
    if (logoFile) formData.set('logo', logoFile)

    startTransition(async () => {
      const result = await updateAgencySettings(formData)
      if (result.success) {
        toast.success('Paramètres sauvegardés.')
        router.refresh()
      } else {
        toast.error(result.error)
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8 max-w-xl">
      {/* ── Section 1 : Informations de l'agence ── */}
      <div className="bg-[#111111] border border-[#1a1a1a] rounded-xl p-5 space-y-5">
        <SectionTitle>Informations de l&apos;agence</SectionTitle>

        {/* Nom */}
        <Field label="Nom de l'agence">
          <input
            name="name"
            type="text"
            defaultValue={agency.name}
            placeholder="Studio Motion Paris"
            required
            disabled={!canEdit || isPending}
            className={inputClass}
          />
        </Field>

        {/* Slug */}
        <Field
          label="Slug"
          hint="L'identifiant URL de votre agence — non modifiable après création."
        >
          <input
            type="text"
            value={agency.slug}
            readOnly
            disabled
            className={`${inputClass} font-mono cursor-not-allowed`}
          />
        </Field>

        {/* Logo */}
        <Field label="Logo de l'agence" hint="PNG, JPG, WebP ou SVG · Max 2 MB">
          <div className="flex items-center gap-4">
            {/* Preview */}
            <div
              className="w-16 h-16 rounded-xl border border-[#2a2a2a] bg-[#0a0a0a]
              flex items-center justify-center flex-shrink-0 overflow-hidden"
            >
              {logoPreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logoPreview} alt="Logo" className="w-full h-full object-contain" />
              ) : (
                <span className="text-xl font-bold text-[#333333]">
                  {agency.name[0]?.toUpperCase()}
                </span>
              )}
            </div>

            <div className="flex-1 space-y-2">
              <input
                ref={fileInputRef}
                type="file"
                id="logo-upload"
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                onChange={handleLogoChange}
                disabled={!canEdit || isPending}
                className="hidden"
              />
              <div className="flex gap-2">
                <label
                  htmlFor="logo-upload"
                  className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-xs
                    border border-[#2a2a2a] text-[#a0a0a0] transition-colors
                    ${
                      canEdit && !isPending
                        ? 'hover:text-white hover:border-[#3a3a3a] cursor-pointer'
                        : 'opacity-40 cursor-not-allowed pointer-events-none'
                    }`}
                >
                  <Upload className="h-3.5 w-3.5" />
                  {logoPreview !== agency.logo_url ? 'Changer' : 'Uploader'}
                </label>
                {logoFile && (
                  <button
                    type="button"
                    onClick={clearLogo}
                    disabled={isPending}
                    className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs
                      border border-[#2a2a2a] text-[#666666] hover:text-white transition-colors"
                  >
                    <X className="h-3 w-3" /> Annuler
                  </button>
                )}
              </div>
              {logoFile && <p className="text-[11px] text-[#22C55E]">{logoFile.name}</p>}
            </div>
          </div>
        </Field>

        {/* Couleur principale */}
        <Field label="Couleur principale" hint="Utilisée pour le branding de votre espace agence.">
          <div className="flex items-center gap-3">
            <div className="relative">
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                disabled={!canEdit || isPending}
                className="w-10 h-10 rounded-lg border border-[#2a2a2a] bg-transparent
                  cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              />
            </div>
            <input
              type="text"
              value={color}
              onChange={(e) => {
                const v = e.target.value
                if (/^#[0-9A-Fa-f]{0,6}$/.test(v)) setColor(v)
              }}
              disabled={!canEdit || isPending}
              className={`${inputClass} flex-1 font-mono`}
              placeholder="#EF4444"
            />
            {/* Aperçu */}
            <div
              className="w-8 h-8 rounded-lg border border-[#2a2a2a] flex-shrink-0"
              style={{ backgroundColor: color }}
            />
          </div>
        </Field>
      </div>

      {/* ── Section 2 : Préférences ── */}
      <div className="bg-[#111111] border border-[#1a1a1a] rounded-xl p-5 space-y-5">
        <SectionTitle>
          Préférences
          <SoonBadge />
        </SectionTitle>

        <Field label="Langue par défaut">
          <select disabled className={inputClass}>
            <option>Français (FR)</option>
            <option>English (EN)</option>
          </select>
        </Field>

        <Field label="Fuseau horaire">
          <input type="text" defaultValue="Europe/Paris (UTC+1)" disabled className={inputClass} />
        </Field>

        <Field label="Méthode de contact préférée (clients)">
          <select disabled className={inputClass}>
            <option>Email</option>
            <option>WhatsApp</option>
            <option>Téléphone</option>
          </select>
        </Field>
      </div>

      {/* ── Section 3 : Contact ── */}
      <div className="bg-[#111111] border border-[#1a1a1a] rounded-xl p-5 space-y-5">
        <SectionTitle>
          Informations de contact
          <SoonBadge />
        </SectionTitle>

        <Field label="Email principal">
          <input type="email" placeholder="contact@agence.com" disabled className={inputClass} />
        </Field>

        <Field label="Téléphone" hint="Optionnel">
          <input type="tel" placeholder="+33 1 23 45 67 89" disabled className={inputClass} />
        </Field>

        <Field label="Site web" hint="Optionnel">
          <input type="url" placeholder="https://agence.com" disabled className={inputClass} />
        </Field>
      </div>

      {/* ── Submit ── */}
      {canEdit && (
        <div className="flex items-center justify-end gap-3">
          <button
            type="submit"
            disabled={isPending}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium
              bg-[#EF4444] text-white hover:bg-[#DC2626] active:bg-[#B91C1C]
              transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Sauvegarder
          </button>
        </div>
      )}

      {!canEdit && (
        <p className="text-xs text-[#444444] text-center">
          Lecture seule — contactez un admin pour modifier ces paramètres.
        </p>
      )}
    </form>
  )
}
