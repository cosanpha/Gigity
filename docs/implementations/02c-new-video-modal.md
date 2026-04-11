# 02c — Dashboard: NewVideoModal

## What this builds

The "New video" button + modal. Creates a project via API and redirects
to the workflow view. This is the only client island on the dashboard page.

## Prerequisites

[02b-dashboard-components.md](02b-dashboard-components.md) — EmptyState imports this.
[03e-api-create-project.md](03e-api-create-project.md) — `POST /api/v1/projects` must
exist for the modal to actually create a project. Build the API route before testing end-to-end.

## Files to create

```
src/components/NewVideoModal.tsx
```

---

## `src/components/NewVideoModal.tsx`

```tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

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
    if (creating) return  // don't close while in-flight
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
        className="flex items-center gap-2 px-[18px] py-[9px] bg-indigo-500 text-white
                   text-[14px] font-medium rounded-[6px] hover:bg-indigo-600 transition-colors"
      >
        + New video
      </button>

      {/* Modal overlay */}
      {open && (
        <div
          className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4"
          onClick={e => e.target === e.currentTarget && closeModal()}
        >
          <div className="bg-white rounded-[8px] border border-zinc-200 shadow-lg w-full max-w-md p-6">

            {/* Header */}
            <div className="flex items-center justify-between mb-5">
              <span className="text-[15px] font-semibold text-zinc-950">New video</span>
              <button
                onClick={closeModal}
                className="text-zinc-400 hover:text-zinc-600 text-xl leading-none"
              >
                ×
              </button>
            </div>

            {/* Title field */}
            <div className="flex flex-col gap-1.5 mb-4">
              <label className="text-[13px] font-medium text-zinc-700">Title</label>
              <input
                type="text"
                placeholder="e.g. Deewas — April payday campaign"
                value={title}
                onChange={e => setTitle(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleCreate()}
                autoFocus
                className="h-9 px-3 border border-zinc-200 rounded-[6px] text-sm
                           placeholder:text-zinc-400 focus:outline-none focus:border-indigo-500"
              />
            </div>

            {/* Note */}
            <p className="text-[13px] text-zinc-500 mb-5">
              Gigity will start generating your campaign brief (Step 1) as soon as
              you create the project.
            </p>

            {/* Error */}
            {error && (
              <p className="text-sm text-red-500 mb-4">{error}</p>
            )}

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={handleCreate}
                disabled={!title.trim() || creating}
                className="flex-1 py-2 bg-indigo-500 text-white text-sm font-medium
                           rounded-[6px] hover:bg-indigo-600 disabled:opacity-50
                           disabled:cursor-not-allowed transition-colors"
              >
                {creating ? 'Creating...' : 'Create & start →'}
              </button>
              <button
                onClick={closeModal}
                disabled={creating}
                className="px-4 py-2 text-sm text-zinc-600 border border-zinc-200
                           rounded-[6px] hover:bg-zinc-50 transition-colors"
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
```

---

## Key behaviors

- `Enter` key submits (good UX for a single-field modal)
- Clicking the overlay background closes the modal (unless creating is in progress)
- After successful create: redirects to `/projects/[id]`, which auto-starts step 1
- Error shows inline in the modal — user can retry without reopening

---

## Verify

1. Click "+ New video" → modal opens with title input focused ✓
2. Type title + press Enter → creates project, redirects to `/projects/[id]` ✓
3. Click overlay background → closes modal ✓
4. Click × → closes modal ✓
5. Empty title → button disabled ✓

---

**Output:** Working new video modal. Clicking "Create & start" creates the project and lands on the workflow view.

**Next step:** [03a-video-project-model.md](03a-video-project-model.md) — VideoProject Mongoose model
