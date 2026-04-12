import { requireAuth } from './auth'
import { connectDB } from './db'
import { NextResponse } from 'next/server'

type RouteContext = { params: Promise<Record<string, string>> }
type Handler = (req: Request, ctx?: RouteContext) => Promise<NextResponse>

/**
 * Wraps a route handler with:
 * - connectDB() before the handler runs
 * - Automatic 500 response on unhandled errors
 *
 * Usage:
 *   export const GET = apiHandler(async (req) => { ... })
 *   export const POST = apiHandler(async (req) => { ... }, { auth: true })
 */
export function apiHandler(
  fn: Handler,
  options: { auth?: boolean } = {}
): (req: Request, ctx?: RouteContext) => Promise<NextResponse> {
  return async (req, ctx) => {
    if (options.auth) {
      const deny = requireAuth(req)
      if (deny) return deny
    }

    try {
      await connectDB()
      return await fn(req, ctx)
    } catch (error) {
      console.error('Unhandled API error:', error)
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      )
    }
  }
}
