'use client'

import { isWorkflowFullyComplete } from '@/lib/workflow-templates'
import { motion } from 'framer-motion'
import { useState } from 'react'
import { EmptyState } from './EmptyState'
import { SectionHeader } from './ui/SectionHeader'
import { VideoCard } from './VideoCard'

type DashboardProject = {
  _id: string
  title: string
  status: 'in_progress' | 'completed' | 'canceled'
  steps: Array<{
    stepNumber: number
    status: 'pending' | 'generating' | 'done'
  }>
  createdAt: string
}

type FilterTab = 'all' | 'in_progress' | 'completed' | 'canceled'

function listStatusForProject(
  p: DashboardProject
): 'in_progress' | 'completed' | 'canceled' {
  if (p.status === 'canceled') return 'canceled'
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
    if (filter === 'canceled' && listStatus !== 'canceled') return false
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
  const canceled = filtered.filter(p => listStatusForProject(p) === 'canceled')

  return (
    <>
      {/* Filter bar */}
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="flex min-w-0 items-center overflow-x-auto rounded-full border border-zinc-200 bg-zinc-50 p-[3px]">
          {(['all', 'in_progress', 'completed', 'canceled'] as FilterTab[]).map(
            tab => (
              <button
                key={tab}
                onClick={() => setFilter(tab)}
                className={`shrink-0 rounded-full px-3 py-[3px] text-[12.5px] font-medium transition-all ${
                  filter === tab
                    ? tab === 'all'
                      ? 'bg-zinc-900 text-white shadow-sm'
                      : 'bg-orange-500 text-white shadow-sm'
                    : 'text-zinc-500 hover:text-zinc-800'
                }`}
              >
                {tab === 'all'
                  ? 'All'
                  : tab === 'in_progress'
                    ? 'In progress'
                    : tab === 'completed'
                      ? 'Completed'
                      : 'Canceled'}
              </button>
            )
          )}
        </div>
        <div className="hidden flex-1 sm:block" />
        <input
          type="text"
          placeholder="Search videos…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full rounded-[6px] border border-zinc-200 px-3 py-[5px] text-[13px] text-zinc-950 outline-none transition-colors placeholder:text-zinc-400 focus:border-orange-300 focus:ring-2 focus:ring-orange-100 sm:w-[200px]"
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
              <SectionHeader
                label="In progress"
                count={inProgress.length}
              />
              <div className="flex flex-col gap-[5px]">
                {inProgress.map((p, i) => (
                  <motion.div
                    key={String(p._id)}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      duration: 0.18,
                      delay: i * 0.04,
                      ease: 'easeOut',
                    }}
                  >
                    <VideoCard project={p} />
                  </motion.div>
                ))}
              </div>
            </div>
          )}
          {completed.length > 0 && (
            <div>
              <SectionHeader
                label="Completed"
                count={completed.length}
              />
              <div className="flex flex-col gap-[5px]">
                {completed.map((p, i) => (
                  <motion.div
                    key={String(p._id)}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      duration: 0.18,
                      delay: i * 0.04,
                      ease: 'easeOut',
                    }}
                  >
                    <VideoCard project={p} />
                  </motion.div>
                ))}
              </div>
            </div>
          )}
          {canceled.length > 0 && (
            <div className="mt-6">
              <SectionHeader
                label="Canceled"
                count={canceled.length}
              />
              <div className="flex flex-col gap-[5px]">
                {canceled.map((p, i) => (
                  <motion.div
                    key={String(p._id)}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      duration: 0.18,
                      delay: i * 0.04,
                      ease: 'easeOut',
                    }}
                  >
                    <VideoCard project={p} />
                  </motion.div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </>
  )
}
