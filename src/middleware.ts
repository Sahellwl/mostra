import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

// Routes accessibles sans authentification
const PUBLIC_ROUTES = ['/login', '/register']

// Routes accessibles aux users auth sans membership
const MEMBERLESS_ROUTES = ['/onboarding']

const PUBLIC_PREFIXES = ['/invite/', '/client/']

// Routes réservées aux membres d'agence (super_admin, agency_admin, creative)
// Un client qui tente d'y accéder est redirigé vers /client/dashboard
const AGENCY_PREFIXES = ['/dashboard', '/projects', '/settings', '/clients', '/admin']

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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getMemberRole(supabase: any, userId: string): Promise<string | null> {
  const { data } = await supabase
    .from('agency_members')
    .select('role')
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('invited_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  return (data as { role: string } | null)?.role ?? null
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const { supabaseResponse, user, supabase } = await updateSession(request)

  // Utilisateur non authentifié sur une route protégée → /login
  // (les routes MEMBERLESS sont auth-required mais pas membership-required)
  if (!user && !isPublicRoute(pathname) && !MEMBERLESS_ROUTES.includes(pathname)) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('redirectTo', pathname)
    return NextResponse.redirect(url)
  }

  // Utilisateur authentifié sur /login ou /register → dashboard selon rôle
  if (user && (pathname === '/login' || pathname === '/register')) {
    const role = await getMemberRole(supabase, user.id)

    // Pas de membership → envoyer vers /onboarding
    if (!role) {
      const url = request.nextUrl.clone()
      url.pathname = '/onboarding'
      url.search = ''
      return NextResponse.redirect(url)
    }

    const url = request.nextUrl.clone()
    url.pathname = getDashboardByRole(role)
    url.search = ''
    return NextResponse.redirect(url)
  }

  // Protection des routes agence : les clients n'ont pas accès
  // Redirige vers /client/dashboard si le rôle est 'client'
  if (user && AGENCY_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    const role = await getMemberRole(supabase, user.id)

    if (role === 'client') {
      const url = request.nextUrl.clone()
      url.pathname = '/client/dashboard'
      url.search = ''
      return NextResponse.redirect(url)
    }

    // Protection de la route /admin — réservée aux super_admin
    if (pathname.startsWith('/admin') && role !== 'super_admin') {
      const url = request.nextUrl.clone()
      url.pathname = '/dashboard'
      url.search = ''
      return NextResponse.redirect(url)
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
