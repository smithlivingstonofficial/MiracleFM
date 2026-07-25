import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { type NextRequest, NextResponse } from 'next/server'

export async function middleware(request: NextRequest) {
  // 1. Create a Response object that we can modify
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  // 2. Create a Supabase client with cookie handling
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          response.cookies.set({ name, value, ...options })
        },
        remove(name: string, options: CookieOptions) {
          response.cookies.set({ name, value: '', ...options })
        },
      },
    }
  )

  const url = request.nextUrl.clone();
  const adminPaths = ['/dashboard', '/upload', '/tracks', '/artists', '/albums', '/covers', '/settings', '/admin-tracks', '/recommendations', '/genres'];
  const isProtectedAdmin = adminPaths.some(path => url.pathname.startsWith(path));
  const isProtectedUser = url.pathname.startsWith('/library');
  const isAuthPage = url.pathname === '/signin' || url.pathname === '/login';

  // Fast-path for guest users with no Supabase session cookies
  const allCookies = request.cookies.getAll();
  const hasAuthCookie = allCookies.some(c => c.name.includes('sb-') || c.name.includes('supabase'));

  if (!hasAuthCookie) {
    if (isProtectedAdmin) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
    if (isProtectedUser) {
      return NextResponse.redirect(new URL('/signin', request.url));
    }
    // Public route & guest visitor: return immediately without calling Supabase Auth API
    return response;
  }

  // 3. Authenticated or auth-cookie present: Get the current user
  const { data: { user } } = await supabase.auth.getUser();

  // --- SECURITY LOGIC ---

  // A. Protect Admin Routes
  if (isProtectedAdmin) {
    if (!user) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
    
    // Check role in database
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
    if (profile?.role !== 'admin') {
      return NextResponse.redirect(new URL('/', request.url));
    }
  }

  // B. Protect User Library
  if (isProtectedUser) {
    if (!user) {
      return NextResponse.redirect(new URL('/signin', request.url));
    }
  }

  // C. Redirect logged-in users away from auth pages
  if (isAuthPage && user) {
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
    
    if (profile?.role === 'admin') {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    } else {
      return NextResponse.redirect(new URL('/', request.url));
    }
  }
  
  return response;
}

export const config = {
  // Match all paths except for static files, images, and API routes
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api).*)'],
}
