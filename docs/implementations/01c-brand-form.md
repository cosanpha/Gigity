# 01c — Brand Profile: BrandForm Component

## What this builds

The shared form component used by both `/brand/new` and `/brand/[id]/edit`.
Handles all fields, chip selectors for tone and platforms, dynamic URL list.

## Prerequisites

[01b-brand-api.md](01b-brand-api.md) — API routes must exist before testing the form end-to-end.

## Files to create

```
src/components/BrandForm.tsx
```

Reference design: `docs/designs/brand-setup.html`

---

## Data types

```ts
export interface BrandFormData {
  name: string
  logoUrl: string
  description: string
  targetAudience: string
  tone: string           // comma-separated, e.g. "Warm, Modern"
  platforms: string[]
  exampleVideoUrls: string[]
}

interface BrandFormProps {
  initialData?: Partial<BrandFormData>
  onSave: (data: BrandFormData) => Promise<void>
  saving: boolean
}
```

---

## `src/components/BrandForm.tsx`

```tsx
'use client'

import { useState } from 'react'

const TONES = [
  'Warm', 'Encouraging', 'Modern', 'Professional',
  'Playful', 'Bold', 'Calm', 'Energetic', 'Minimalist', 'Relatable',
]
const PLATFORMS = [
  'TikTok', 'YouTube Shorts', 'Instagram Reels', 'YouTube', 'Twitter / X',
]

export interface BrandFormData {
  name: string
  logoUrl: string
  description: string
  targetAudience: string
  tone: string
  platforms: string[]
  exampleVideoUrls: string[]
}

interface BrandFormProps {
  initialData?: Partial<BrandFormData>
  onSave: (data: BrandFormData) => Promise<void>
  saving: boolean
}

export function BrandForm({ initialData = {}, onSave, saving }: BrandFormProps) {
  const [name, setName] = useState(initialData.name ?? '')
  const [logoUrl, setLogoUrl] = useState(initialData.logoUrl ?? '')
  const [description, setDescription] = useState(initialData.description ?? '')
  const [targetAudience, setTargetAudience] = useState(initialData.targetAudience ?? '')
  const [selectedTones, setSelectedTones] = useState<Set<string>>(
    new Set(initialData.tone ? initialData.tone.split(', ').filter(Boolean) : [])
  )
  const [selectedPlatforms, setSelectedPlatforms] = useState<Set<string>>(
    new Set(initialData.platforms ?? [])
  )
  const [urls, setUrls] = useState<string[]>(
    initialData.exampleVideoUrls?.length ? initialData.exampleVideoUrls : ['']
  )
  const [errors, setErrors] = useState<Record<string, string>>({})

  function toggleTone(t: string) {
    setSelectedTones(prev => {
      const next = new Set(prev)
      next.has(t) ? next.delete(t) : next.add(t)
      return next
    })
  }

  function togglePlatform(p: string) {
    setSelectedPlatforms(prev => {
      const next = new Set(prev)
      next.has(p) ? next.delete(p) : next.add(p)
      return next
    })
  }

  function addUrl() {
    setUrls(prev => [...prev, ''])
  }

  function updateUrl(index: number, value: string) {
    setUrls(prev => prev.map((u, i) => (i === index ? value : u)))
  }

  function removeUrl(index: number) {
    setUrls(prev => prev.filter((_, i) => i !== index))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErrors({})

    const data: BrandFormData = {
      name: name.trim(),
      logoUrl: logoUrl.trim(),
      description: description.trim(),
      targetAudience: targetAudience.trim(),
      tone: [...selectedTones].join(', '),
      platforms: [...selectedPlatforms],
      exampleVideoUrls: urls.map(u => u.trim()).filter(Boolean),
    }

    await onSave(data)
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6 max-w-[600px]">

      {/* Row: Name + Logo URL */}
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-[13px] font-medium text-zinc-700">Brand name *</label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Deewas"
            required
            className="h-9 px-3 border border-zinc-200 rounded-[6px] text-sm text-zinc-950
                       placeholder:text-zinc-400 focus:outline-none focus:border-indigo-500"
          />
          {errors.name && <p className="text-xs text-red-500">{errors.name}</p>}
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-[13px] font-medium text-zinc-700">Logo URL</label>
          <input
            type="url"
            value={logoUrl}
            onChange={e => setLogoUrl(e.target.value)}
            placeholder="https://..."
            className="h-9 px-3 border border-zinc-200 rounded-[6px] text-sm text-zinc-950
                       placeholder:text-zinc-400 focus:outline-none focus:border-indigo-500"
          />
        </div>
      </div>

      {/* Description */}
      <div className="flex flex-col gap-1.5">
        <label className="text-[13px] font-medium text-zinc-700">Description *</label>
        <textarea
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="What does your product do? Who is it for?"
          required
          rows={3}
          className="px-3 py-2 border border-zinc-200 rounded-[6px] text-sm text-zinc-950
                     placeholder:text-zinc-400 resize-none focus:outline-none focus:border-indigo-500"
        />
      </div>

      {/* Target Audience */}
      <div className="flex flex-col gap-1.5">
        <label className="text-[13px] font-medium text-zinc-700">Target audience</label>
        <input
          type="text"
          value={targetAudience}
          onChange={e => setTargetAudience(e.target.value)}
          placeholder="Young adults managing their first salary"
          className="h-9 px-3 border border-zinc-200 rounded-[6px] text-sm text-zinc-950
                     placeholder:text-zinc-400 focus:outline-none focus:border-indigo-500"
        />
      </div>

      {/* Tone chips */}
      <div className="flex flex-col gap-2">
        <label className="text-[13px] font-medium text-zinc-700">Brand tone</label>
        <div className="flex flex-wrap gap-2">
          {TONES.map(t => (
            <button
              key={t}
              type="button"
              onClick={() => toggleTone(t)}
              className={`px-3 py-1 text-[13px] rounded-full border transition-colors ${
                selectedTones.has(t)
                  ? 'bg-indigo-500 text-white border-indigo-500'
                  : 'bg-white text-zinc-600 border-zinc-200 hover:border-zinc-300'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Platform chips */}
      <div className="flex flex-col gap-2">
        <label className="text-[13px] font-medium text-zinc-700">Publishing platforms</label>
        <div className="flex flex-wrap gap-2">
          {PLATFORMS.map(p => (
            <button
              key={p}
              type="button"
              onClick={() => togglePlatform(p)}
              className={`px-3 py-1 text-[13px] rounded-full border transition-colors ${
                selectedPlatforms.has(p)
                  ? 'bg-indigo-500 text-white border-indigo-500'
                  : 'bg-white text-zinc-600 border-zinc-200 hover:border-zinc-300'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Example video URLs */}
      <div className="flex flex-col gap-2">
        <label className="text-[13px] font-medium text-zinc-700">Example video URLs</label>
        <p className="text-xs text-zinc-400">Reference videos for style. The AI uses these as inspiration.</p>
        <div className="flex flex-col gap-2">
          {urls.map((url, i) => (
            <div key={i} className="flex gap-2">
              <input
                type="url"
                value={url}
                onChange={e => updateUrl(i, e.target.value)}
                placeholder="https://tiktok.com/..."
                className="flex-1 h-9 px-3 border border-zinc-200 rounded-[6px] text-sm
                           placeholder:text-zinc-400 focus:outline-none focus:border-indigo-500"
              />
              {urls.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeUrl(i)}
                  className="px-2 text-zinc-400 hover:text-zinc-600 text-lg leading-none"
                >
                  ×
                </button>
              )}
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={addUrl}
          className="self-start text-[13px] text-indigo-500 hover:text-indigo-600"
        >
          + Add URL
        </button>
      </div>

      {/* Submit */}
      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={saving || !name.trim() || !description.trim()}
          className="px-5 py-2 bg-indigo-500 text-white text-sm font-medium rounded-[6px]
                     hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? 'Saving...' : 'Save brand'}
        </button>
      </div>
    </form>
  )
}
```

---

## Verify

View the component by building one of the brand pages (next plan).
Check TypeScript: `bun tsc --noEmit`

---

**Output:** Reusable `BrandForm` component with all fields, chip selectors, dynamic URL list.

**Next step:** [01d-brand-pages.md](01d-brand-pages.md) — /brand/new and /brand/[id]/edit pages
