import { WORKFLOW_TOTAL_STEPS } from '@/lib/workflow-templates'
import { LucideClapperboard } from 'lucide-react'
import { NewVideoModal } from './NewVideoModal'

interface EmptyStateProps {
  brandProfileId: string
}

export function EmptyState({ brandProfileId }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center rounded-[8px] border border-dashed border-zinc-300 bg-zinc-50 py-16 text-center">
      <div className="mx-auto mb-4 flex h-[40px] w-[40px] items-center justify-center rounded-[6px] border border-orange-200 bg-orange-50 text-orange-600">
        <LucideClapperboard className="h-5 w-5" aria-hidden />
      </div>
      <h3 className="text-[15px] font-semibold text-zinc-950">No videos yet</h3>
      <p className="mx-auto mt-1.5 mb-5 max-w-[300px] text-[13px] text-zinc-500">
        Create your first video and Gigity will guide you through all{' '}
        {WORKFLOW_TOTAL_STEPS} steps - from campaign brief to publish.
      </p>
      <NewVideoModal brandProfileId={brandProfileId} />
    </div>
  )
}
