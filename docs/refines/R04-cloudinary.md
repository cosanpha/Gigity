# R04 — Cloudinary Asset Pipeline

## What this builds

1. When a user pastes a URL (image, video, audio) into any step's URL input:
   - Check if the URL is already a Cloudinary URL for this account → skip upload
   - Otherwise: fetch the file from the URL and upload it to Cloudinary
   - Show a per-URL loading spinner during the upload
   - Store the Cloudinary URL in the DB instead of the original URL
2. A shared `AssetUrlInput` component used in all steps that accept URLs
   (steps 6, 9, and the new DALL-E/KlingAI paste inputs in R07/R08).

## Why

External URLs from Midjourney, KlingAI, DALL-E expire in 24-72 hours. Cloudinary
stores them permanently. This means assets are always accessible when assembling
in CapCut (step 10).

## New environment variables

```bash
# .env — add these
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

Update `.env.example` with these same keys (no real values).

## Files to create

```
src/lib/cloudinary.ts                              ← upload helper
src/app/api/v1/assets/upload/route.ts              ← POST endpoint
src/components/AssetUrlInput.tsx                   ← shared input with loading UI
```

## Files to change

```
src/constants/env.server.ts                        ← add Cloudinary vars
src/components/ExternalStepPanel.tsx               ← use AssetUrlInput
src/components/WorkflowClient.tsx                  ← pass assetUrl per step (not shared)
```

---

## Step 1 — Add Cloudinary vars to env.server.ts

```ts
// src/constants/env.server.ts
import 'server-only'

export const MONGODB = process.env.MONGODB
export const OPENAI_API_KEY = process.env.OPENAI_API_KEY
export const LLM_BASE_URL = process.env.LLM_BASE_URL ?? 'https://api.openai.com/v1'
export const LLM_MODEL = process.env.LLM_MODEL ?? 'gpt-4.1-mini'

export const CLOUDINARY_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME
export const CLOUDINARY_API_KEY = process.env.CLOUDINARY_API_KEY
export const CLOUDINARY_API_SECRET = process.env.CLOUDINARY_API_SECRET
```

---

## Step 2 — Cloudinary upload helper

Install: `bun add cloudinary`

```ts
// src/lib/cloudinary.ts
import { v2 as cloudinary } from 'cloudinary'
import {
  CLOUDINARY_CLOUD_NAME,
  CLOUDINARY_API_KEY,
  CLOUDINARY_API_SECRET,
} from '@/constants/env.server'

cloudinary.config({
  cloud_name: CLOUDINARY_CLOUD_NAME,
  api_key: CLOUDINARY_API_KEY,
  api_secret: CLOUDINARY_API_SECRET,
})

export function isCloudinaryUrl(url: string): boolean {
  if (!CLOUDINARY_CLOUD_NAME) return false
  return url.includes(`res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}`)
}

// Upload a file from a remote URL. Returns the permanent Cloudinary URL.
export async function uploadFromUrl(
  url: string,
  folder = 'gigity'
): Promise<string> {
  const result = await cloudinary.uploader.upload(url, {
    folder,
    resource_type: 'auto',  // handles image, video, audio
  })
  return result.secure_url
}
```

---

## Step 3 — Upload API route

```ts
// src/app/api/v1/assets/upload/route.ts
import { NextResponse } from 'next/server'
import { isCloudinaryUrl, uploadFromUrl } from '@/lib/cloudinary'
import { CLOUDINARY_CLOUD_NAME } from '@/constants/env.server'

export async function POST(req: Request) {
  if (!CLOUDINARY_CLOUD_NAME) {
    return NextResponse.json({ error: 'Cloudinary not configured' }, { status: 501 })
  }

  const body = await req.json()
  const { url } = body as { url?: string }

  if (!url?.trim()) {
    return NextResponse.json({ error: 'url is required' }, { status: 400 })
  }

  // Validate it looks like a URL
  if (!/^https?:\/\//.test(url)) {
    return NextResponse.json({ error: 'url must start with http:// or https://' }, { status: 400 })
  }

  // Already on Cloudinary — return as-is
  if (isCloudinaryUrl(url)) {
    return NextResponse.json({ url })
  }

  const cloudUrl = await uploadFromUrl(url)
  return NextResponse.json({ url: cloudUrl })
}
```

---

## Step 4 — AssetUrlInput component

A textarea that accepts multiple URLs (one per line). For each URL, shows upload
status: idle → loading → done (Cloudinary URL) or error.

```tsx
// src/components/AssetUrlInput.tsx
'use client'

import { useState } from 'react'

interface UrlStatus {
  original: string
  cloudUrl: string | null
  status: 'idle' | 'uploading' | 'done' | 'error'
  error?: string
}

interface AssetUrlInputProps {
  label: string
  placeholder?: string
  rows?: number
  // Callback receives the resolved Cloudinary URLs joined by newline
  onChange: (resolvedUrls: string) => void
}

export function AssetUrlInput({
  label,
  placeholder = 'https://...',
  rows = 3,
  onChange,
}: AssetUrlInputProps) {
  const [rawInput, setRawInput] = useState('')
  const [statuses, setStatuses] = useState<UrlStatus[]>([])

  async function handleBlur() {
    const urls = rawInput
      .split('\n')
      .map(u => u.trim())
      .filter(Boolean)

    if (urls.length === 0) {
      setStatuses([])
      onChange('')
      return
    }

    // Init statuses
    const initial: UrlStatus[] = urls.map(u => ({ original: u, cloudUrl: null, status: 'idle' }))
    setStatuses(initial)

    // Upload all in parallel
    const resolved = await Promise.all(
      urls.map(async (url, i) => {
        setStatuses(prev => prev.map((s, j) => j === i ? { ...s, status: 'uploading' } : s))

        const res = await fetch('/api/v1/assets/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url }),
        })

        if (res.ok) {
          const data = await res.json()
          setStatuses(prev => prev.map((s, j) => j === i ? { ...s, cloudUrl: data.url, status: 'done' } : s))
          return data.url as string
        } else {
          const err = await res.json().catch(() => ({ error: 'Upload failed' }))
          setStatuses(prev => prev.map((s, j) => j === i ? { ...s, status: 'error', error: err.error } : s))
          return url // fall back to original on error
        }
      })
    )

    onChange(resolved.join('\n'))
  }

  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[13px] font-medium text-zinc-700">{label}</label>
      <textarea
        value={rawInput}
        onChange={e => setRawInput(e.target.value)}
        onBlur={handleBlur}
        placeholder={placeholder}
        rows={rows}
        className="resize-none rounded-[6px] border border-zinc-200 px-3 py-2 text-sm placeholder:text-zinc-400 focus:border-indigo-500 focus:outline-none"
      />

      {/* Per-URL status indicators */}
      {statuses.length > 0 && (
        <div className="flex flex-col gap-1">
          {statuses.map((s, i) => (
            <div key={i} className="flex items-start gap-2 text-[12px]">
              {s.status === 'uploading' && (
                <>
                  <span className="mt-0.5 h-3 w-3 shrink-0 animate-spin rounded-full border-2 border-zinc-300 border-t-indigo-500" />
                  <span className="truncate text-zinc-400">{s.original}</span>
                  <span className="shrink-0 text-zinc-400">Uploading to Cloudinary…</span>
                </>
              )}
              {s.status === 'done' && (
                <>
                  <span className="shrink-0 text-green-500">✓</span>
                  <a href={s.cloudUrl!} target="_blank" rel="noopener noreferrer"
                     className="truncate text-indigo-500 hover:underline">{s.cloudUrl}</a>
                </>
              )}
              {s.status === 'error' && (
                <>
                  <span className="shrink-0 text-red-500">✕</span>
                  <span className="truncate text-red-500">{s.error ?? 'Upload failed'}</span>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
```

Upload triggers on `onBlur` — when the user clicks away from the textarea. This avoids
uploading on every keystroke.

---

## Step 5 — Use AssetUrlInput in ExternalStepPanel

```tsx
// src/components/ExternalStepPanel.tsx
// Replace the textarea URL input block with:
{needsUrl && (
  <AssetUrlInput
    label={stepNumber === 6 ? 'Character image URLs (one per line)' : 'Asset URL'}
    placeholder="https://..."
    rows={3}
    onChange={onAssetUrlChange}
  />
)}
```

Remove the old `<textarea>` block. The `onAssetUrlChange` prop contract stays the same
(string value), so WorkflowClient needs no changes.

---

## Step 6 — WorkflowClient: per-step assetUrl state

Currently there is ONE shared `assetUrl` state in WorkflowClient. This causes a bug:
switching steps clears the URL. Fix by tracking per-step:

```ts
// src/components/WorkflowClient.tsx
const [assetUrls, setAssetUrls] = useState<Record<number, string>>({})

function setAssetUrl(n: number, url: string) {
  setAssetUrls(prev => ({ ...prev, [n]: url }))
}
```

Pass to ExternalStepPanel:

```tsx
<ExternalStepPanel
  ...
  assetUrl={assetUrls[activeStep] ?? ''}
  onAssetUrlChange={url => setAssetUrl(activeStep, url)}
  onApprove={() => approve(activeStep, { outputAssetUrl: assetUrls[activeStep] ?? '' })}
/>
```

---

## Verify

1. Go to step 6 (character images), paste a Midjourney URL, click away
2. Loading spinner appears → "Uploading to Cloudinary…"
3. After upload → green ✓ with Cloudinary URL shown
4. Approve → Cloudinary URL stored in DB
5. Paste a Cloudinary URL → skips upload, shows green ✓ immediately
6. Paste an invalid URL → shows error message

---

**Output:** All pasted external URLs are automatically uploaded to Cloudinary. Per-URL loading
UI shows progress. Assets never expire.

**Next step:** [R05-story-expansion.md](R05-story-expansion.md) — step 2 lyrics-driven scene expansion
