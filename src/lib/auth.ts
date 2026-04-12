import { API_SECRET } from '@/constants/env.server'
import { NextResponse } from 'next/server'

function providedClientSecret(req: Request): string {
  const auth = req.headers.get('authorization')?.trim() ?? ''
  const bearer = /^Bearer\s+(\S+)/i.exec(auth)
  if (bearer) return bearer[1]
  return req.headers.get('x-api-key')?.trim() ?? ''
}

/**
 * Returns a 401/503 response if the request is not authorized.
 *
 * - If API_SECRET is set: require `Authorization: Bearer <token>` or `x-api-key`
 *   matching API_SECRET.
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
  const key = providedClientSecret(req)
  if (key !== API_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return null
}
