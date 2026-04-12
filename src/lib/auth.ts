import { API_SECRET } from '@/constants/env.server'
import { NextResponse } from 'next/server'

/**
 * Returns a 401/503 response if the request is not authorized.
 *
 * - If API_SECRET is set: require matching `x-api-key` header.
 * - If API_SECRET is NOT set in production: return 503 (server misconfiguration).
 * - If API_SECRET is NOT set in development: skip auth (backward-compatible for local dev).
 */
export function requireAuth(req: Request): NextResponse | null {
  if (!API_SECRET) {
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json(
        {
          error: 'Server not configured: API_SECRET is required in production',
        },
        { status: 503 }
      )
    }
    return null
  }
  const key = req.headers.get('x-api-key') ?? ''
  if (key !== API_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return null
}
