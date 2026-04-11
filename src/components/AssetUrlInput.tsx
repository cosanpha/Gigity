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
    const initial: UrlStatus[] = urls.map(u => ({
      original: u,
      cloudUrl: null,
      status: 'idle',
    }))
    setStatuses(initial)

    // Upload all in parallel
    const resolved = await Promise.all(
      urls.map(async (url, i) => {
        setStatuses(prev =>
          prev.map((s, j) => (j === i ? { ...s, status: 'uploading' } : s))
        )

        const res = await fetch('/api/v1/assets/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url }),
        })

        if (res.ok) {
          const data = await res.json()
          setStatuses(prev =>
            prev.map((s, j) =>
              j === i ? { ...s, cloudUrl: data.url, status: 'done' } : s
            )
          )
          return data.url as string
        } else {
          const err = await res.json().catch(() => ({ error: 'Upload failed' }))
          setStatuses(prev =>
            prev.map((s, j) =>
              j === i ? { ...s, status: 'error', error: err.error } : s
            )
          )
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
            <div
              key={i}
              className="flex items-start gap-2 text-[12px]"
            >
              {s.status === 'uploading' && (
                <>
                  <span className="mt-0.5 h-3 w-3 shrink-0 animate-spin rounded-full border-2 border-zinc-300 border-t-indigo-500" />
                  <span className="truncate text-zinc-400">{s.original}</span>
                  <span className="shrink-0 text-zinc-400">
                    Uploading to Cloudinary…
                  </span>
                </>
              )}
              {s.status === 'done' && (
                <>
                  <span className="shrink-0 text-green-500">✓</span>
                  <a
                    href={s.cloudUrl!}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="truncate text-indigo-500 hover:underline"
                  >
                    {s.cloudUrl}
                  </a>
                </>
              )}
              {s.status === 'error' && (
                <>
                  <span className="shrink-0 text-red-500">✕</span>
                  <span className="truncate text-red-500">
                    {s.error ?? 'Upload failed'}
                  </span>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
