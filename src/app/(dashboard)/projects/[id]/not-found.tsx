import Link from 'next/link'
import { FolderX } from 'lucide-react'

export default function ProjectNotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-5 text-center px-4">
      <div className="w-12 h-12 rounded-xl bg-[#111111] border border-[#1a1a1a] flex items-center justify-center">
        <FolderX className="h-5 w-5 text-[#333333]" />
      </div>
      <div className="space-y-1.5">
        <h2 className="text-base font-semibold text-white">Projet introuvable</h2>
        <p className="text-sm text-[#555555] max-w-xs">
          Ce projet n&apos;existe pas ou vous n&apos;avez pas accès à ce contenu.
        </p>
      </div>
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium
          bg-[#111111] border border-[#2a2a2a] text-[#a0a0a0] hover:text-white hover:border-[#3a3a3a]
          transition-colors"
      >
        Retour au dashboard
      </Link>
    </div>
  )
}
