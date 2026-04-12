# R11 — Fix Auth Gaps from Code Review

**Source:** `docs/reviews/review-r10-impl.md`
**Constraint:** No UI changes. No behavior changes for authenticated callers. Fixes auth and consistency only.
**Risk:** Low — all changes are additive (adding auth or wrapping with apiHandler). No logic modified.

---

## What this fixes

| Finding | File                                             | Problem                                                                   |
| ------- | ------------------------------------------------ | ------------------------------------------------------------------------- |
| C1      | `src/lib/auth.ts`                                | `requireAuth()` skips auth when `API_SECRET` is unset — fails open        |
| C2      | `workflow/dalle/generate/route.ts`               | `apiHandler` with no `{ auth: true }`                                     |
| C3      | `workflow/cloudinary/upload-video/route.ts`      | `apiHandler` with no `{ auth: true }`                                     |
| C4      | `workflow/cloudinary/upload-image-file/route.ts` | Raw `export async function POST`, no auth, no `apiHandler`                |
| C5      | `assets/upload/route.ts`                         | Raw `export async function POST`, no auth, no `apiHandler`                |
| C6      | `projects/suggest-title/route.ts`                | Raw `export async function POST`, no auth, no `apiHandler`                |
| C7      | `workflow/suno/start/route.ts`                   | Raw `export async function POST`, no auth                                 |
| C8      | `workflow/suno/status/route.ts`                  | Raw `export async function GET`, no auth                                  |
| I3      | `brand/route.ts`                                 | Raw `body` passed to `BrandProfile.create()` — mass assignment            |
| I4      | `workflow/dalle/generate/route.ts`               | `LLM_BASE_URL` used for DALL-E — leaks OpenAI key to non-OpenAI endpoints |
| I5      | `projects/suggest-title/route.ts`                | Raw error message returned to client                                      |

---

## Step 1 — Fix `src/lib/auth.ts` (C1)

**Current behavior:** if `API_SECRET` is not set in env, auth is silently skipped and all protected routes are open.

**Change:** Fail closed in production. In dev (no `API_SECRET`), keep current behavior but log a warning once.

Replace the entire file with:

```ts
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
    // Local dev: allow without key (same as before)
    return null
  }
  const key = req.headers.get('x-api-key') ?? ''
  if (key !== API_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return null
}
```

---

## Step 2 — Add `{ auth: true }` to DALL-E route (C2)

**File:** `src/app/api/v1/workflow/dalle/generate/route.ts`

Also fix I4: use `'https://api.openai.com/v1'` hardcoded for the DALL-E call, not `LLM_BASE_URL`.

Before:

```ts
import { LLM_BASE_URL, OPENAI_API_KEY } from '@/constants/env.server'
import { apiHandler } from '@/lib/api-handler'
// ...

export const POST = apiHandler(async (req: Request) => {
  // ...
  const dalleRes = await fetch(`${LLM_BASE_URL}/images/generations`, {
```

After:

```ts
import { OPENAI_API_KEY } from '@/constants/env.server'
import { apiHandler } from '@/lib/api-handler'
// ...

const DALLE_BASE_URL = 'https://api.openai.com/v1'

export const POST = apiHandler(async (req: Request) => {
  // ...
  const dalleRes = await fetch(`${DALLE_BASE_URL}/images/generations`, {
```

And add `{ auth: true }` at the end:

```ts
}, { auth: true })
```

---

## Step 3 — Add `{ auth: true }` to Cloudinary upload-video route (C3)

**File:** `src/app/api/v1/workflow/cloudinary/upload-video/route.ts`

Find the closing `)` of the `apiHandler` call (last line) and replace:

```ts
// Before:
})

// After:
}, { auth: true })
```

---

## Step 4 — Migrate upload-image-file to apiHandler (C4)

**File:** `src/app/api/v1/workflow/cloudinary/upload-image-file/route.ts`

Before:

```ts
import { CLOUDINARY_CLOUD_NAME } from '@/constants/env.server'
import { uploadImageBuffer } from '@/lib/cloudinary'
import { NextResponse } from 'next/server'

const MAX_BYTES = 25 * 1024 * 1024

export const runtime = 'nodejs'

export async function POST(req: Request) {
  if (!CLOUDINARY_CLOUD_NAME) { ... }
  // ... rest of logic ...
  try {
    const url = await uploadImageBuffer(buf)
    return NextResponse.json({ url })
  } catch (error) {
    console.error('ERROR: Cloudinary image file upload failed', error)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
}
```

After:

```ts
import { CLOUDINARY_CLOUD_NAME } from '@/constants/env.server'
import { apiHandler } from '@/lib/api-handler'
import { uploadImageBuffer } from '@/lib/cloudinary'
import { NextResponse } from 'next/server'

const MAX_BYTES = 25 * 1024 * 1024

export const runtime = 'nodejs'

export const POST = apiHandler(
  async (req: Request) => {
    if (!CLOUDINARY_CLOUD_NAME) {
      return NextResponse.json(
        { error: 'Cloudinary not configured' },
        { status: 501 }
      )
    }

    let formData: FormData
    try {
      formData = await req.formData()
    } catch {
      return NextResponse.json({ error: 'Invalid form data' }, { status: 400 })
    }

    const file = formData.get('image')
    if (!file || typeof file === 'string') {
      return NextResponse.json(
        { error: 'image file is required (field name: image)' },
        { status: 400 }
      )
    }

    const mime = file.type
    if (!mime.startsWith('image/')) {
      return NextResponse.json(
        { error: 'File must be an image' },
        { status: 400 }
      )
    }

    const buf = Buffer.from(await file.arrayBuffer())
    if (buf.byteLength === 0) {
      return NextResponse.json({ error: 'Empty file' }, { status: 400 })
    }
    if (buf.byteLength > MAX_BYTES) {
      return NextResponse.json(
        { error: 'File too large (max 25 MB)' },
        { status: 413 }
      )
    }

    const url = await uploadImageBuffer(buf)
    return NextResponse.json({ url })
  },
  { auth: true }
)
```

Note: the outer `try/catch` from the original is removed — `apiHandler` handles unhandled errors and returns 500.

---

## Step 5 — Migrate assets/upload to apiHandler (C5)

**File:** `src/app/api/v1/assets/upload/route.ts`

Read the full file first, then:

1. Add import: `import { apiHandler } from '@/lib/api-handler'`
2. Change `export async function POST(req: Request) {` to `export const POST = apiHandler(async (req: Request) => {`
3. Change closing `}` to `}, { auth: true })`

The existing `try/catch` for the upload can remain as-is (it returns 502 on failure, which is a valid explicit response, not an unhandled error).

---

## Step 6 — Migrate suggest-title to apiHandler (C6 + I5)

**File:** `src/app/api/v1/projects/suggest-title/route.ts`

Replace the entire file:

```ts
import { apiHandler } from '@/lib/api-handler'
import { callLLM } from '@/lib/llm'
import BrandProfile from '@/models/BrandProfile'
import { NextResponse } from 'next/server'

function sanitizeTitle(raw: string): string {
  let t = raw.trim()
  t = t.replace(/^["'\s]+|["'\s]+$/g, '')
  const line = t.split(/\r?\n/).find(l => l.trim()) ?? ''
  t = line.trim().replace(/^(title|project name)\s*:\s*/i, '')
  if (t.length > 120) t = `${t.slice(0, 117)}...`
  return t
}

// POST /api/v1/projects/suggest-title - LLM suggests a video project title
export const POST = apiHandler(
  async (req: Request) => {
    const body = await req.json().catch(() => ({}))
    const brandProfileId = body.brandProfileId as string | undefined
    const hint =
      typeof body.hint === 'string' ? body.hint.trim().slice(0, 500) : ''

    if (!brandProfileId?.trim()) {
      return NextResponse.json(
        { error: 'brandProfileId is required' },
        { status: 400 }
      )
    }

    const brand = await BrandProfile.findById(brandProfileId).lean()
    if (!brand) {
      return NextResponse.json(
        { error: 'Brand profile not found' },
        { status: 404 }
      )
    }

    const platformStr = brand.platforms?.join(', ') || 'Not specified'
    const refs =
      brand.exampleVideoUrls?.length > 0
        ? brand.exampleVideoUrls.join(', ')
        : 'None listed'

    const userBlock = [
      `Brand name: ${brand.name}`,
      `Product / description: ${brand.description}`,
      `Target audience: ${brand.targetAudience || 'Not specified'}`,
      `Tone: ${brand.tone || 'Not specified'}`,
      `Platforms: ${platformStr}`,
      `Reference video URLs (style cues): ${refs}`,
      '',
      hint
        ? `User's creative angle or focus (use this): ${hint}`
        : 'Infer one sharp creative angle from the brand context (no generic slogans).',
      '',
      'Reply with ONLY the title line - nothing else.',
    ].join('\n')

    const messages = [
      {
        role: 'system' as const,
        content: `You name short-form ad video projects (TikTok, Reels, Shorts).

The title is the CREATIVE TOPIC for the entire pipeline: it anchors the campaign brief, story, lyrics, music mood, and visuals. It must feel specific to this brand, not interchangeable with any company.

Rules:
- Output exactly ONE line: the title text only. No quotes, bullets, labels like "Title:", or extra sentences.
- Roughly 4–14 words, under 90 characters.
- Concrete beats vague (e.g. a moment, season, offer, emotion, or scene - tied to the brand).`,
      },
      { role: 'user' as const, content: userBlock },
    ]

    let raw: string
    try {
      raw = await callLLM(messages)
    } catch {
      return NextResponse.json(
        {
          error: 'Could not generate a title - try again or type one manually',
        },
        { status: 502 }
      )
    }

    const title = sanitizeTitle(raw)
    if (!title) {
      return NextResponse.json(
        {
          error: 'Could not generate a title - try again or type one manually',
        },
        { status: 502 }
      )
    }

    return NextResponse.json({ title })
  },
  { auth: true }
)
```

Key changes vs original:

- Removed `import { connectDB }` — `apiHandler` calls it
- Removed outer `try/catch` — `apiHandler` handles uncaught errors
- LLM errors return a generic message (not the raw SDK error) — fixes I5
- Added `{ auth: true }`

---

## Step 7 — Add auth to suno/start and suno/status (C7 + C8)

These routes are not using `apiHandler` (they predate R10c and have no `connectDB` dependency). The simplest fix is to add a manual auth check at the top of each handler — do NOT refactor to `apiHandler` since the routes have their own error handling patterns.

**File:** `src/app/api/v1/workflow/suno/start/route.ts`

Add after the existing imports:

```ts
import { requireAuth } from '@/lib/auth'
```

Add as the first statement inside `export async function POST(req: Request) {`:

```ts
const deny = requireAuth(req)
if (deny) return deny
```

**File:** `src/app/api/v1/workflow/suno/status/route.ts`

Add after the existing imports:

```ts
import { requireAuth } from '@/lib/auth'
```

Add as the first statement inside `export async function GET(req: Request) {`:

```ts
const deny = requireAuth(req)
if (deny) return deny
```

---

## Step 8 — Fix mass assignment in brand/route.ts (I3)

**File:** `src/app/api/v1/brand/route.ts`

Find the `BrandProfile.create(body)` call inside the POST handler. Replace:

```ts
const profile = await BrandProfile.create(body)
```

With:

```ts
const {
  name,
  description,
  targetAudience,
  tone,
  platforms,
  exampleVideoUrls,
  avatarUrl,
} = body
const profile = await BrandProfile.create({
  name,
  description,
  targetAudience,
  tone,
  platforms,
  exampleVideoUrls,
  avatarUrl,
})
```

---

## Verification

```bash
npx tsc --noEmit
```

Zero TypeScript errors expected.

Then test these endpoints manually with the dev server running:

1. **Auth works when `API_SECRET` is set:** Set `API_SECRET=test123` in `.env.local`. Call `POST /api/v1/brand` without the header → should get 401. Call with `x-api-key: test123` → should get 400 (missing fields, not 401).
2. **Dev auth still open when `API_SECRET` is not set:** Unset `API_SECRET`. Call `POST /api/v1/brand` → should work (local dev behavior unchanged).
3. **DALL-E, upload-video, upload-image-file now require auth:** Confirm 401 without key when `API_SECRET` is set.
4. **suggest-title works with auth:** `POST /api/v1/projects/suggest-title` with valid key and brandProfileId → returns title.
5. **suno/start, suno/status return 401** without key when `API_SECRET` is set.

---

## Out of scope for this chunk

- I1 (Suno callback webhook token) — requires schema change + Suno provider config
- I2 (Suno callback atomic write) — low-risk fix, separate change
- Ownership model for `sunoApiKeyOverride` — requires multi-user auth design

