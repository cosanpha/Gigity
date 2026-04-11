import { WORKFLOW_TOTAL_STEPS } from '@/lib/workflow-templates'
import { NewVideoModal } from './NewVideoModal'

interface EmptyStateProps {
  brandProfileId: string
}

export function EmptyState({ brandProfileId }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
      <div className="text-4xl">🎬</div>
      <div>
        <p className="text-[15px] font-semibold text-zinc-950">No videos yet</p>
        <p className="mt-1 max-w-sm text-[13px] text-zinc-500">
          Create your first video and Gigity will guide you through all{' '}
          {WORKFLOW_TOTAL_STEPS} steps - from campaign brief to publish.
        </p>
      </div>
      <NewVideoModal brandProfileId={brandProfileId} />
    </div>
  )
}
