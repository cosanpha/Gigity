# R02 — Delete & Edit Projects

## What this builds

- Delete a video project from the dashboard (with confirmation)
- Edit a project's title inline on the dashboard card or workflow page

## Files to change

```
src/app/api/v1/projects/route.ts              ← add GET (list projects by brand)
src/app/api/v1/projects/[id]/route.ts         ← create: DELETE + PATCH
src/components/VideoCard.tsx                  ← add delete button + edit title
src/components/WorkflowClient.tsx             ← add edit title at top of workflow view
```

---

## Step 1 — New project routes: DELETE + PATCH

Create `src/app/api/v1/projects/[id]/route.ts`:

```ts
import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import VideoProject from '@/models/VideoProject'

type Ctx = { params: Promise<{ id: string }> }

// PATCH /api/v1/projects/:id — update title
export async function PATCH(req: Request, { params }: Ctx) {
  await connectDB()
  const { id } = await params
  const body = await req.json()

  if (!body.title?.trim()) {
    return NextResponse.json({ error: 'title is required' }, { status: 400 })
  }

  const project = await VideoProject.findByIdAndUpdate(
    id,
    { title: body.title.trim() },
    { new: true, runValidators: true }
  ).lean()

  if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(project)
}

// DELETE /api/v1/projects/:id
export async function DELETE(_req: Request, { params }: Ctx) {
  await connectDB()
  const { id } = await params
  await VideoProject.findByIdAndDelete(id)
  return NextResponse.json({ ok: true })
}
```

---

## Step 2 — VideoCard: delete button + inline title edit

```tsx
// src/components/VideoCard.tsx
'use client'

import Link from 'next/link'
import { useState } from 'react'
import { StepProgressBar } from './StepProgressBar'
import { useRouter } from 'next/navigation'

interface WorkflowStep {
  stepNumber: number
  status: 'pending' | 'generating' | 'done'
}

interface VideoCardProps {
  project: {
    _id: unknown
    title: string
    status: 'in_progress' | 'completed'
    steps: WorkflowStep[]
    createdAt: Date
  }
}

export function VideoCard({ project }: VideoCardProps) {
  const router = useRouter()
  const [deleting, setDeleting] = useState(false)
  const steps = project.steps
  const doneCount = steps.filter(s => s.status === 'done').length
  const id = String(project._id)

  async function handleDelete(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    if (!confirm('Delete this project? This cannot be undone.')) return
    setDeleting(true)
    await fetch(`/api/v1/projects/${id}`, { method: 'DELETE' })
    router.refresh()
  }

  return (
    <div className="group relative flex items-center justify-between rounded-[6px] border border-zinc-200 px-5 py-4 hover:border-zinc-300 hover:bg-zinc-50 transition-colors">
      <Link href={`/projects/${id}`} className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="truncate text-[14px] font-medium text-zinc-950">
          {project.title}
        </span>
        <span className="text-[13px] text-zinc-500">
          Started {formatRelativeDate(project.createdAt)} ·{' '}
          {project.status === 'completed'
            ? 'All 11 steps done'
            : `Step ${doneCount + 1} of 11`}
        </span>
      </Link>

      <div className="flex shrink-0 items-center gap-4 ml-4">
        <StepProgressBar steps={steps} />
        <StatusBadge status={project.status} />

        {/* Delete button — visible on hover */}
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="hidden rounded px-2 py-1 text-[12px] text-zinc-400 transition-colors hover:bg-red-50 hover:text-red-500 group-hover:block disabled:opacity-50"
          title="Delete project"
        >
          {deleting ? '...' : '✕'}
        </button>
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: 'in_progress' | 'completed' }) {
  if (status === 'completed') {
    return (
      <span className="flex items-center gap-1.5 text-[12px] font-medium text-green-600">
        <span className="h-[6px] w-[6px] shrink-0 rounded-full bg-green-500" />
        Completed
      </span>
    )
  }
  return (
    <span className="flex items-center gap-1.5 text-[12px] font-medium text-zinc-500">
      <span className="h-[6px] w-[6px] shrink-0 rounded-full bg-amber-400" />
      In progress
    </span>
  )
}

function formatRelativeDate(date: Date): string {
  const diff = Date.now() - new Date(date).getTime()
  const days = Math.floor(diff / 86_400_000)
  if (days === 0) return 'today'
  if (days === 1) return 'yesterday'
  return `${days} days ago`
}
```

Note: `VideoCard` is now a client component (`'use client'`). The `formatRelativeDate`
duplicate in `page.tsx` can now be removed — it's only in `VideoCard.tsx`.

---

## Step 3 — WorkflowClient: editable title at top

Add an editable title to the workflow page header.

```tsx
// src/components/WorkflowClient.tsx — add title edit
const [title, setTitle] = useState(project.title)
const [editingTitle, setEditingTitle] = useState(false)
const [titleInput, setTitleInput] = useState(project.title)

async function saveTitle() {
  if (!titleInput.trim() || titleInput === title) {
    setEditingTitle(false)
    return
  }
  await fetch(`/api/v1/projects/${project._id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title: titleInput.trim() }),
  })
  setTitle(titleInput.trim())
  setEditingTitle(false)
}
```

In the render, above the sidebar/main split, add:

```tsx
{/* Project title — editable */}
<div className="flex h-[44px] items-center border-b border-zinc-200 px-6 gap-2">
  {editingTitle ? (
    <>
      <input
        value={titleInput}
        onChange={e => setTitleInput(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') saveTitle(); if (e.key === 'Escape') setEditingTitle(false) }}
        autoFocus
        className="flex-1 rounded border border-indigo-500 px-2 py-1 text-sm outline-none"
      />
      <button onClick={saveTitle} className="text-[13px] text-indigo-500 hover:text-indigo-600">Save</button>
      <button onClick={() => setEditingTitle(false)} className="text-[13px] text-zinc-400 hover:text-zinc-600">Cancel</button>
    </>
  ) : (
    <>
      <span className="text-[14px] font-medium text-zinc-950 truncate">{title}</span>
      <button onClick={() => { setTitleInput(title); setEditingTitle(true) }}
        className="text-[12px] text-zinc-400 hover:text-zinc-600">Edit</button>
    </>
  )}
</div>
```

---

## Step 4 — Remove formatRelativeDate from page.tsx

Since VideoCard now owns it, delete lines 59-64 in `src/app/page.tsx`:

```ts
// DELETE this function from page.tsx (it's now in VideoCard.tsx)
function formatRelativeDate(date: Date): string { ... }
```

---

## Verify

1. Dashboard: hover over a project card → delete button (✕) appears
2. Click ✕ → confirm dialog → project removed, list refreshes
3. Open a project → edit title inline → Enter saves → title updates
4. Edit title then Escape → reverts to original

---

**Output:** Projects can be deleted (with confirm) and renamed. Dashboard refreshes on delete.

**Next step:** [R03-workflow-ux.md](R03-workflow-ux.md) — LLM output blocks + copy buttons
