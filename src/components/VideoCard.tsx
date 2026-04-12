'use client'

import { formatRelativeDate } from '@/lib/format-relative-date'
import {
  getStepTitle,
  isWorkflowFullyComplete,
  WORKFLOW_TOTAL_STEPS,
} from '@/lib/workflow-templates'
import { LucideLoader2, LucideX } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
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
    createdAt: Date | string
  }
}

export function VideoCard({ project }: VideoCardProps) {
  const router = useRouter()
  const [deleting, setDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const steps = project.steps
  const doneCount = steps.filter(s => s.status === 'done').length
  const currentStepNumber = doneCount + 1
  const listStatus: 'in_progress' | 'completed' = isWorkflowFullyComplete(steps)
    ? 'completed'
    : 'in_progress'
  const currentStepTitle =
    listStatus === 'in_progress' ? getStepTitle(currentStepNumber) : null
  const id = String(project._id)

  async function handleDelete(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    if (!confirmDelete) {
      setConfirmDelete(true)
      return
    }
    setDeleting(true)
    await fetch(`/api/v1/projects/${id}`, { method: 'DELETE' })
    router.refresh()
  }

  function cancelDelete(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    setConfirmDelete(false)
  }

  return (
    <div className="group relative flex items-center justify-between rounded-[6px] border border-zinc-200 bg-white px-5 py-[14px] transition-all hover:border-zinc-300 hover:shadow-[0_1px_4px_rgba(0,0,0,0.06)]">
      <Link
        href={`/projects/${id}`}
        className="flex min-w-0 flex-1 flex-col gap-1"
      >
        <span className="truncate text-[14px] font-medium text-zinc-950">
          {project.title}
        </span>
        <span className="text-[12px] text-zinc-500">
          Started {formatRelativeDate(project.createdAt)}
          {' · '}
          {listStatus === 'completed' ? (
            `All ${WORKFLOW_TOTAL_STEPS} steps done`
          ) : (
            <>
              {`Step ${currentStepNumber} of ${WORKFLOW_TOTAL_STEPS}`}
              {currentStepTitle && (
                <>
                  {' · '}
                  {currentStepTitle}
                </>
              )}
            </>
          )}
        </span>
      </Link>

      <div className="ml-5 flex shrink-0 items-center gap-4">
        <StepProgressBar steps={steps} />
        <StatusBadge status={listStatus} />

        {/* Delete button / confirm - visible on hover */}
        {confirmDelete ? (
          <span className="flex items-center gap-1">
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="rounded px-2 py-1 text-[12px] font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
            >
              {deleting ? (
                <LucideLoader2
                  className="h-3.5 w-3.5 animate-spin"
                  aria-hidden
                />
              ) : (
                'Delete'
              )}
            </button>
            <button
              onClick={cancelDelete}
              className="rounded px-2 py-1 text-[12px] text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600"
            >
              Cancel
            </button>
          </span>
        ) : (
          <button
            onClick={handleDelete}
            className="hidden rounded px-2 py-1 text-zinc-400 transition-colors group-hover:inline-flex group-hover:items-center hover:bg-red-50 hover:text-red-500"
            title="Delete project"
            aria-label="Delete project"
          >
            <LucideX
              className="h-3.5 w-3.5"
              aria-hidden
            />
          </button>
        )}
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: 'in_progress' | 'completed' }) {
  if (status === 'completed') {
    return (
      <span className="flex items-center gap-1.5 rounded-full bg-green-50 px-[9px] py-[3px] text-[12px] font-medium text-green-600">
        <span className="h-[5px] w-[5px] shrink-0 rounded-full bg-green-500" />
        Completed
      </span>
    )
  }
  return (
    <span className="flex items-center gap-1.5 rounded-full bg-zinc-100 px-[9px] py-[3px] text-[12px] font-medium text-zinc-600">
      <span className="h-[5px] w-[5px] shrink-0 rounded-full bg-amber-400" />
      In progress
    </span>
  )
}
