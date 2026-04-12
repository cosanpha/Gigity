interface StepPip {
  status: 'pending' | 'generating' | 'done'
}

interface StepProgressBarProps {
  steps: StepPip[]
}

export function StepProgressBar({ steps }: StepProgressBarProps) {
  return (
    <div className="flex items-center gap-[2px]">
      {steps.map((s, i) => (
        <div
          key={i}
          className={`h-[4px] w-[14px] rounded-sm ${
            s.status === 'done'
              ? 'bg-orange-500'
              : s.status === 'generating'
                ? 'bg-orange-300 opacity-70'
                : 'bg-zinc-200'
          }`}
        />
      ))}
    </div>
  )
}
