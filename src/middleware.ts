import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { type NextRequest, NextResponse } from 'next/server'

export async function middleware(request: NextRequest) {
  // 1. Create a Response object that we can modify
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  // 2. Create a Supabase client with the new cookie handling
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          // The request cookies are read-only, so we need to update the response cookies
          response.cookies.set({ name, value, ...options })
        },
        remove(name: string, options: CookieOptions) {
          // Same here, update response cookies
          response.cookies.set({ name, value: '', ...options })
        },
      },
    }
  )

  // 3. Get the current user
  const { data: { user } } = await supabase.auth.getUser()
  const url = request.nextUrl.clone()

  // --- SECURITY LOGIC ---

  // A. Protect Admin Routes
  const adminPaths = ['/dashboard', '/upload', '/tracks', '/artists', '/albums', '/covers', '/settings', '/admin-tracks', '/recommendations', '/genres']
  if (adminPaths.some(path => url.pathname.startsWith(path))) {
    if (!user) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
    
    // Check role in database
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (profile?.role !== 'admin') {
      return NextResponse.redirect(new URL('/', request.url))
    }
  }

  // B. Protect User Library
  if (url.pathname.startsWith('/library')) {
    if (!user) {
      return NextResponse.redirect(new URL('/signin', request.url))
    }
  }

  // C. Redirect logged-in users away from auth pages
  if ((url.pathname === '/signin' || url.pathname === '/login') && user) {
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    
    if (profile?.role === 'admin') {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    } else {
      return NextResponse.redirect(new URL('/', request.url))
    }
  }
  
  // 4. Return the (potentially modified) response
  return response
}

export const config = {
  // Match all paths except for static files, images, and API routes
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api).*)'],
}
