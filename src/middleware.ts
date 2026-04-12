import { ACTIVE_BRAND_COOKIE, ACTIVE_BRAND_COOKIE_MAX_AGE_SEC } from '@/lib/active-brand-cookie'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

export function middleware(request: NextRequest) {
  const brand = request.nextUrl.searchParams.get('brand')?.trim()
  if (!brand) return NextResponse.next()

  const res = NextResponse.next()
  res.cookies.set(ACTIVE_BRAND_COOKIE, brand, {
    path: '/',
    maxAge: ACTIVE_BRAND_COOKIE_MAX_AGE_SEC,
    sameSite: 'lax',
    httpOnly: true,
  })
  return res
}

export const config = {
  matcher: ['/'],
}
