'use client'

import { useRef, useState, type ChangeEvent } from 'react'

export function CloudinaryImageUploadButton({
  onUploaded,
  idleLabel = 'Choose image file…',
}: {
  onUploaded: (url: string) => void
  idleLabel?: string
}) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)

  async function onFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setUploadError('Choose an image file (e.g. PNG, JPEG, WebP).')
      return
    }
    setBusy(true)
    setUploadError(null)
    const fd = new FormData()
    fd.append('image', file)
    const res = await fetch('/api/v1/workflow/cloudinary/upload-image-file', {
      method: 'POST',
      body: fd,
    })
    const data = await res.json().catch(() => ({}))
    setBusy(false)
    if (res.ok && typeof data.url === 'string') {
      onUploaded(data.url)
    } else {
      setUploadError(
        typeof data.error === 'string' ? data.error : 'Upload failed'
      )
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,.png,.jpg,.jpeg,.webp,.gif,.avif"
        className="sr-only"
        onChange={onFileChange}
      />
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={busy}
        className="w-fit rounded-[6px] border border-zinc-200 bg-white px-3 py-1.5 text-[13px] font-medium text-zinc-700 transition-colors hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {busy ? (
          <span className="flex items-center gap-2">
            <span className="h-3 w-3 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-600" />
            Uploading…
          </span>
        ) : (
          idleLabel
        )}
      </button>
      {uploadError ? (
        <p className="text-[12px] text-red-500">{uploadError}</p>
      ) : null}
    </div>
  )
}
