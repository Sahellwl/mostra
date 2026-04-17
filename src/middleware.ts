import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

// Routes accessibles sans authentification
const PUBLIC_ROUTES = ['/login', '/register']

const PUBLIC_PREFIXES = ['/invite/', '/client/']

function isPublicRoute(pathname: string): boolean {
  if (PUBLIC_ROUTES.includes(pathname)) return true
  return PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix))
}

// Redirige vers le bon dashboard selon le rôle
function getDashboardByRole(role: string | null): string {
  switch (role) {
    case 'super_admin':
      return '/admin'
    case 'client':
      return '/client/dashboard'
    default:
      return '/dashboard'
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const { supabaseResponse, user, supabase } = await updateSession(request)

  // Utilisateur non authentifié sur une route protégée → /login
  if (!user && !isPublicRoute(pathname)) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('redirectTo', pathname)
    return NextResponse.redirect(url)
  }

  // Utilisateur authentifié sur /login ou /register → dashboard selon rôle
  if (user && (pathname === '/login' || pathname === '/register')) {
    const { data: memberData } = await supabase
      .from('agency_members')
      .select('role')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('invited_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    const role = (memberData as { role: string } | null)?.role ?? null

    // Si l'utilisateur est auth mais sans membership actif → ne pas rediriger
    // (évite la boucle infinie avec dashboard/page.tsx qui redirige vers /login)
    if (!role) return supabaseResponse

    const url = request.nextUrl.clone()
    url.pathname = getDashboardByRole(role)
    url.search = ''
    return NextResponse.redirect(url)
  }

  // Protection de la route /admin — réservée aux super_admin
  if (pathname.startsWith('/admin') && user) {
    const { data: member } = await supabase
      .from('agency_members')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'super_admin')
      .eq('is_active', true)
      .maybeSingle()

    if (!member) {
      const url = request.nextUrl.clone()
      url.pathname = '/dashboard'
      return NextResponse.redirect(url)
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
