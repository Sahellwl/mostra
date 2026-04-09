import Link from 'next/link'
import { FileQuestion } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center gap-6 text-center px-4">
      <div className="w-14 h-14 rounded-2xl bg-[#111111] border border-[#1a1a1a] flex items-center justify-center">
        <FileQuestion className="h-6 w-6 text-[#333333]" />
      </div>
      <div className="space-y-2">
        <p className="text-5xl font-bold text-[#1a1a1a] tabular-nums">404</p>
        <h1 className="text-lg font-semibold text-white">Page introuvable</h1>
        <p className="text-sm text-[#555555] max-w-xs">
          Cette page n&apos;existe pas ou a été déplacée.
        </p>
      </div>
      <Link
        href="/"
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium
          bg-[#111111] border border-[#2a2a2a] text-[#a0a0a0] hover:text-white hover:border-[#3a3a3a]
          transition-colors"
      >
        Retour à l&apos;accueil
      </Link>
    </div>
  )
}
