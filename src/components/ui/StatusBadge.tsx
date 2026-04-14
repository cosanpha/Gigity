export type ProjectStatus = 'in_progress' | 'completed' | 'canceled'

interface StatusBadgeProps {
  status: ProjectStatus
}

export function StatusBadge({ status }: StatusBadgeProps) {
  if (status === 'completed') {
    return (
      <span className="flex items-center gap-1.5 rounded-full border border-green-100 bg-green-50 px-[9px] py-[3px] text-[11.5px] font-semibold text-green-600">
        <span className="h-[5px] w-[5px] shrink-0 rounded-full bg-green-500" />
        Completed
      </span>
    )
  }
  if (status === 'canceled') {
    return (
      <span className="flex items-center gap-1.5 rounded-full border border-red-100 bg-red-50 px-[9px] py-[3px] text-[11.5px] font-semibold text-red-600">
        <span className="h-[5px] w-[5px] shrink-0 rounded-full bg-red-500" />
        Canceled
      </span>
    )
  }
  // in_progress
  return (
    <span className="flex items-center gap-1.5 rounded-full border border-zinc-200 bg-zinc-100 px-[9px] py-[3px] text-[11.5px] font-semibold text-zinc-600">
      <span className="h-[5px] w-[5px] shrink-0 rounded-full bg-amber-400" />
      In progress
    </span>
  )
}
