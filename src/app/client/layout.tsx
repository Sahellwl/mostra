import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Toaster } from 'sonner'
import ClientLogout from './ClientLogout'
import Logo from '@/components/shared/Logo'

export default async function ClientLayout({ children }: { children: React.ReactNode }) {
  // Auth optionnelle — cette route est publique
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      {/* ── Header ────────────────────────────────────────────────── */}
      <header className="border-b border-[#1a1a1a] bg-[#0a0a0a]/80 backdrop-blur sticky top-0 z-30">
        <div className="max-w-[1200px] mx-auto px-6 h-14 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 select-none">
            <Logo variant="full" color="white" className="h-7" />
            <span className="text-[10px] text-[#444444] uppercase tracking-widest font-medium hidden sm:block">
              Client
            </span>
          </Link>

          {/* Actions droite */}
          <div className="flex items-center gap-3">
            {user ? (
              <>
                <Link
                  href="/client/dashboard"
                  className="
                    text-xs text-[#666666] hover:text-white transition-colors
                    px-3 py-1.5 rounded-lg border border-[#2a2a2a] hover:border-[#444444]
                  "
                >
                  Mes projets
                </Link>
                <ClientLogout />
              </>
            ) : (
              <Link
                href="/login"
                className="
                  text-xs text-[#666666] hover:text-white transition-colors
                  px-3 py-1.5 rounded-lg border border-[#2a2a2a] hover:border-[#444444]
                "
              >
                Se connecter
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* ── Contenu ───────────────────────────────────────────────── */}
      <main className="max-w-[1200px] mx-auto px-6 py-8">{children}</main>

      <Toaster
        theme="dark"
        position="top-right"
        toastOptions={{
          style: {
            background: '#111111',
            border: '1px solid #2a2a2a',
            color: '#ffffff',
          },
        }}
      />
    </div>
  )
}
