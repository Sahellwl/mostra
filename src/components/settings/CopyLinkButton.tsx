'use client'

import { useState } from 'react'
import { Copy, Check } from 'lucide-react'

export default function CopyLinkButton({ url }: { url: string }) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button
      onClick={handleCopy}
      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px]
        border border-[#2a2a2a] text-[#666666] hover:text-white hover:border-[#444444]
        transition-colors"
      title="Copier le lien"
    >
      {copied ? (
        <>
          <Check className="h-3 w-3 text-[#22C55E]" />
          <span className="text-[#22C55E]">Copié !</span>
        </>
      ) : (
        <>
          <Copy className="h-3 w-3" />
          Copier le lien
        </>
      )}
    </button>
  )
}
