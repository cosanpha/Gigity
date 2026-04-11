# 01d — Brand Profile: Pages

## What this builds

Two pages that use `BrandForm`: `/brand/new` (create) and `/brand/[id]/edit` (update).
Also the shared `Navbar` component used by both pages (and later the dashboard).

## Prerequisites

[01c-brand-form.md](01c-brand-form.md) — BrandForm component must exist.

## Files to create

```
src/components/Navbar.tsx              ← shared nav (logo + brand pill + edit link)
src/app/brand/new/page.tsx             ← /brand/new
src/app/brand/[id]/edit/page.tsx       ← /brand/[id]/edit
```

---

## `src/components/Navbar.tsx`

```tsx
import Link from 'next/link'

interface NavbarProps {
  brandName?: string
  brandId?: string
}

export function Navbar({ brandName, brandId }: NavbarProps) {
  return (
    <nav className="h-[52px] border-b border-zinc-200 flex items-center justify-between
                    px-6 sticky top-0 bg-white z-10">
      <div className="flex items-center gap-3">
        <Link href="/" className="flex items-center gap-2 text-[15px] font-semibold tracking-tight">
          <div className="w-[26px] h-[26px] bg-indigo-500 rounded-[6px] flex items-center
                          justify-center text-[13px] font-bold text-white">
            G
          </div>
          Gigity
        </Link>
        {brandName && (
          <span className="text-[13px] text-zinc-500 px-[10px] py-[3px] bg-zinc-100
                           border border-zinc-200 rounded-full">
            {brandName}
          </span>
        )}
      </div>
      {brandId && (
        <div className="flex items-center gap-2">
          <Link
            href={`/brand/${brandId}/edit`}
            className="text-[13px] text-zinc-500 px-3 py-[5px] border border-zinc-200
                       rounded-[6px] hover:border-zinc-300 hover:text-zinc-950
                       hover:bg-zinc-100 transition-colors"
          >
            Edit brand
          </Link>
        </div>
      )}
    </nav>
  )
}
```

---

## `src/app/brand/new/page.tsx`

```tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { BrandForm, BrandFormData } from '@/components/BrandForm'
import { Navbar } from '@/components/Navbar'

export default function BrandNewPage() {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSave(data: BrandFormData) {
    setSaving(true)
    setError(null)
    const res = await fetch('/api/v1/brand', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (res.ok) {
      router.push('/')
    } else {
      const body = await res.json()
      setError(body.error ?? 'Something went wrong')
      setSaving(false)
    }
  }

  return (
    <>
      <Navbar />
      <main className="max-w-[780px] mx-auto px-6 py-10">
        <h1 className="text-xl font-semibold tracking-tight mb-1">Set up your brand</h1>
        <p className="text-[13px] text-zinc-500 mb-8">
          This context is used to pre-fill every step of the video workflow.
        </p>
        {error && (
          <div className="mb-6 px-4 py-3 bg-red-50 border border-red-200 rounded-[6px]
                          text-sm text-red-600">
            {error}
          </div>
        )}
        <BrandForm onSave={handleSave} saving={saving} />
      </main>
    </>
  )
}
```

---

## `src/app/brand/[id]/edit/page.tsx`

```tsx
'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { BrandForm, BrandFormData } from '@/components/BrandForm'
import { Navbar } from '@/components/Navbar'

export default function BrandEditPage() {
  const router = useRouter()
  const { id } = useParams<{ id: string }>()
  const [initialData, setInitialData] = useState<BrandFormData | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/v1/brand/${id}`)
      .then(r => r.json())
      .then(setInitialData)
  }, [id])

  async function handleSave(data: BrandFormData) {
    setSaving(true)
    setError(null)
    const res = await fetch(`/api/v1/brand/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (res.ok) {
      router.push('/')
    } else {
      const body = await res.json()
      setError(body.error ?? 'Something went wrong')
      setSaving(false)
    }
  }

  if (!initialData) {
    return (
      <>
        <Navbar />
        <main className="max-w-[780px] mx-auto px-6 py-10">
          <p className="text-sm text-zinc-500">Loading...</p>
        </main>
      </>
    )
  }

  return (
    <>
      <Navbar brandName={initialData.name} brandId={id} />
      <main className="max-w-[780px] mx-auto px-6 py-10">
        <div className="flex items-center gap-3 mb-8">
          <div>
            <h1 className="text-xl font-semibold tracking-tight mb-1">Edit brand</h1>
            <p className="text-[13px] text-zinc-500">Changes apply to all future workflow steps.</p>
          </div>
        </div>
        {error && (
          <div className="mb-6 px-4 py-3 bg-red-50 border border-red-200 rounded-[6px]
                          text-sm text-red-600">
            {error}
          </div>
        )}
        <BrandForm initialData={initialData} onSave={handleSave} saving={saving} />
      </main>
    </>
  )
}
```

---

## Verify

```bash
bun dev
```

1. Open http://localhost:3000/brand/new → form renders with all fields
2. Fill in name + description → click "Save brand" → redirects to `/` (dashboard shows next)
3. Navigate to `/brand/[id]/edit` → form pre-populated with saved data
4. Edit tone → save → redirects to `/`

---

**Output:** Two working brand pages. Navbar component ready for reuse in dashboard.

**Next step:** [02a-dashboard-page.md](02a-dashboard-page.md) — Dashboard server component
