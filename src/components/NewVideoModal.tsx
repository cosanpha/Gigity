'use client'

import { apiFetch } from '@/lib/api-fetch'
import { AnimatePresence, motion } from 'framer-motion'
import { LucideArrowRight, LucidePlus, LucideX } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

interface NewVideoModalProps {
  brandProfileId: string
}

export function NewVideoModal({ brandProfileId }: NewVideoModalProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [hint, setHint] = useState('')
  const [creating, setCreating] = useState(false)
  const [suggesting, setSuggesting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function openModal() {
    setTitle('')
    setHint('')
    setError(null)
    setOpen(true)
  }

  function closeModal() {
    if (creating || suggesting) return
    setOpen(false)
  }

  async function handleSuggestTitle() {
    setSuggesting(true)
    setError(null)
    const res = await apiFetch('/api/v1/projects/suggest-title', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        brandProfileId,
        ...(hint.trim() ? { hint: hint.trim() } : {}),
      }),
    })
    const body = await res.json().catch(() => ({}))
    setSuggesting(false)
    if (res.ok && typeof body.title === 'string' && body.title.trim()) {
      setTitle(body.title.trim())
      return
    }
    setError(
      typeof body.error === 'string'
        ? body.error
        : 'Could not suggest a title - try again or type one manually'
    )
  }

  async function handleCreate() {
    if (!title.trim()) return
    setCreating(true)
    setError(null)

    const res = await apiFetch('/api/v1/projects', {
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
      <button
        onClick={openModal}
        className="inline-flex items-center gap-2 rounded-[7px] bg-orange-500 px-[18px] py-[9px] text-[13.5px] font-semibold text-white transition-colors hover:bg-orange-600 shadow-sm"
      >
        <LucidePlus className="h-4 w-4" aria-hidden />
        New video
      </button>

      <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-50 flex items-center justify-end pb-4 px-4 pt-4 sm:items-center bg-black/30 backdrop-blur-sm"
          onClick={e => e.target === e.currentTarget && closeModal()}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="w-full max-w-md rounded-[12px] border border-zinc-200 bg-white p-6 shadow-xl max-h-[90dvh] overflow-y-auto"
          >
            <div className="mb-5 flex items-center justify-between">
              <span className="text-[15px] font-semibold text-zinc-950">
                New video
              </span>
              <button
                type="button"
                onClick={closeModal}
                disabled={creating || suggesting}
                aria-label="Close"
                className="rounded-[4px] p-0.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 disabled:opacity-40"
              >
                <LucideX className="h-5 w-5" aria-hidden />
              </button>
            </div>

            <p className="mb-4 text-[13px] leading-relaxed text-zinc-600">
              This name is your{' '}
              <span className="font-medium text-zinc-800">video topic</span> -
              it carries through the whole workflow (brief, story, lyrics,
              scenes, and prompts). Make it specific; you can refine it with AI
              first, then edit.
            </p>

            <div className="mb-4 flex flex-col gap-1.5">
              <label
                htmlFor="new-video-hint"
                className="text-[13px] font-medium text-zinc-700"
              >
                Angle for AI (optional)
              </label>
              <textarea
                id="new-video-hint"
                placeholder="e.g. Summer sale, first-time investor fear, back-to-school rush…"
                value={hint}
                onChange={e => setHint(e.target.value)}
                rows={2}
                disabled={suggesting || creating}
                className="resize-y rounded-[6px] border border-zinc-200 px-3 py-2 text-sm placeholder:text-zinc-400 focus:border-orange-400 focus:outline-none disabled:bg-zinc-50"
              />
            </div>

            <div className="mb-4 flex flex-col gap-1.5">
              <div className="flex items-center justify-between gap-2">
                <label
                  htmlFor="new-video-title"
                  className="text-[13px] font-medium text-zinc-700"
                >
                  Video topic / title
                </label>
                <button
                  type="button"
                  onClick={handleSuggestTitle}
                  disabled={suggesting || creating}
                  className="shrink-0 rounded-[6px] border border-orange-200 bg-orange-50 px-2.5 py-1 text-[12px] font-medium text-orange-700 transition-colors hover:border-orange-300 hover:bg-orange-100 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {suggesting ? 'Suggesting…' : 'Suggest with AI'}
                </button>
              </div>
              <input
                id="new-video-title"
                type="text"
                placeholder="e.g. Deewas - when payday stress hits"
                value={title}
                onChange={e => setTitle(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleCreate()}
                autoFocus
                disabled={suggesting || creating}
                className="h-9 rounded-[6px] border border-zinc-200 px-3 text-sm placeholder:text-zinc-400 focus:border-orange-400 focus:outline-none disabled:bg-zinc-50"
              />
            </div>

            <p className="mb-5 text-[13px] text-zinc-500">
              Gigity starts your campaign brief (Step 1) as soon as you create
              the project.
            </p>

            {error && <p className="mb-4 text-sm text-red-500">{error}</p>}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleCreate}
                disabled={!title.trim() || creating || suggesting}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-[6px] bg-orange-500 py-2 text-sm font-medium text-white transition-colors hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {creating ? (
                  'Creating...'
                ) : (
                  <>
                    Create & start
                    <LucideArrowRight className="h-4 w-4" aria-hidden />
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={closeModal}
                disabled={creating || suggesting}
                className="rounded-[6px] border border-zinc-200 px-4 py-2 text-sm text-zinc-600 transition-colors hover:bg-zinc-50"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
      </AnimatePresence>
    </>
  )
}
