# R10c — API Route Handler Wrapper

**Constraint:** No behavior changes. All API endpoints must respond identically.

**Run independently from R10a/R10b** — no shared dependencies.

---

## The problem

Every API route handler has this boilerplate:

```ts
export async function POST(req: Request) {
  try {
    await connectDB()
    // ... actual logic ...
    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    console.error('ERROR: Failed to create X', error)
    return NextResponse.json({ error: 'ERROR: Failed to create X' }, { status: 500 })
  }
}
```

There are **41 occurrences** of catch/error/500 boilerplate across the route files.
The `connectDB()` call appears in every handler. The `requireAuth(req)` check is
repeated in mutation handlers.

---

## Step 1 — Create `src/lib/api-handler.ts`

```ts
import { connectDB } from './db'
import { requireAuth } from './auth'
import { NextResponse } from 'next/server'

type Handler = (req: Request, ctx?: { params: Record<string, string> }) => Promise<NextResponse>

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
): Handler {
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
```

---

## Step 2 — Update each route file

For each route file below, replace the `try { await connectDB() } catch` pattern
with `apiHandler`. The error message shown to callers changes from route-specific
strings to the generic "Internal server error" — this is intentional (only logged
to console, not exposed to real users in production errors).

**File list to update:**

1. `src/app/api/v1/brand/route.ts`
2. `src/app/api/v1/brand/[id]/route.ts`
3. `src/app/api/v1/projects/route.ts`
4. `src/app/api/v1/projects/[id]/route.ts`
5. `src/app/api/v1/projects/[id]/steps/[n]/generate/route.ts`
6. `src/app/api/v1/projects/[id]/steps/[n]/approve/route.ts`
7. `src/app/api/v1/projects/[id]/steps/[n]/reopen/route.ts`
8. `src/app/api/v1/projects/[id]/steps/9/generate-publish-description/route.ts`
9. `src/app/api/v1/workflow/cloudinary/upload-video/route.ts`
10. `src/app/api/v1/workflow/dalle/generate/route.ts`
11. `src/app/api/v1/workflow/suno/callback/route.ts`

**Pattern to apply (example for `brand/route.ts`):**

Before:
```ts
export async function GET() {
  await connectDB()
  const profiles = await BrandProfile.find().sort({ createdAt: 1 }).lean()
  return NextResponse.json(profiles)
}

export async function POST(req: Request) {
  const deny = requireAuth(req)
  if (deny) return deny

  try {
    await connectDB()
    const body = await req.json()
    // ... validation and create logic ...
    return NextResponse.json(profile, { status: 201 })
  } catch (error) {
    console.error('ERROR: Failed to create brand profile', error)
    return NextResponse.json({ error: 'ERROR: Failed to create brand profile' }, { status: 500 })
  }
}
```

After:
```ts
import { apiHandler } from '@/lib/api-handler'

export const GET = apiHandler(async () => {
  const profiles = await BrandProfile.find().sort({ createdAt: 1 }).lean()
  return NextResponse.json(profiles)
})

export const POST = apiHandler(async (req) => {
  const body = await req.json()
  // ... validation and create logic (same as before) ...
  return NextResponse.json(profile, { status: 201 })
}, { auth: true })
```

**Rules for migration:**
- Move ALL the logic inside the handler into the `apiHandler` callback
- Remove the inner `try/catch` — `apiHandler` handles uncaught errors
- Keep all validation `return NextResponse.json(...)` calls exactly as-is — these are
  explicit error responses, not thrown exceptions
- Remove `const deny = requireAuth(req); if (deny) return deny` — pass `{ auth: true }` instead
- Remove `await connectDB()` calls — `apiHandler` calls it before fn runs
- Remove `import { requireAuth }` if it was only used for the auth check
- Remove `import { connectDB }` if it was only used inside the handler

**Routes that do NOT use auth:** Pass no options object (default `{ auth: false }`):
- `GET /api/v1/brand` — public read
- `GET /api/v1/projects` — public read
- `GET /api/v1/projects/[id]` — public read
- `POST /api/v1/workflow/suno/callback` — external callback, uses its own API secret check

**Routes that skip auth but have their own secret check** (e.g. suno callback):
Keep whatever custom auth logic they have inside the handler body. Only remove `connectDB`
and the outer try/catch.

---

## Step 3 — Handle dynamic route params

Next.js route handlers with `[id]` or `[n]` segments receive params via the second
argument. The `apiHandler` wrapper passes `ctx` through:

```ts
// src/app/api/v1/projects/[id]/route.ts
export const GET = apiHandler(async (req, ctx) => {
  const id = ctx?.params.id
  // ...
})

export const DELETE = apiHandler(async (req, ctx) => {
  const id = ctx?.params.id
  // ...
}, { auth: true })
```

Check the actual Next.js 15 route handler signature for params — it may be:
```ts
async function GET(req: Request, { params }: { params: { id: string } })
```

If so, update the `Handler` type in `api-handler.ts` to match:
```ts
type RouteContext = { params: Record<string, string> }
type Handler = (req: Request, ctx?: RouteContext) => Promise<NextResponse>
```

If Next.js 15 uses `Promise<{ params: ... }>` (async params), adjust accordingly.
Read one existing route handler to confirm the exact signature before writing the wrapper.

---

## Verification

```bash
npx tsc --noEmit
```

Then test each affected endpoint with the running dev server to confirm they respond
identically. Key flows to check:
- `GET /` — dashboard loads (GET /api/v1/brand works)
- Create a new brand (POST /api/v1/brand works)
- Create a new project (POST /api/v1/projects works)
- Generate step 1 in a project (POST /api/v1/projects/[id]/steps/1/generate works)
- Approve a step (POST /api/v1/projects/[id]/steps/1/approve works)
