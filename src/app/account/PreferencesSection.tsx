'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Mail, Phone, MessageCircle, Loader2 } from 'lucide-react'
import { updatePreferences } from './actions'
import type { ContactMethod } from '@/lib/types'

interface PreferencesSectionProps {
  contactMethod: ContactMethod
}

const METHODS: { value: ContactMethod; label: string; description: string; icon: typeof Mail }[] =
  [
    {
      value: 'email',
      label: 'Email',
      description: 'Notifications par email',
      icon: Mail,
    },
    {
      value: 'whatsapp',
      label: 'WhatsApp',
      description: 'Messages via WhatsApp',
      icon: MessageCircle,
    },
    {
      value: 'phone',
      label: 'Téléphone',
      description: 'Appels ou SMS',
      icon: Phone,
    },
  ]

export default function PreferencesSection({ contactMethod }: PreferencesSectionProps) {
  const [selected, setSelected] = useState<ContactMethod>(contactMethod)
  const [pending, startTransition] = useTransition()

  function handleSave() {
    startTransition(async () => {
      const result = await updatePreferences(selected)
      if (result.success) toast.success(result.message)
      else toast.error(result.error)
    })
  }

  return (
    <section className="bg-[#111111] border border-[#2a2a2a] rounded-xl p-6 space-y-5">
      <div>
        <h2 className="text-sm font-semibold text-white">Préférences</h2>
        <p className="text-xs text-[#555555] mt-0.5">
          Méthode de contact préférée pour les notifications
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {METHODS.map(({ value, label, description, icon: Icon }) => {
          const active = selected === value
          return (
            <button
              key={value}
              type="button"
              onClick={() => setSelected(value)}
              className={`flex flex-col gap-2 rounded-xl p-4 border text-left transition-colors ${
                active
                  ? 'border-[#00D76B] bg-[#00D76B]/8'
                  : 'border-[#2a2a2a] hover:border-[#3a3a3a] bg-[#0a0a0a]'
              }`}
            >
              <Icon
                className={`h-5 w-5 ${active ? 'text-[#00D76B]' : 'text-[#555555]'}`}
              />
              <div>
                <p className={`text-sm font-medium ${active ? 'text-white' : 'text-[#a0a0a0]'}`}>
                  {label}
                </p>
                <p className="text-[11px] text-[#555555] mt-0.5">{description}</p>
              </div>
              {/* Selection indicator */}
              <div
                className={`w-4 h-4 rounded-full border-2 flex items-center justify-center self-end ${
                  active ? 'border-[#00D76B]' : 'border-[#2a2a2a]'
                }`}
              >
                {active && <div className="w-2 h-2 rounded-full bg-[#00D76B]" />}
              </div>
            </button>
          )
        })}
      </div>

      <button
        type="button"
        onClick={handleSave}
        disabled={pending || selected === contactMethod}
        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#00D76B] text-black text-sm font-semibold hover:bg-[#00c060] disabled:opacity-50 transition-colors"
      >
        {pending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
        Sauvegarder les préférences
      </button>
    </section>
  )
}
