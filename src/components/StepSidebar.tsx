import { workflowStepLlmModelLabel } from '@/constants/workflow-llm-models'
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
  const doneCount = steps.filter(s => s.status === 'done').length
  const totalSteps = stepDefs.length
  const progressPct = Math.round((doneCount / totalSteps) * 100)

  return (
    <aside className="flex w-[228px] shrink-0 flex-col overflow-hidden border-r border-zinc-200">
      {/* Sidebar header */}
      <div className="border-b border-zinc-200 px-4 py-3">
        <span className="text-[11px] font-semibold tracking-widest text-zinc-400 uppercase">
          Steps
        </span>
      </div>
      <div className="flex-1 overflow-y-auto py-2">
        {stepDefs.map(def => {
          const state = steps[def.stepNumber - 1]
          const isActive = def.stepNumber === activeStep
          const isLocked =
            state.status === 'pending' &&
            def.stepNumber > 1 &&
            steps[def.stepNumber - 2].status !== 'done'
          const llmModel = workflowStepLlmModelLabel(def.stepNumber)

          return (
            <button
              key={def.stepNumber}
              onClick={() => !isLocked && onSelect(def.stepNumber)}
              disabled={isLocked}
              className={`flex w-full cursor-pointer items-center gap-3 border-l-2 px-[14px] py-[9px] text-left text-[13px] transition-colors disabled:cursor-not-allowed ${
                isActive
                  ? 'border-orange-500 bg-orange-50 text-orange-700'
                  : isLocked
                    ? 'border-transparent text-zinc-300'
                    : 'border-transparent text-zinc-600 hover:bg-zinc-50 hover:text-zinc-950'
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
                        ? 'border-orange-400 text-orange-600'
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
              <span
                className={`min-w-0 flex-1 truncate leading-tight ${isActive ? 'font-semibold' : ''}`}
              >
                {def.title}
                {llmModel && (
                  <span
                    className={`mt-0.5 block truncate font-mono text-[10px] tracking-normal normal-case ${isActive ? 'text-orange-500/90' : 'text-zinc-400'}`}
                    title={llmModel}
                  >
                    {llmModel}
                  </span>
                )}
                {def.tool !== 'Gigity' && def.tool !== 'Manual' && (
                  <span
                    className={`mt-0.5 block text-[11px] ${isActive ? 'text-orange-400' : 'text-zinc-400'}`}
                  >
                    {def.tool}
                  </span>
                )}
              </span>
            </button>
          )
        })}
      </div>

      {/* Progress footer */}
      <div className="border-t border-zinc-200 bg-zinc-50 px-4 py-3">
        <p className="mb-1.5 text-[11px] text-zinc-500">
          {doneCount} of {totalSteps} steps done
        </p>
        <div className="h-1 overflow-hidden rounded-full bg-zinc-200">
          <div
            className="h-full rounded-full bg-orange-500 transition-all duration-300"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>
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
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  )
}
