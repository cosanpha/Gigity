# 02b — Dashboard: VideoCard, StepProgressBar, StatusBadge, EmptyState

## What this builds

Three display components used by the dashboard: a project row card, an 11-pip
progress bar, a status badge, and an empty state.

## Prerequisites

[02a-dashboard-page.md](02a-dashboard-page.md) — page imports these components.

## Files to create

```
src/components/VideoCard.tsx
src/components/StepProgressBar.tsx
src/components/EmptyState.tsx
```

Reference design: `docs/designs/dashboard.html`

---

## `src/components/StepProgressBar.tsx`

11 pips. Green = done, amber = generating, grey border = pending/locked.

```tsx
interface StepPip {
  status: 'pending' | 'generating' | 'done'
}

interface StepProgressBarProps {
  steps: StepPip[]
}

export function StepProgressBar({ steps }: StepProgressBarProps) {
  return (
    <div className="flex items-center gap-[3px]">
      {steps.map((s, i) => (
        <div
          key={i}
          className={`w-[18px] h-[6px] rounded-full ${
            s.status === 'done'
              ? 'bg-green-500'
              : s.status === 'generating'
              ? 'bg-amber-400'
              : 'bg-zinc-200'
          }`}
        />
      ))}
    </div>
  )
}
```

---

## `src/components/VideoCard.tsx`

Project row. Clicking navigates to the workflow view. Server-renderable (no hooks).

```tsx
import Link from 'next/link'
import { StepProgressBar } from './StepProgressBar'

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
  const steps = project.steps
  const doneCount = steps.filter(s => s.status === 'done').length

  return (
    <Link
      href={`/projects/${String(project._id)}`}
      className="flex items-center justify-between px-5 py-4 border border-zinc-200
                 rounded-[6px] hover:border-zinc-300 hover:bg-zinc-50 transition-colors"
    >
      <div className="flex flex-col gap-0.5 min-w-0">
        <span className="text-[14px] font-medium text-zinc-950 truncate">
          {project.title}
        </span>
        <span className="text-[13px] text-zinc-500">
          Started {formatRelativeDate(project.createdAt)} ·{' '}
          {project.status === 'completed'
            ? 'All 11 steps done'
            : `Step ${doneCount + 1} of 11`}
        </span>
      </div>
      <div className="flex items-center gap-4 shrink-0 ml-4">
        <StepProgressBar steps={steps} />
        <StatusBadge status={project.status} />
      </div>
    </Link>
  )
}

function StatusBadge({ status }: { status: 'in_progress' | 'completed' }) {
  if (status === 'completed') {
    return (
      <span className="flex items-center gap-1.5 text-[12px] font-medium text-green-600">
        <span className="w-[6px] h-[6px] rounded-full bg-green-500 shrink-0" />
        Completed
      </span>
    )
  }
  return (
    <span className="flex items-center gap-1.5 text-[12px] font-medium text-zinc-500">
      <span className="w-[6px] h-[6px] rounded-full bg-amber-400 shrink-0" />
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

---

## `src/components/EmptyState.tsx`

Shown when brand exists but no video projects yet. Imports `NewVideoModal` to
render the "Create first video" button.

```tsx
import { NewVideoModal } from './NewVideoModal'

interface EmptyStateProps {
  brandProfileId: string
}

export function EmptyState({ brandProfileId }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
      <div className="text-4xl">🎬</div>
      <div>
        <p className="text-[15px] font-semibold text-zinc-950">No videos yet</p>
        <p className="text-[13px] text-zinc-500 mt-1 max-w-sm">
          Create your first video and Gigity will guide you through all 11 steps —
          from campaign brief to KlingAI prompts.
        </p>
      </div>
      <NewVideoModal brandProfileId={brandProfileId} />
    </div>
  )
}
```

---

## Verify

With a project in the DB (create one via the New Video modal):

1. Dashboard shows `VideoCard` with title, relative date, step count ✓
2. `StepProgressBar` shows 11 grey pips for a fresh project ✓
3. Status badge shows "In progress" ✓
4. Clicking the card navigates to `/projects/[id]` ✓
5. Empty state shows when no projects exist ✓

---

**Output:** VideoCard, StepProgressBar, StatusBadge, EmptyState components.

**Next step:** [02c-new-video-modal.md](02c-new-video-modal.md) — NewVideoModal client component
