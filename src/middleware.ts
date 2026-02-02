// src/middleware.ts

import { type NextRequest, NextResponse } from 'next/server' // Correct import source
import { createServerClient } from '@supabase/ssr' // Ensure this is imported separately

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request: { headers: request.headers } })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value, options))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const url = request.nextUrl.clone()

  // 1. Admin Security
  if (url.pathname.startsWith('/dashboard') || url.pathname.startsWith('/upload')) { // ... add other admin routes
    if (!user) return NextResponse.redirect(new URL('/login', request.url))
    
    // Check role
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (profile?.role !== 'admin') return NextResponse.redirect(new URL('/', request.url))
  }

  // 2. User Security (Library requires login)
  if (url.pathname.startsWith('/library')) {
    if (!user) return NextResponse.redirect(new URL('/signin', request.url))
  }

  // 3. Prevent logged-in users from visiting auth pages
  if ((url.pathname === '/signin' || url.pathname === '/login') && user) {
    // If admin, go dashboard, else go home
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (profile?.role === 'admin') return NextResponse.redirect(new URL('/dashboard', request.url))
    return NextResponse.redirect(new URL('/', request.url))
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api).*)'],
}