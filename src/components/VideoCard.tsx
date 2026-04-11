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
