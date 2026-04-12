'use client'

import { isWorkflowFullyComplete } from '@/lib/workflow-templates'
import { useState } from 'react'
import { EmptyState } from './EmptyState'
import { VideoCard } from './VideoCard'

type DashboardProject = {
  _id: string
  title: string
  status: 'in_progress' | 'completed'
  steps: Array<{
    stepNumber: number
    status: 'pending' | 'generating' | 'done'
  }>
  createdAt: string
}

type FilterTab = 'all' | 'in_progress' | 'completed'

function listStatusForProject(
  p: DashboardProject
): 'in_progress' | 'completed' {
  return isWorkflowFullyComplete(p.steps) ? 'completed' : 'in_progress'
}

interface DashboardProjectListProps {
  projects: DashboardProject[]
  brandProfileId: string
}

export function DashboardProjectList({
  projects,
  brandProfileId,
}: DashboardProjectListProps) {
  const [filter, setFilter] = useState<FilterTab>('all')
  const [search, setSearch] = useState('')

  const filtered = projects.filter(p => {
    const listStatus = listStatusForProject(p)
    if (filter === 'in_progress' && listStatus !== 'in_progress') return false
    if (filter === 'completed' && listStatus !== 'completed') return false
    if (
      search.trim() &&
      !p.title.toLowerCase().includes(search.trim().toLowerCase())
    )
      return false
    return true
  })

  const inProgress = filtered.filter(
    p => listStatusForProject(p) === 'in_progress'
  )
  const completed = filtered.filter(
    p => listStatusForProject(p) === 'completed'
  )

  return (
    <>
      {/* Filter bar */}
      <div className="mb-4 flex items-center gap-2">
        {(['all', 'in_progress', 'completed'] as FilterTab[]).map(tab => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={`rounded-full border px-3 py-1 text-[13px] transition-all ${
              filter === tab
                ? 'border-zinc-200 bg-zinc-100 font-medium text-zinc-950'
                : 'border-transparent text-zinc-500 hover:bg-zinc-100 hover:text-zinc-950'
            }`}
          >
            {tab === 'all'
              ? 'All'
              : tab === 'in_progress'
                ? 'In progress'
                : 'Completed'}
          </button>
        ))}
        <div className="flex-1" />
        <input
          type="text"
          placeholder="Search videos…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-[200px] rounded-[6px] border border-zinc-200 px-3 py-[5px] text-[13px] text-zinc-950 transition-colors outline-none placeholder:text-zinc-400 focus:border-zinc-300"
        />
      </div>

      {filtered.length === 0 && projects.length === 0 ? (
        <EmptyState brandProfileId={brandProfileId} />
      ) : filtered.length === 0 ? (
        <div className="py-16 text-center text-[13px] text-zinc-400">
          No videos match your filter.
        </div>
      ) : (
        <>
          {inProgress.length > 0 && (
            <div className="mb-6">
              <div className="mb-2 flex items-center gap-3">
                <span className="text-[11px] font-semibold tracking-widest text-zinc-400 uppercase">
                  In progress
                </span>
                <span className="flex-1 border-t border-zinc-200" />
              </div>
              <div className="flex flex-col gap-[6px]">
                {inProgress.map(p => (
                  <VideoCard
                    key={String(p._id)}
                    project={p}
                  />
                ))}
              </div>
            </div>
          )}
          {completed.length > 0 && (
            <div>
              <div className="mb-2 flex items-center gap-3">
                <span className="text-[11px] font-semibold tracking-widest text-zinc-400 uppercase">
                  Completed
                </span>
                <span className="flex-1 border-t border-zinc-200" />
              </div>
              <div className="flex flex-col gap-[6px]">
                {completed.map(p => (
                  <VideoCard
                    key={String(p._id)}
                    project={p}
                  />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </>
  )
}
