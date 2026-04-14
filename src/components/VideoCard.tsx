'use client'

import { apiFetch } from '@/lib/api-fetch'
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
import { StatusBadge } from './ui/StatusBadge'
import { StepProgressBar } from './StepProgressBar'

interface WorkflowStep {
  stepNumber: number
  status: 'pending' | 'generating' | 'done'
}

interface VideoCardProps {
  project: {
    _id: unknown
    title: string
    status: 'in_progress' | 'completed' | 'canceled'
    steps: WorkflowStep[]
    createdAt: Date | string
  }
}

export function VideoCard({ project }: VideoCardProps) {
  const router = useRouter()
  const [deleting, setDeleting] = useState(false)
  const [canceling, setCanceling] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const steps = project.steps
  const doneCount = steps.filter(s => s.status === 'done').length
  const currentStepNumber = doneCount + 1
  const listStatus: 'in_progress' | 'completed' | 'canceled' =
    project.status === 'canceled'
      ? 'canceled'
      : isWorkflowFullyComplete(steps)
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
    await apiFetch(`/api/v1/projects/${id}`, { method: 'DELETE' })
    router.refresh()
  }

  async function handleCancelProject(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    if (listStatus === 'canceled' || canceling) return
    setCanceling(true)
    await apiFetch(`/api/v1/projects/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'canceled' }),
    })
    router.refresh()
  }

  async function handleReopenProject(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    if (listStatus !== 'canceled' || canceling) return
    setCanceling(true)
    await apiFetch(`/api/v1/projects/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'in_progress' }),
    })
    router.refresh()
  }

  function cancelDelete(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    setConfirmDelete(false)
  }

  return (
    <div className="group relative flex items-center justify-between rounded-[10px] border border-zinc-200 bg-white px-4 py-[13px] transition-all hover:border-zinc-300 hover:bg-zinc-50/50 hover:shadow-[0_2px_8px_rgba(0,0,0,0.07)]">
      {listStatus === 'in_progress' && (
        <span className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r-[2px] bg-orange-300/70" />
      )}
      <Link
        href={`/projects/${id}`}
        className="flex min-w-0 flex-1 flex-col gap-1 pl-1"
      >
        <span className="truncate text-[13.5px] font-semibold text-zinc-950">
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

      <div className="ml-4 flex shrink-0 items-center gap-3">
        <StepProgressBar steps={steps} />
        <StatusBadge status={listStatus} />

        {/* Cancel + delete actions - visible on hover */}
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
          <span className="hidden items-center gap-1 group-hover:inline-flex">
            <button
              onClick={
                listStatus === 'canceled'
                  ? handleReopenProject
                  : handleCancelProject
              }
              disabled={canceling}
              className="rounded px-2 py-1 text-[12px] text-violet-600 transition-colors hover:bg-violet-100 hover:text-violet-700 disabled:opacity-50"
              title={
                listStatus === 'canceled' ? 'Re-open project' : 'Cancel project'
              }
              aria-label={
                listStatus === 'canceled' ? 'Re-open project' : 'Cancel project'
              }
            >
              {canceling ? (
                <LucideLoader2
                  className="h-3.5 w-3.5 animate-spin"
                  aria-hidden
                />
              ) : listStatus === 'canceled' ? (
                'Re-open'
              ) : (
                'Cancel'
              )}
            </button>
            <button
              onClick={handleDelete}
              className="rounded px-2 py-1 text-zinc-400 transition-colors hover:bg-red-50 hover:text-red-500"
              title="Delete project"
              aria-label="Delete project"
            >
              <LucideX
                className="h-3.5 w-3.5"
                aria-hidden
              />
            </button>
          </span>
        )}
      </div>
    </div>
  )
}


