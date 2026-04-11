# 01b — Brand Profile: API Routes

## What this builds

Four API routes for brand profile CRUD. V1 treats the first (and only) brand profile
as the active one. No multi-profile support.

## Prerequisites

[01a-brand-model.md](01a-brand-model.md) — BrandProfile model must exist.

## Files to create

```
src/app/api/v1/brand/route.ts         ← GET (fetch first profile) + POST (create)
src/app/api/v1/brand/[id]/route.ts    ← GET by id + PUT (update) + DELETE
```

---

## `src/app/api/v1/brand/route.ts`

```ts
import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import BrandProfile from '@/models/BrandProfile'

// GET /api/v1/brand — return the first (only) brand profile, or null
export async function GET() {
  await connectDB()
  const profile = await BrandProfile.findOne().sort({ createdAt: 1 }).lean()
  return NextResponse.json(profile ?? null)
}

// POST /api/v1/brand — create brand profile
export async function POST(req: Request) {
  await connectDB()
  const body = await req.json()

  // Validate required fields
  if (!body.name?.trim()) {
    return NextResponse.json({ error: 'name is required', field: 'name' }, { status: 400 })
  }
  if (!body.description?.trim()) {
    return NextResponse.json({ error: 'description is required', field: 'description' }, { status: 400 })
  }
  // Validate URL fields
  const urlError = validateUrls(body)
  if (urlError) return NextResponse.json(urlError, { status: 400 })

  const profile = await BrandProfile.create(body)
  return NextResponse.json(profile, { status: 201 })
}
```

---

## `src/app/api/v1/brand/[id]/route.ts`

```ts
import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import BrandProfile from '@/models/BrandProfile'
import VideoProject from '@/models/VideoProject'

type Ctx = { params: Promise<{ id: string }> }

export async function GET(_req: Request, { params }: Ctx) {
  await connectDB()
  const { id } = await params
  const profile = await BrandProfile.findById(id).lean()
  if (!profile) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(profile)
}

export async function PUT(req: Request, { params }: Ctx) {
  await connectDB()
  const { id } = await params
  const body = await req.json()

  const urlError = validateUrls(body)
  if (urlError) return NextResponse.json(urlError, { status: 400 })

  const profile = await BrandProfile.findByIdAndUpdate(id, body, {
    new: true,
    runValidators: true,
  }).lean()
  if (!profile) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(profile)
}

// DELETE — blocked if any VideoProject references this brand
export async function DELETE(_req: Request, { params }: Ctx) {
  await connectDB()
  const { id } = await params

  // NOTE: VideoProject model must exist before this route works.
  // If VideoProject is not yet created, comment out the inUse check for now.
  const inUse = await VideoProject.exists({ brandProfileId: id })
  if (inUse) {
    return NextResponse.json(
      { error: 'Cannot delete brand with existing video projects' },
      { status: 409 }
    )
  }

  await BrandProfile.findByIdAndDelete(id)
  return NextResponse.json({ ok: true })
}
```

---

## Shared validation helper

Add this function to **both** route files (or extract to `src/lib/validate.ts`):

```ts
function validateUrls(body: any): { error: string; field: string } | null {
  if (body.logoUrl && !/^https?:\/\//.test(body.logoUrl)) {
    return { error: 'logoUrl must start with http:// or https://', field: 'logoUrl' }
  }
  if (Array.isArray(body.exampleVideoUrls)) {
    for (const url of body.exampleVideoUrls) {
      if (url && !/^https?:\/\//.test(url)) {
        return { error: 'exampleVideoUrls must start with http:// or https://', field: 'exampleVideoUrls' }
      }
    }
  }
  return null
}
```

### Note on params in Next.js 16

In Next.js 16+, route params are a `Promise`. Use `await params` before accessing `id`:

```ts
const { id } = await params
```

Not `params.id` directly — that will throw.

---

## Smoke test with curl

```bash
# Create
curl -X POST http://localhost:3000/api/v1/brand \
  -H 'Content-Type: application/json' \
  -d '{"name":"Deewas","description":"Personal finance app","targetAudience":"Young adults","tone":"Warm, Modern","platforms":["TikTok"]}'

# Fetch first profile
curl http://localhost:3000/api/v1/brand

# Edit (use _id from create response)
curl -X PUT http://localhost:3000/api/v1/brand/PROFILE_ID \
  -H 'Content-Type: application/json' \
  -d '{"tone":"Warm, Modern, Bold"}'

# Bad URL validation
curl -X POST http://localhost:3000/api/v1/brand \
  -H 'Content-Type: application/json' \
  -d '{"name":"Test","description":"Test","logoUrl":"not-a-url"}'
# → 400 {"error":"logoUrl must start with http:// or https://","field":"logoUrl"}
```

---

**Output:** Working brand CRUD API. All routes return correct status codes. URL validation works.

**Next step:** [01c-brand-form.md](01c-brand-form.md) — BrandForm React component
