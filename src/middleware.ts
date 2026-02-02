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

  // Define Admin Pages
  const adminPaths = ['/dashboard', '/upload', '/tracks', '/artists', '/settings', '/admin-tracks']
  const isTargetingAdmin = adminPaths.some(path => url.pathname.startsWith(path))

  if (isTargetingAdmin) {
    // 1. No user? Login.
    if (!user) {
      url.pathname = '/login'
      return NextResponse.redirect(url)
    }

    // 2. Check Role
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (!profile || profile.role !== 'admin') {
      url.pathname = '/'
      return NextResponse.redirect(url)
    }
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api).*)'],
}