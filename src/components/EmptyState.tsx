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
