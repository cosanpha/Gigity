interface StepPip {
  status: 'pending' | 'generating' | 'done'
}

interface StepProgressBarProps {
  steps: StepPip[]
}

export function StepProgressBar({ steps }: StepProgressBarProps) {
  return (
    <div className="flex items-center gap-[3px]">
      {steps.map((s, i) => (
        <div
          key={i}
          className={`w-[18px] h-[6px] rounded-full ${
            s.status === 'done'
              ? 'bg-green-500'
              : s.status === 'generating'
              ? 'bg-amber-400'
              : 'bg-zinc-200'
          }`}
        />
      ))}
    </div>
  )
}
