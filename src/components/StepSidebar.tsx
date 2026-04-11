import { StepDefinition } from '@/lib/workflow-templates'
import { LucideArrowUpRight, LucideCheck } from 'lucide-react'

type StepState = {
  status: 'pending' | 'generating' | 'done'
}

interface StepSidebarProps {
  steps: StepState[]
  stepDefs: StepDefinition[]
  activeStep: number
  onSelect: (n: number) => void
}

export function StepSidebar({
  steps,
  stepDefs,
  activeStep,
  onSelect,
}: StepSidebarProps) {
  return (
    <aside className="w-[220px] shrink-0 overflow-y-auto border-r border-zinc-200 py-4">
      {stepDefs.map(def => {
        const state = steps[def.stepNumber - 1]
        const isActive = def.stepNumber === activeStep
        const isLocked =
          state.status === 'pending' &&
          def.stepNumber > 1 &&
          steps[def.stepNumber - 2].status !== 'done'

        return (
          <button
            key={def.stepNumber}
            onClick={() => !isLocked && onSelect(def.stepNumber)}
            disabled={isLocked}
            className={`flex w-full cursor-pointer items-center gap-3 px-4 py-2.5 text-left text-[13px] transition-colors disabled:cursor-not-allowed ${
              isActive
                ? 'bg-indigo-50 text-indigo-700'
                : isLocked
                  ? 'text-zinc-300'
                  : 'text-zinc-600 hover:bg-zinc-50 hover:text-zinc-950'
            }`}
          >
            {/* Status icon */}
            <span
              className={`flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full border text-[11px] font-medium ${
                state.status === 'done'
                  ? 'border-green-500 bg-green-500 text-white'
                  : state.status === 'generating'
                    ? 'border-amber-400 text-amber-500'
                    : isActive
                      ? 'border-indigo-400 text-indigo-600'
                      : isLocked
                        ? 'border-zinc-200 text-zinc-300'
                        : 'border-zinc-300 text-zinc-500'
              }`}
            >
              {state.status === 'done' ? (
                <LucideCheck size={12} />
              ) : state.status === 'generating' ? (
                <Spinner />
              ) : def.type === 'external_instruction' && !isLocked ? (
                <LucideArrowUpRight size={12} />
              ) : (
                def.stepNumber
              )}
            </span>

            {/* Step label */}
            <span className="truncate leading-tight">
              {def.title}
              {def.tool !== 'Gigity' && def.tool !== 'Manual' && (
                <span
                  className={`mt-0.5 block text-[11px] ${isActive ? 'text-indigo-400' : 'text-zinc-400'}`}
                >
                  {def.tool}
                </span>
              )}
            </span>
          </button>
        )
      })}
    </aside>
  )
}

function Spinner() {
  return (
    <svg
      className="h-3 w-3 animate-spin text-amber-500"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z"
      />
    </svg>
  )
}
