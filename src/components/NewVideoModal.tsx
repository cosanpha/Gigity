'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

interface NewVideoModalProps {
  brandProfileId: string
}

export function NewVideoModal({ brandProfileId }: NewVideoModalProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function openModal() {
    setTitle('')
    setError(null)
    setOpen(true)
  }

  function closeModal() {
    if (creating) return // don't close while in-flight
    setOpen(false)
  }

  async function handleCreate() {
    if (!title.trim()) return
    setCreating(true)
    setError(null)

    const res = await fetch('/api/v1/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ brandProfileId, title: title.trim() }),
    })

    if (res.ok) {
      const project = await res.json()
      router.push(`/projects/${project._id}`)
    } else {
      const body = await res.json()
      setError(body.error ?? 'Failed to create project')
      setCreating(false)
    }
  }

  return (
    <>
      {/* Trigger button */}
      <button
        onClick={openModal}
        className="flex items-center gap-2 rounded-[6px] bg-indigo-500 px-[18px] py-[9px] text-[14px] font-medium text-white transition-colors hover:bg-indigo-600"
      >
        + New video
      </button>

      {/* Modal overlay */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4"
          onClick={e => e.target === e.currentTarget && closeModal()}
        >
          <div className="w-full max-w-md rounded-[8px] border border-zinc-200 bg-white p-6 shadow-lg">
            {/* Header */}
            <div className="mb-5 flex items-center justify-between">
              <span className="text-[15px] font-semibold text-zinc-950">
                New video
              </span>
              <button
                onClick={closeModal}
                className="text-xl leading-none text-zinc-400 hover:text-zinc-600"
              >
                ×
              </button>
            </div>

            {/* Title field */}
            <div className="mb-4 flex flex-col gap-1.5">
              <label className="text-[13px] font-medium text-zinc-700">
                Title
              </label>
              <input
                type="text"
                placeholder="e.g. Deewas - April payday campaign"
                value={title}
                onChange={e => setTitle(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleCreate()}
                autoFocus
                className="h-9 rounded-[6px] border border-zinc-200 px-3 text-sm placeholder:text-zinc-400 focus:border-indigo-500 focus:outline-none"
              />
            </div>

            {/* Note */}
            <p className="mb-5 text-[13px] text-zinc-500">
              Gigity will start generating your campaign brief (Step 1) as soon
              as you create the project.
            </p>

            {/* Error */}
            {error && <p className="mb-4 text-sm text-red-500">{error}</p>}

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={handleCreate}
                disabled={!title.trim() || creating}
                className="flex-1 rounded-[6px] bg-indigo-500 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {creating ? 'Creating...' : 'Create & start →'}
              </button>
              <button
                onClick={closeModal}
                disabled={creating}
                className="rounded-[6px] border border-zinc-200 px-4 py-2 text-sm text-zinc-600 transition-colors hover:bg-zinc-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
