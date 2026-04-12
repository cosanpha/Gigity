'use client'

import { CloudinaryImageUploadButton } from '@/components/CloudinaryImageUploadButton'
import { isHttpOrHttpsUrl } from '@/lib/is-http-url'
import { LucideCheck, LucidePlus, LucideX } from 'lucide-react'
import Image from 'next/image'
import { useState } from 'react'
import { PasteOnlyUrlInput } from './ui/PasteOnlyUrlInput'

const TONES = [
  'Warm',
  'Encouraging',
  'Modern',
  'Professional',
  'Playful',
  'Bold',
  'Calm',
  'Energetic',
  'Minimalist',
  'Relatable',
]
const PLATFORMS = [
  'TikTok',
  'YouTube Shorts',
  'Instagram Reels',
  'YouTube',
  'Twitter / X',
]

const inputFocus =
  'focus:border-orange-400 focus:outline-none focus:ring-[3px] focus:ring-orange-100'

export interface BrandFormData {
  name: string
  logoUrl: string
  description: string
  targetAudience: string
  tone: string
  platforms: string[]
  exampleVideoUrls: string[]
  brandLinks: string[]
}

interface BrandFormProps {
  initialData?: Partial<BrandFormData>
  onSave: (data: BrandFormData) => Promise<void>
  saving: boolean
}

export function BrandForm({
  initialData = {},
  onSave,
  saving,
}: BrandFormProps) {
  const [name, setName] = useState(initialData.name ?? '')
  const [logoUrl, setLogoUrl] = useState(initialData.logoUrl ?? '')
  const [description, setDescription] = useState(initialData.description ?? '')
  const [targetAudience, setTargetAudience] = useState(
    initialData.targetAudience ?? ''
  )
  const [selectedTones, setSelectedTones] = useState<Set<string>>(
    new Set(
      initialData.tone ? initialData.tone.split(', ').filter(Boolean) : []
    )
  )
  const [selectedPlatforms, setSelectedPlatforms] = useState<Set<string>>(
    new Set(initialData.platforms ?? [])
  )
  const [urls, setUrls] = useState<string[]>(
    initialData.exampleVideoUrls?.length ? initialData.exampleVideoUrls : ['']
  )
  const [brandLinkRows, setBrandLinkRows] = useState<string[]>(
    initialData.brandLinks?.length ? initialData.brandLinks : ['']
  )
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [logoPreviewFailed, setLogoPreviewFailed] = useState(false)
  const trimmedLogoUrl = logoUrl.trim()
  const showLogoPreview =
    isHttpOrHttpsUrl(trimmedLogoUrl) && !logoPreviewFailed

  function toggleTone(t: string) {
    setSelectedTones(prev => {
      const next = new Set(prev)
      if (next.has(t)) next.delete(t)
      else next.add(t)
      return next
    })
  }

  function togglePlatform(p: string) {
    setSelectedPlatforms(prev => {
      const next = new Set(prev)
      if (next.has(p)) next.delete(p)
      else next.add(p)
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

  function addBrandLink() {
    setBrandLinkRows(prev => [...prev, ''])
  }

  function updateBrandLink(index: number, value: string) {
    setBrandLinkRows(prev => prev.map((u, i) => (i === index ? value : u)))
  }

  function removeBrandLink(index: number) {
    setBrandLinkRows(prev => prev.filter((_, i) => i !== index))
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
      brandLinks: brandLinkRows.map(u => u.trim()).filter(Boolean),
    }

    await onSave(data)
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="max-w-[640px]"
    >
      <div className="overflow-hidden rounded-[8px] border border-zinc-200 bg-white">
        {/* Identity section */}
        <div className="border-b border-zinc-200 p-6">
          <p className="mb-5 text-[12px] font-semibold tracking-wider text-zinc-500 uppercase">
            Identity
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-medium text-zinc-700">
                Brand name *
              </label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Deewas"
                required
                className={`h-9 rounded-[6px] border border-zinc-200 px-3 text-sm text-zinc-950 placeholder:text-zinc-400 ${inputFocus}`}
              />
              {errors.name && (
                <p className="text-xs text-red-500">{errors.name}</p>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-medium text-zinc-700">
                Logo URL
              </label>
              <PasteOnlyUrlInput
                type="url"
                value={logoUrl}
                onValueChange={v => {
                  setLogoUrl(v)
                  setLogoPreviewFailed(false)
                }}
                placeholder="Paste logo URL (typing disabled)…"
                className={`h-9 rounded-[6px] border border-zinc-200 bg-zinc-50 px-3 text-sm text-zinc-950 placeholder:text-zinc-400 ${inputFocus}`}
              />
              <CloudinaryImageUploadButton
                idleLabel="Upload logo…"
                onUploaded={url => setLogoUrl(url)}
              />
              {isHttpOrHttpsUrl(trimmedLogoUrl) && (
                <div className="mt-1">
                  {showLogoPreview ? (
                    <div className="relative h-[88px] w-[88px] overflow-hidden rounded-[6px] border border-zinc-200 bg-zinc-50">
                      <Image
                        src={trimmedLogoUrl}
                        alt="Logo preview"
                        fill
                        sizes="88px"
                        className="object-contain p-1"
                        onError={() => setLogoPreviewFailed(true)}
                      />
                    </div>
                  ) : (
                    <p className="text-[12px] text-zinc-500">
                      Could not load image from this URL.
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
          <div className="mt-6 flex flex-col gap-1.5">
            <label className="text-[13px] font-medium text-zinc-700">
              Description *
            </label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="What does your product do? Who is it for?"
              required
              rows={3}
              className={`resize-none rounded-[6px] border border-zinc-200 px-3 py-2 text-sm text-zinc-950 placeholder:text-zinc-400 ${inputFocus}`}
            />
          </div>
          <div className="mt-6 flex flex-col gap-1.5">
            <label className="text-[13px] font-medium text-zinc-700">
              Target audience
            </label>
            <input
              type="text"
              value={targetAudience}
              onChange={e => setTargetAudience(e.target.value)}
              placeholder="Young adults managing their first salary"
              className={`h-9 rounded-[6px] border border-zinc-200 px-3 text-sm text-zinc-950 placeholder:text-zinc-400 ${inputFocus}`}
            />
          </div>
        </div>

        {/* Platforms section */}
        <div className="border-b border-zinc-200 p-6">
          <p className="mb-5 text-[12px] font-semibold tracking-wider text-zinc-500 uppercase">
            Platforms
          </p>
          <div className="flex flex-col gap-2">
            <label className="text-[13px] font-medium text-zinc-700">
              Brand tone
            </label>
            <div className="flex flex-wrap gap-2">
              {TONES.map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => toggleTone(t)}
                  className={`flex items-center gap-1.5 rounded-[6px] border px-3 py-[6px] text-[13px] transition-colors ${
                    selectedTones.has(t)
                      ? 'border-orange-400 bg-orange-50 font-medium text-orange-700'
                      : 'border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300 hover:bg-zinc-50'
                  }`}
                >
                  <span
                    className={`flex h-[14px] w-[14px] shrink-0 items-center justify-center rounded-[3px] border ${
                      selectedTones.has(t)
                        ? 'border-orange-500 bg-orange-500 text-white'
                        : 'border-zinc-300'
                    }`}
                  >
                    {selectedTones.has(t) ? (
                      <LucideCheck
                        className="h-2.5 w-2.5"
                        strokeWidth={3}
                        aria-hidden
                      />
                    ) : null}
                  </span>
                  {t}
                </button>
              ))}
            </div>
          </div>
          <div className="mt-6 flex flex-col gap-2">
            <label className="text-[13px] font-medium text-zinc-700">
              Publishing platforms
            </label>
            <div className="flex flex-wrap gap-2">
              {PLATFORMS.map(p => (
                <button
                  key={p}
                  type="button"
                  onClick={() => togglePlatform(p)}
                  className={`flex items-center gap-1.5 rounded-[6px] border px-3 py-[6px] text-[13px] transition-colors ${
                    selectedPlatforms.has(p)
                      ? 'border-orange-400 bg-orange-50 font-medium text-orange-700'
                      : 'border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300 hover:bg-zinc-50'
                  }`}
                >
                  <span
                    className={`flex h-[14px] w-[14px] shrink-0 items-center justify-center rounded-[3px] border ${
                      selectedPlatforms.has(p)
                        ? 'border-orange-500 bg-orange-500 text-white'
                        : 'border-zinc-300'
                    }`}
                  >
                    {selectedPlatforms.has(p) ? (
                      <LucideCheck
                        className="h-2.5 w-2.5"
                        strokeWidth={3}
                        aria-hidden
                      />
                    ) : null}
                  </span>
                  {p}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Brand links */}
        <div className="border-b border-zinc-200 p-6">
          <p className="mb-5 text-[12px] font-semibold tracking-wider text-zinc-500 uppercase">
            Brand links
          </p>
          <div className="flex flex-col gap-2">
            <label className="text-[13px] font-medium text-zinc-700">
              Website and app links
            </label>
            <p className="text-xs text-zinc-400">
              Where people can download your app or visit your site (e.g. App
              Store, Play Store, landing page). Paste full URLs.
            </p>
            <div className="flex flex-col gap-2">
              {brandLinkRows.map((linkUrl, i) => (
                <div
                  key={i}
                  className="flex gap-2"
                >
                  <PasteOnlyUrlInput
                    type="url"
                    value={linkUrl}
                    onValueChange={v => updateBrandLink(i, v)}
                    placeholder="Paste link (https://…) - typing disabled…"
                    className={`h-9 flex-1 rounded-[6px] border border-zinc-200 bg-zinc-50 px-3 text-sm placeholder:text-zinc-400 ${inputFocus}`}
                  />
                  {brandLinkRows.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeBrandLink(i)}
                      aria-label="Remove link"
                      className="px-2 text-zinc-400 hover:text-zinc-600"
                    >
                      <LucideX
                        className="h-4 w-4"
                        aria-hidden
                      />
                    </button>
                  )}
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={addBrandLink}
              className="inline-flex items-center gap-1.5 self-start text-[13px] text-orange-500 hover:text-orange-600"
            >
              <LucidePlus
                className="h-3.5 w-3.5"
                aria-hidden
              />
              Add link
            </button>
          </div>
        </div>

        {/* Example URLs section */}
        <div className="p-6">
          <p className="mb-5 text-[12px] font-semibold tracking-wider text-zinc-500 uppercase">
            References
          </p>
          <div className="flex flex-col gap-2">
            <label className="text-[13px] font-medium text-zinc-700">
              Example video URLs
            </label>
            <p className="text-xs text-zinc-400">
              Reference videos for style. The AI uses these as inspiration.
            </p>
            <div className="flex flex-col gap-2">
              {urls.map((url, i) => (
                <div
                  key={i}
                  className="flex gap-2"
                >
                  <PasteOnlyUrlInput
                    type="url"
                    value={url}
                    onValueChange={v => updateUrl(i, v)}
                    placeholder="Paste reference video URL (typing disabled)…"
                    className={`h-9 flex-1 rounded-[6px] border border-zinc-200 bg-zinc-50 px-3 text-sm placeholder:text-zinc-400 ${inputFocus}`}
                  />
                  {urls.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeUrl(i)}
                      aria-label="Remove URL"
                      className="px-2 text-zinc-400 hover:text-zinc-600"
                    >
                      <LucideX
                        className="h-4 w-4"
                        aria-hidden
                      />
                    </button>
                  )}
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={addUrl}
              className="inline-flex items-center gap-1.5 self-start text-[13px] text-orange-500 hover:text-orange-600"
            >
              <LucidePlus
                className="h-3.5 w-3.5"
                aria-hidden
              />
              Add URL
            </button>
          </div>
        </div>
      </div>

      <div className="mt-4 flex justify-end">
        <button
          type="submit"
          disabled={saving || !name.trim() || !description.trim()}
          className="rounded-[6px] bg-orange-500 px-5 py-2 text-[13px] font-medium text-white hover:bg-orange-600 disabled:opacity-60"
        >
          {saving ? 'Saving…' : 'Save brand'}
        </button>
      </div>
    </form>
  )
}
