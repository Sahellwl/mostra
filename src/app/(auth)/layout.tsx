import type { Metadata } from 'next'
import Logo from '@/components/shared/Logo'

export const metadata: Metadata = {
  title: 'MOSTRA — Connexion',
}

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8 gap-2">
          <Logo variant="full" color="white" className="h-10" />
          <p className="text-sm text-[#666666]">Production Management</p>
        </div>

        {/* Card */}
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-8">{children}</div>
      </div>
    </div>
  )
}
