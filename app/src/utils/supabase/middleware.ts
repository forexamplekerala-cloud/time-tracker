import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Refresh session if expired
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Public routes & PWA assets that must not require auth
  const publicPaths = ['/login', '/manifest.json', '/sw.js', '/icon-192.png', '/icon-512.png']
  const isPublicRoute = publicPaths.some(p => request.nextUrl.pathname.startsWith(p))
  
  if (!user && !isPublicRoute) {
    // Redirect unauthenticated users to login page
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }
  
  if (user && request.nextUrl.pathname.startsWith('/login')) {
    // Redirect authenticated users away from login
    const url = request.nextUrl.clone()
    url.pathname = '/log'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
